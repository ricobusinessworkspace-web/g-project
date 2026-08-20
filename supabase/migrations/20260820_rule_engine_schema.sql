-- Drop tables if they exist to allow clean reruns
DROP TABLE IF EXISTS g_daily_results CASCADE;
DROP TABLE IF EXISTS g_weekly_settlements CASCADE;
DROP TABLE IF EXISTS g_penalty_tiers CASCADE;
DROP TABLE IF EXISTS g_action_logs CASCADE;
DROP TABLE IF EXISTS g_global_days CASCADE;
DROP TABLE IF EXISTS g_rules CASCADE;

-- Drop types if they exist
DROP TYPE IF EXISTS rule_category CASCADE;
DROP TYPE IF EXISTS cap_type CASCADE;
DROP TYPE IF EXISTS settlement_status CASCADE;

-- Enums
CREATE TYPE rule_category AS ENUM ('REOCCURRING', 'ONCE_DAILY', 'MANDATORY', 'EXERCISE', 'RECREATIONAL', 'SALES', 'MONEY', 'DEBT_REDUCTION');
CREATE TYPE cap_type AS ENUM ('NONE', 'DAILY', 'WEEKLY');
CREATE TYPE settlement_status AS ENUM ('OPEN', 'PAID');

-- Rules Table
CREATE TABLE g_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category rule_category NOT NULL,
    system_id TEXT UNIQUE, 
    points INTEGER NOT NULL DEFAULT 0,
    money_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cap_type cap_type NOT NULL DEFAULT 'NONE',
    cap_value INTEGER,
    is_exercise BOOLEAN NOT NULL DEFAULT false,
    unit_size TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    config JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Global Days (for status flags)
CREATE TABLE g_global_days (
    date DATE PRIMARY KEY,
    is_sick BOOLEAN NOT NULL DEFAULT false,
    sick_triggered_by UUID REFERENCES auth.users(id),
    sick_approved_by UUID REFERENCES auth.users(id),
    is_abroad BOOLEAN NOT NULL DEFAULT false,
    abroad_triggered_by UUID REFERENCES auth.users(id),
    is_long_trip BOOLEAN NOT NULL DEFAULT false,
    long_trip_triggered_by UUID REFERENCES auth.users(id),
    is_goof_free BOOLEAN NOT NULL DEFAULT false,
    goof_free_triggered_by UUID REFERENCES auth.users(id)
);

-- Action Logs
CREATE TABLE g_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    rule_id UUID REFERENCES g_rules(id),
    date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    amount INTEGER NOT NULL DEFAULT 1,
    points_calculated INTEGER NOT NULL,
    money_calculated NUMERIC(10, 2) NOT NULL,
    is_correction BOOLEAN NOT NULL DEFAULT false
);

-- Penalty Tiers
CREATE TABLE g_penalty_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_diff INTEGER NOT NULL,
    max_diff INTEGER NOT NULL,
    penalty_amount NUMERIC(10, 2) NOT NULL
);

-- Weekly Settlements
CREATE TABLE g_weekly_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    week_start_date DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status settlement_status NOT NULL DEFAULT 'OPEN',
    late_fees NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, week_start_date)
);

-- Daily Results
CREATE TABLE g_daily_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    date DATE NOT NULL,
    raw_score INTEGER NOT NULL,
    final_score INTEGER NOT NULL,
    penalty_incurred NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, date)
);
