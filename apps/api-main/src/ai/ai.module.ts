import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AuthModule } from '../auth/auth.module';
import { PatientModule } from '../patients/patient.module';

@Module({
  imports: [AuthModule, HttpModule, ConfigModule, PatientModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
