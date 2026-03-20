import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import type {
  Patient,
  PatientProgress,
  PatientUpdate,
  PatientProgressInsert,
} from '../common/interfaces';

@Controller('api/patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get()
  async findAll(): Promise<Patient[]> {
    return this.patientService.findAll();
  }

  @Get(':email')
  async findOne(@Param('email') email: string): Promise<Patient> {
    return this.patientService.findByEmail(email);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    updateData: PatientUpdate & { action?: string; originalEmail?: string },
  ): Promise<Patient> {
    return this.patientService.update(id, updateData);
  }

  @Get(':email/progress')
  async getProgress(@Param('email') email: string): Promise<PatientProgress[]> {
    return this.patientService.getProgress(email);
  }

  @Post('progress')
  async addProgress(
    @Body() progressData: PatientProgressInsert,
  ): Promise<PatientProgress> {
    return this.patientService.addProgress(progressData);
  }

  @Delete(':identifier')
  async remove(
    @Param('identifier') identifier: string,
  ): Promise<{ success: boolean }> {
    return this.patientService.remove(identifier);
  }
}
