import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PushNotificationService } from '../../../services/push-notification.service';
import { ToastService } from '../../../services/toast.service';
import { IconComponent } from '../../atoms/icon/icon';

@Component({
  selector: 'app-push-notification-banner',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './push-notification-banner.html',
  styleUrl: './push-notification-banner.css',
})
export class PushNotificationBannerComponent {
  @Input() userEmail: string = '';

  public pushService = inject(PushNotificationService);
  private toastService = inject(ToastService);

  public showHelpModal = signal<boolean>(false);
  public dismissed = signal<boolean>(false);

  async handleToggle() {
    if (!this.userEmail) {
      this.toastService.show('No se encontró el correo del usuario para la suscripción.', 'error');
      return;
    }

    const currentPerm = this.pushService.permissionStatus();

    if (currentPerm === 'denied') {
      this.showHelpModal.set(true);
      return;
    }

    if (this.pushService.isSubscribed() && currentPerm === 'granted') {
      const success = await this.pushService.unsubscribe();
      if (success) {
        this.toastService.show('Notificaciones push desactivadas correctamente.', 'success');
      } else {
        this.toastService.show('No se pudo desactivar las notificaciones.', 'error');
      }
      return;
    }

    const success = await this.pushService.requestSubscription(this.userEmail);
    if (success) {
      this.toastService.show('¡Notificaciones activadas con éxito!', 'success');
    } else {
      const newPerm = this.pushService.checkPermission();
      if (newPerm === 'denied') {
        this.showHelpModal.set(true);
        this.toastService.show('Las notificaciones están bloqueadas en tu navegador.', 'error');
      }
    }
  }

  openHelpModal() {
    this.showHelpModal.set(true);
  }

  closeHelpModal() {
    this.showHelpModal.set(false);
  }

  recheckPermission() {
    const status = this.pushService.checkPermission();
    if (status === 'granted') {
      this.toastService.show('¡Permisos detectados! Notificaciones listas.', 'success');
      this.closeHelpModal();
      if (this.userEmail && !this.pushService.isSubscribed()) {
        this.pushService.requestSubscription(this.userEmail);
      }
    } else if (status === 'denied') {
      this.toastService.show('El permiso aún aparece como bloqueado en tu navegador.', 'error');
    } else {
      this.toastService.show('El estado de notificaciones fue actualizado.', 'info');
    }
  }

  dismissBanner() {
    this.dismissed.set(true);
  }
}
