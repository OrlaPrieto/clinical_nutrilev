import { Database } from './database.types';

export type PatientInsert = Database['public']['Tables']['patients']['Insert'];
export type PatientUpdate = Database['public']['Tables']['patients']['Update'];

export type PatientProgressRaw =
  Database['public']['Tables']['patient_progress']['Row'];
export type PatientProgressInsertRaw =
  Database['public']['Tables']['patient_progress']['Insert'];
