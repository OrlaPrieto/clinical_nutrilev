import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { Patient, PatientProgress } from '../common/interfaces';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateProgressDto } from './dto/create-progress.dto';
import { AdminGuard } from '../common/guards/admin.guard';

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
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() updateData: UpdatePatientDto,
  ): Promise<Patient> {
    return this.patientService.update(id, updateData);
  }

  @Get(':email/progress')
  async getProgress(@Param('email') email: string): Promise<PatientProgress[]> {
    return this.patientService.getProgress(email);
  }

  @Post('progress')
  @UseGuards(AdminGuard)
  async addProgress(
    @Body() progressData: CreateProgressDto,
  ): Promise<PatientProgress> {
    return this.patientService.addProgress(progressData);
  }

  @Delete(':identifier')
  @UseGuards(AdminGuard)
  async remove(
    @Param('identifier') identifier: string,
  ): Promise<{ success: boolean }> {
    return this.patientService.remove(identifier);
  }
}
