import { IsEmail, IsNotEmpty, IsString, IsObject } from 'class-validator';

export class ProcessMenuDto {
  @IsEmail()
  @IsNotEmpty()
  patient_email: string;

  @IsObject()
  @IsNotEmpty()
  menu_data: any;
}

export class NotifyMenuDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  menu_url: string;
}
