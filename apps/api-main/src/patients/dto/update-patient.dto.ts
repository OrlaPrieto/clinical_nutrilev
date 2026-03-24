import {
  IsEmail,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePatientDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  foto_url?: string;

  @IsBoolean()
  @IsOptional()
  acceso_portal?: boolean;

  @IsBoolean()
  @IsOptional()
  dado_de_baja?: boolean;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  edad?: number;

  @IsString()
  @IsOptional()
  genero?: string;

  @IsString()
  @IsOptional()
  fecha_hoy?: string;

  @IsString()
  @IsOptional()
  fecha_nacimiento?: string;

  @IsString()
  @IsOptional()
  estado_civil?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  estatura?: string;

  @IsString()
  @IsOptional()
  motivos_consulta?: string;

  @IsString()
  @IsOptional()
  recomendacion_fuente?: string;

  @IsString()
  @IsOptional()
  antecedentes_patologicos?: string;

  @IsString()
  @IsOptional()
  toma_medicamentos?: string;

  @IsString()
  @IsOptional()
  enfermedades?: string;

  @IsString()
  @IsOptional()
  medicamentos?: string;

  @IsString()
  @IsOptional()
  cirugias?: string;

  @IsString()
  @IsOptional()
  antecedentes_familiares?: string;

  @IsString()
  @IsOptional()
  alcohol?: string;

  @IsString()
  @IsOptional()
  tabaco?: string;

  @IsString()
  @IsOptional()
  sueno?: string;

  @IsString()
  @IsOptional()
  hace_ejercicio?: string;

  @IsString()
  @IsOptional()
  ejercicio_detalles?: string;

  @IsString()
  @IsOptional()
  alergias_alimentarias?: string;

  @IsString()
  @IsOptional()
  profesion?: string;

  @IsString()
  @IsOptional()
  tipo_actividad_horario?: string;

  @IsString()
  @IsOptional()
  laboratorios?: string;

  @IsString()
  @IsOptional()
  comidas_dia?: string;

  @IsString()
  @IsOptional()
  comidas_dia_otro?: string;

  @IsString()
  @IsOptional()
  comida_comprada?: string;

  @IsString()
  @IsOptional()
  comida_comprada_otro?: string;

  @IsString()
  @IsOptional()
  quien_cocina?: string;

  @IsString()
  @IsOptional()
  quien_cocina_otro?: string;

  @IsString()
  @IsOptional()
  alimentos_preferidos?: string;

  @IsString()
  @IsOptional()
  alimentos_no_agradan?: string;

  @IsString()
  @IsOptional()
  suplementos_si_no?: string;

  @IsString()
  @IsOptional()
  suplementos_cuales?: string;

  @IsString()
  @IsOptional()
  dieta_especial?: string;

  @IsString()
  @IsOptional()
  salud_femenina_ciclo?: string;

  @IsOptional()
  peso_habitual?: string | number;

  @IsOptional()
  peso_meta?: string | number;

  @IsOptional()
  grasa_meta?: string | number;

  @IsOptional()
  musculo_meta?: string | number;

  @IsString()
  @IsOptional()
  meta_objetivo?: string;

  @IsString()
  @IsOptional()
  cambios_peso_detalle?: string;

  @IsString()
  @IsOptional()
  notas?: string;

  @IsString()
  @IsOptional()
  notas_clinicas?: string;

  @IsString()
  @IsOptional()
  preferencias_alimentarias?: string;

  // Seguimiento 24h
  @IsString()
  @IsOptional()
  diario_desayuno?: string;

  @IsString()
  @IsOptional()
  diario_colacion_mat?: string;

  @IsString()
  @IsOptional()
  diario_comida?: string;

  @IsString()
  @IsOptional()
  diario_colacion_vesp?: string;

  @IsString()
  @IsOptional()
  diario_cena?: string;

  @IsString()
  @IsOptional()
  diario_extras?: string;

  // Fields from frontend/Supabase persistence
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  created_at?: string;

  @IsString()
  @IsOptional()
  ultima_actualizacion?: string;

  @IsString()
  @IsOptional()
  menu_url?: string;

  @IsString()
  @IsOptional()
  menu_created_at?: string;

  // Control fields
  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsOptional()
  originalEmail?: string;
}
