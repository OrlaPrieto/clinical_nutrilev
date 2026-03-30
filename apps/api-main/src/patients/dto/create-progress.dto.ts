import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProgressDto {
  @IsEmail()
  @IsNotEmpty()
  patient_email: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  weight: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  body_fat?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  muscle_mass?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  date?: string;
}
