-- Database Schema definition for clinical_nutrilev Supabase tables.
-- AI assistants must cross-reference this schema before writing Postgres/Supabase database queries.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PATIENTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    edad INTEGER,
    genero VARCHAR(50),
    fecha_hoy DATE,
    fecha_nacimiento DATE,
    estado_civil VARCHAR(50),
    direccion TEXT,
    estatura VARCHAR(50),
    motivos_consulta TEXT,
    recomendacion_fuente TEXT,
    antecedentes_patologicos TEXT,
    toma_medicamentos TEXT,
    enfermedades TEXT,
    medicamentos TEXT,
    cirugias TEXT,
    antecedentes_familiares TEXT,
    alcohol VARCHAR(50),
    tabaco VARCHAR(50),
    sueno VARCHAR(100),
    hace_ejercicio VARCHAR(50),
    ejercicio_detalles TEXT,
    alergias_alimentarias TEXT,
    profesion VARCHAR(100),
    tipo_actividad_horario TEXT,
    laboratorios TEXT,
    comidas_dia TEXT,
    comidas_dia_otro TEXT,
    comida_comprada TEXT,
    comida_comprada_otro TEXT,
    quien_cocina VARCHAR(100),
    quien_cocina_otro TEXT,
    alimentos_preferidos TEXT,
    alimentos_no_agradan TEXT,
    suplementos_si_no VARCHAR(50),
    suplementos_cuales TEXT,
    dieta_especial TEXT,
    salud_femenina_ciclo TEXT,
    peso_habitual NUMERIC,
    peso_meta NUMERIC,
    grasa_meta NUMERIC,
    musculo_meta NUMERIC,
    meta_objetivo VARCHAR(50), -- 'bajar_peso' | 'bajar_grasa' | 'subir_musculo'
    notas TEXT,
    menu_url TEXT,
    menu_notes TEXT,
    menu_created_at TIMESTAMPTZ,
    current_menus JSONB, -- Array of objects {name, url, uploaded_at}
    dado_de_baja BOOLEAN NOT NULL DEFAULT FALSE,
    acceso_portal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ultima_actualizacion TIMESTAMPTZ,
    foto_url TEXT,
    plan_citas INTEGER DEFAULT 0,
    plan_citas_completadas INTEGER DEFAULT 0,
    plan_duration_days INTEGER DEFAULT 7
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PATIENT_PROGRESS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE patient_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    weight NUMERIC NOT NULL,
    body_fat NUMERIC,
    muscle_mass NUMERIC,
    agua_corporal NUMERIC,
    proteinas NUMERIC,
    minerales NUMERIC,
    masa_grasa NUMERIC,
    masa_magra NUMERIC,
    imc NUMERIC,
    brazo_der_grasa NUMERIC,
    brazo_der_musculo NUMERIC,
    brazo_der_cm NUMERIC,
    brazo_izq_grasa NUMERIC,
    brazo_izq_musculo NUMERIC,
    brazo_izq_cm NUMERIC,
    tronco_grasa NUMERIC,
    tronco_musculo NUMERIC,
    pierna_der_grasa NUMERIC,
    pierna_der_musculo NUMERIC,
    pierna_der_cm NUMERIC,
    pierna_izq_grasa NUMERIC,
    pierna_izq_musculo NUMERIC,
    pierna_izq_cm NUMERIC,
    icc NUMERIC,
    gv NUMERIC,
    abdomen NUMERIC,
    cintura NUMERIC,
    cadera NUMERIC,
    edad_metabolica NUMERIC,
    presion_arterial VARCHAR(50),
    pulso INTEGER,
    pliegue_cutaneo NUMERIC,
    notes TEXT,
    date DATE DEFAULT CURRENT_DATE,
    numero_cita INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. AI_MENU_CACHE TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE ai_menu_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_url TEXT NOT NULL UNIQUE,
    data JSONB NOT NULL, -- The parsed menu JSON representation
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PUSH_SUBSCRIPTIONS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    subscription JSONB NOT NULL, -- Web Push subscription object
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
