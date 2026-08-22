-- Migration: Create patient_glucose_logs table in Supabase
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.patient_glucose_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_email TEXT NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    glucose_value INTEGER NOT NULL,
    context TEXT NOT NULL DEFAULT 'ayuno',
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by patient_email and date
CREATE INDEX IF NOT EXISTS idx_patient_glucose_email_date 
ON public.patient_glucose_logs (patient_email, recorded_at DESC);

-- Enable RLS (Row Level Security) and grant policy
ALTER TABLE public.patient_glucose_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read/write for all users" ON public.patient_glucose_logs;
CREATE POLICY "Enable read/write for all users" ON public.patient_glucose_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);
