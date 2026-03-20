import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseService } from './common/supabase.service';
import { PatientController } from './patients/patient.controller';
import { PatientService } from './patients/patient.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AiController } from './ai/ai.controller';
import { AiService } from './ai/ai.service';
import { EmailService } from './common/email.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
  ],
  controllers: [AppController, PatientController, AuthController, AiController],
  providers: [
    AppService,
    SupabaseService,
    PatientService,
    AuthService,
    AiService,
    EmailService,
  ],
})
export class AppModule {}
