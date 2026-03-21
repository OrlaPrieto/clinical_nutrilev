import { Module } from '@nestjs/common';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';

import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PatientController],
  providers: [PatientService],
})
export class PatientModule {}
