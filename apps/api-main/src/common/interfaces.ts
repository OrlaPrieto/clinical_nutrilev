import { Database, Json } from './database.types';

export type Patient = Database['public']['Tables']['patients']['Row'];
export type PatientInsert = Database['public']['Tables']['patients']['Insert'];
export type PatientUpdate = Database['public']['Tables']['patients']['Update'];

export type PatientProgress =
  Database['public']['Tables']['patient_progress']['Row'];
export type PatientProgressInsert = Omit<
  Database['public']['Tables']['patient_progress']['Insert'],
  'weight' | 'body_fat' | 'muscle_mass'
> & {
  weight: string | number;
  body_fat?: string | number | null;
  muscle_mass?: string | number | null;
};

export interface AiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

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
