import {
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProgressDto {
  @IsEmail()
  @IsNotEmpty()
  patient_email: string;

  @IsNumberString()
  @IsNotEmpty()
  weight: string;

  @IsNumberString()
  @IsOptional()
  body_fat?: string;

  @IsNumberString()
  @IsOptional()
  muscle_mass?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  date?: string;
}
