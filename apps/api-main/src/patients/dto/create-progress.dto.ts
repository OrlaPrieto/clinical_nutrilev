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

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  agua_corporal?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  proteinas?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minerales?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  masa_grasa?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  musculo_esqueletico?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  masa_magra?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  imc?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  pgc?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  brazo_der_grasa?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  brazo_der_musculo?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  brazo_der_cm?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  brazo_izq_grasa?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  brazo_izq_musculo?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  brazo_izq_cm?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  tronco_grasa?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  tronco_musculo?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  pierna_der_grasa?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  pierna_der_musculo?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  pierna_der_cm?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  pierna_izq_grasa?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  pierna_izq_musculo?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  pierna_izq_cm?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  icc?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  gv?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  abdomen?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  cintura?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  cadera?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  edad_metabolica?: number;

  @IsString()
  @IsOptional()
  presion_arterial?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  pulso?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  pliegue_cutaneo?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  date?: string;
}
