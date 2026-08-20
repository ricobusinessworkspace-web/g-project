export type RuleCategory = 'REOCCURRING' | 'ONCE_DAILY' | 'MANDATORY' | 'EXERCISE' | 'RECREATIONAL' | 'SALES' | 'MONEY' | 'DEBT_REDUCTION';
export type CapType = 'NONE' | 'DAILY' | 'WEEKLY';
export type SettlementStatus = 'OPEN' | 'PAID';

export interface Rule {
  id: string;
  name: string;
  category: RuleCategory;
  system_id: string | null;
  points: number;
  money_value: number;
  cap_type: CapType;
  cap_value: number | null;
  is_exercise: boolean;
  unit_size: string | null;
  is_active: boolean;
  config: Record<string, any> | null;
  created_at: string;
}

export interface GlobalDay {
  date: string; // YYYY-MM-DD
  is_sick: boolean;
  sick_triggered_by: string | null;
  sick_approved_by: string | null;
  is_abroad: boolean;
  abroad_triggered_by: string | null;
  is_long_trip: boolean;
  long_trip_triggered_by: string | null;
  is_goof_free: boolean;
  goof_free_triggered_by: string | null;
}

export interface ActionLog {
  id: string;
  user_id: string;
  rule_id: string | null;
  date: string; // YYYY-MM-DD
  created_at: string;
  amount: number;
  points_calculated: number;
  money_calculated: number;
  is_correction: boolean;
}

export interface PenaltyTier {
  id: string;
  min_diff: number;
  max_diff: number;
  penalty_amount: number;
}

export interface WeeklySettlement {
  id: string;
  user_id: string;
  week_start_date: string; // YYYY-MM-DD
  amount: number;
  status: SettlementStatus;
  late_fees: number;
  created_at: string;
}

export interface DailyResult {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  raw_score: number;
  final_score: number;
  penalty_incurred: number;
  created_at: string;
}
