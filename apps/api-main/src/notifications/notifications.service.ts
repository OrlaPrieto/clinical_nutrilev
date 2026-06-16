import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase.service';
import * as webpush from 'web-push';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {
    const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const emailFrom = this.configService.get<string>('EMAIL_FROM') || 'citas@nutrilevespecializada.com';

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(
        `mailto:${emailFrom}`,
        vapidPublicKey,
        vapidPrivateKey
      );
      this.logger.log('VAPID keys loaded successfully for Web Push notifications.');
    } else {
      this.logger.warn('VAPID keys are missing from environment. Push notifications are disabled.');
    }
  }

  async saveSubscription(email: string, subscription: any): Promise<boolean> {
    const cleanEmail = email.toLowerCase();
    const supabase = this.supabaseService.getClient() as any;
    
    // Check if subscription already exists for this email and endpoint
    const { data: existing, error: getError } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('email', cleanEmail)
      .eq('endpoint', subscription.endpoint);

    if (getError) {
      this.logger.error('Error fetching existing subscription:', getError);
      throw getError;
    }

    if (existing && existing.length > 0) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update({
          subscription_json: subscription,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing[0].id);

      if (updateError) {
        this.logger.error('Error updating existing subscription:', updateError);
        throw updateError;
      }
      return true;
    }

    // Insert new subscription
    const { error: insertError } = await supabase
      .from('push_subscriptions')
      .insert({
        email: cleanEmail,
        endpoint: subscription.endpoint,
        subscription_json: subscription,
      });

    if (insertError) {
      this.logger.error('Error inserting subscription:', insertError);
      throw insertError;
    }

    return true;
  }

  async sendMenuPushNotification(email: string, patientName: string): Promise<void> {
    const cleanEmail = email.toLowerCase();
    const supabase = this.supabaseService.getClient() as any;
    
    // Fetch all active subscriptions for this patient
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('email', cleanEmail);

    if (error) {
      this.logger.error(`Error loading subscriptions for ${cleanEmail}:`, error);
      return;
    }

    if (!subs || subs.length === 0) {
      this.logger.log(`No active push subscriptions found for ${cleanEmail}`);
      return;
    }

    const payload = JSON.stringify({
      notification: {
        title: '🍏 ¡Tu menú está listo!',
        body: `Hola, ${patientName}. Tu nuevo menú clínico ha sido subido. ¡Échale un vistazo!`,
        icon: '/images/nutrition-icon.png',
        badge: '/images/nutrition-icon.png',
        data: {
          url: '/portal',
          onActionClick: {
            default: {
              operation: 'focusLastFocusedOrOpen',
              url: '/portal'
            }
          }
        }
      }
    });

    const sendPromises = subs.map(async (subRecord: any) => {
      const sub = subRecord.subscription_json;
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err: any) {
        // If the push service returns 410 (Gone) or 404, the subscription is dead
        if (err.statusCode === 410 || err.statusCode === 404) {
          this.logger.warn(`Subscription expired or gone (endpoint: ${subRecord.endpoint}). Deleting...`);
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', subRecord.id);
        } else {
          this.logger.error(`Error sending notification to endpoint ${subRecord.endpoint}:`, err);
        }
      }
    });

    await Promise.all(sendPromises);
  }

  async sendAppointmentReminderPushNotification(
    email: string,
    patientName: string,
    timeStr: string,
    eventId: string,
    targetDayStr: string = 'mañana',
  ): Promise<void> {
    const cleanEmail = email.toLowerCase().trim();
    const supabase = this.supabaseService.getClient() as any;

    // Fetch all active subscriptions for this patient
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('email', cleanEmail);

    if (error) {
      this.logger.error(`Error loading subscriptions for ${cleanEmail}:`, error);
      return;
    }

    if (!subs || subs.length === 0) {
      this.logger.log(`No active push subscriptions found for ${cleanEmail}`);
      return;
    }

    const payload = JSON.stringify({
      notification: {
        title: '⏰ Confirmación de Cita',
        body: `Hola, ${patientName}. Recuerda que tienes una cita programada para ${targetDayStr} a las ${timeStr}.`,
        icon: '/images/nutrition-icon.png',
        badge: '/images/nutrition-icon.png',
        actions: [
          { action: 'confirm', title: 'Confirmar Cita' },
          { action: 'cancel', title: 'Cancelar' }
        ],
        data: {
          url: '/portal',
          onActionClick: {
            default: {
              operation: 'focusLastFocusedOrOpen',
              url: '/portal'
            },
            confirm: {
              operation: 'focusLastFocusedOrOpen',
              url: `/portal?action=confirm&id=${eventId}`
            },
            cancel: {
              operation: 'focusLastFocusedOrOpen',
              url: `/portal?action=cancel&id=${eventId}`
            }
          }
        },
      },
    });

    const sendPromises = subs.map(async (subRecord: any) => {
      const sub = subRecord.subscription_json;
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          this.logger.warn(`Subscription expired or gone (endpoint: ${subRecord.endpoint}). Deleting...`);
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', subRecord.id);
        } else {
          this.logger.error(`Error sending notification to endpoint ${subRecord.endpoint}:`, err);
        }
      }
    });

    await Promise.all(sendPromises);
  }

  async sendAppointmentShortReminderPushNotification(
    email: string,
    patientName: string,
    timeStr: string,
    minutesRemaining: number,
  ): Promise<void> {
    const cleanEmail = email.toLowerCase().trim();
    const supabase = this.supabaseService.getClient() as any;

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('email', cleanEmail);

    if (error) {
      this.logger.error(`Error loading subscriptions for ${cleanEmail}:`, error);
      return;
    }

    if (!subs || subs.length === 0) {
      this.logger.log(`No active push subscriptions found for ${cleanEmail}`);
      return;
    }

    const payload = JSON.stringify({
      notification: {
        title: '🔔 Tu cita está por comenzar',
        body: `¡Hola, ${patientName}! Recuerda que tu consulta inicia en ${minutesRemaining} minutos (a las ${timeStr}). ¡Te esperamos!`,
        icon: '/images/nutrition-icon.png',
        badge: '/images/nutrition-icon.png',
        data: {
          url: '/portal',
          onActionClick: {
            default: {
              operation: 'focusLastFocusedOrOpen',
              url: '/portal'
            }
          }
        },
      },
    });

    const sendPromises = subs.map(async (subRecord: any) => {
      const sub = subRecord.subscription_json;
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          this.logger.warn(`Subscription expired or gone (endpoint: ${subRecord.endpoint}). Deleting...`);
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', subRecord.id);
        } else {
          this.logger.error(`Error sending notification to endpoint ${subRecord.endpoint}:`, err);
        }
      }
    });

    await Promise.all(sendPromises);
  }
}


