export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          nombre: string;
          email: string;
          telefono: string | null;
          edad: number | null;
          genero: string | null;
          fecha_hoy: string | null;
          fecha_nacimiento: string | null;
          estado_civil: string | null;
          direccion: string | null;
          estatura: string | null;
          motivos_consulta: string | null;
          recomendacion_fuente: string | null;
          antecedentes_patologicos: string | null;
          toma_medicamentos: string | null;
          enfermedades: string | null;
          medicamentos: string | null;
          cirugias: string | null;
          antecedentes_familiares: string | null;
          alcohol: string | null;
          tabaco: string | null;
          sueno: string | null;
          hace_ejercicio: string | null;
          ejercicio_detalles: string | null;
          alergias_alimentarias: string | null;
          profesion: string | null;
          tipo_actividad_horario: string | null;
          laboratorios: string | null;
          comidas_dia: string | null;
          comidas_dia_otro: string | null;
          comida_comprada: string | null;
          comida_comprada_otro: string | null;
          quien_cocina: string | null;
          quien_cocina_otro: string | null;
          alimentos_preferidos: string | null;
          alimentos_no_agradan: string | null;
          suplementos_si_no: string | null;
          suplementos_cuales: string | null;
          dieta_especial: string | null;
          salud_femenina_ciclo: string | null;
          peso_habitual: string | null;
          peso_meta: string | null;
          cambios_peso_detalle: string | null;
          notas: string | null;
          menu_url: string | null;
          menu_created_at: string | null;
          dado_de_baja: boolean;
          acceso_portal: boolean;
          created_at: string;
          ultima_actualizacion: string | null;
        };
        Insert: {
          id?: string;
          nombre: string;
          email: string;
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
          peso_habitual?: string | null;
          peso_meta?: string | null;
          cambios_peso_detalle?: string | null;
          notas?: string | null;
          menu_url?: string | null;
          menu_created_at?: string | null;
          dado_de_baja?: boolean;
          acceso_portal?: boolean;
          created_at?: string;
          ultima_actualizacion?: string | null;
        };
        Update: {
          id?: string;
          nombre?: string;
          email?: string;
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
          peso_habitual?: string | null;
          peso_meta?: string | null;
          cambios_peso_detalle?: string | null;
          notas?: string | null;
          menu_url?: string | null;
          menu_created_at?: string | null;
          dado_de_baja?: boolean;
          acceso_portal?: boolean;
          created_at?: string;
          ultima_actualizacion?: string | null;
        };
      };
      patient_progress: {
        Row: {
          id: string;
          patient_email: string;
          weight: string;
          body_fat: string | null;
          muscle_mass: string | null;
          notes: string | null;
          date: string;
        };
        Insert: {
          id?: string;
          patient_email: string;
          weight: string;
          body_fat?: string | null;
          muscle_mass?: string | null;
          notes?: string | null;
          date?: string;
        };
        Update: {
          id?: string;
          patient_email?: string;
          weight?: string;
          body_fat?: string | null;
          muscle_mass?: string | null;
          notes?: string | null;
          date?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};
