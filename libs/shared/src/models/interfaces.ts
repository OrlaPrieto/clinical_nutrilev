export interface Patient {
  id: string;
  email: string;
  nombre: string;
  telefono?: string | null;
  edad?: number | null;
  genero?: string | null;
  fecha_hoy?: string | null;
  fecha_nacimiento?: string | null;
  estado_civil?: string | null;
  direccion?: string | null;
  estatura?: string | null;
  motivos_consulta?: string | null;
  recomendacion_fuente?: string | null;
  antecedentes_patologicos?: string | null;
  toma_medicamentos?: string | null;
  enfermedades?: string | null;
  medicamentos?: string | null;
  cirugias?: string | null;
  antecedentes_familiares?: string | null;
  alcohol?: string | null;
  tabaco?: string | null;
  sueno?: string | null;
  hace_ejercicio?: string | null;
  ejercicio_detalles?: string | null;
  alergias_alimentarias?: string | null;
  profesion?: string | null;
  tipo_actividad_horario?: string | null;
  laboratorios?: string | null;
  comidas_dia?: string | null;
  comidas_dia_otro?: string | null;
  comida_comprada?: string | null;
  comida_comprada_otro?: string | null;
  quien_cocina?: string | null;
  quien_cocina_otro?: string | null;
  alimentos_preferidos?: string | null;
  alimentos_no_agradan?: string | null;
  suplementos_si_no?: string | null;
  suplementos_cuales?: string | null;
  dieta_especial?: string | null;
  salud_femenina_ciclo?: string | null;
  peso_habitual?: string | number | null;
  peso_meta?: string | number | null;
  grasa_meta?: string | number | null;
  musculo_meta?: string | number | null;
  meta_objetivo?: 'bajar_peso' | 'bajar_grasa' | 'subir_musculo' | null;
  cambios_peso_detalle?: string | null;
  notas?: string | null;
  menu_url?: string | null;
  menu_created_at?: string | null;
  dado_de_baja: boolean;
  acceso_portal: boolean;
  created_at: string;
  ultima_actualizacion?: string | null;
  foto_url?: string | null;
}

export interface AiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface ProcessMenuRequest {
  patient_email: string;
  menu_data: Json;
}

export interface NotifyMenuRequest {
  email: string;
  nombre: string;
  menu_url: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email?: string;
  } | null;
  session: {
    access_token: string;
    refresh_token: string;
  } | null;
}

export interface PatientUpdate extends Partial<Patient> {
  id?: string;
}

export interface PatientProgress {
  id: string;
  patient_email: string;
  weight: number | string;
  body_fat?: number | string | null;
  muscle_mass?: number | string | null;
  notes?: string | null;
  date?: string;
}

export interface PatientProgressInsert extends Omit<PatientProgress, 'id'> {
  id?: string;
}

export interface ShoppingItem {
  icon: string;
  name: string;
  amount?: string;
  tip?: string;
  brand?: string;
  checked?: boolean;
}

export interface ShoppingCategory {
  category: string;
  items: ShoppingItem[];
}
