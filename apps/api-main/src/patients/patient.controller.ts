import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { Patient, PatientProgress } from '@shared/index';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateProgressDto } from './dto/create-progress.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { AdminGuard } from '../common/guards/admin.guard';

import { PatientAuthGuard } from '../common/guards/patient-auth.guard';

@Controller('api/patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get()
  @UseGuards(AdminGuard)
  async findAll(): Promise<Patient[]> {
    return this.patientService.findAll();
  }

  @Get(':email')
  @UseGuards(PatientAuthGuard)
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
  @UseGuards(PatientAuthGuard)
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

  @Put('progress/:id')
  @UseGuards(AdminGuard)
  async updateProgress(
    @Param('id') id: string,
    @Body() progressData: UpdateProgressDto,
  ): Promise<PatientProgress> {
    return this.patientService.updateProgress(id, progressData);
  }

  @Delete('progress/:id')
  @UseGuards(AdminGuard)
  async removeProgress(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.patientService.removeProgress(id);
  }

  @Delete(':identifier')
  @UseGuards(AdminGuard)
  async remove(
    @Param('identifier') identifier: string,
  ): Promise<{ success: boolean }> {
    return this.patientService.remove(identifier);
  }

  @Post('shopping-list')
  @UseGuards(PatientAuthGuard)
  async getShoppingList(
    @Body('menu_url') menuUrl: string,
    @Req() req: any,
  ): Promise<any> {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    return this.patientService.getShoppingList(menuUrl, clientIp);
  }
}
