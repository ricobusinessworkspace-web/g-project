import { WeeklySettlement } from './types';

export interface WeeklyResetOutput {
  totalDeptReductions: { user_id: string; amount: number; settlement_id: string }[];
  settlementsToMarkPaid: string[];
  newWeeklySettlements: { user_id: string; week_start_date: string }[];
}

export function processWeeklyReset(
  lastWeekSettlements: WeeklySettlement[],
  newWeekStartDate: string
): WeeklyResetOutput {
  const output: WeeklyResetOutput = {
    totalDeptReductions: [],
    settlementsToMarkPaid: [],
    newWeeklySettlements: []
  };

  for (const settlement of lastWeekSettlements) {
    if (settlement.amount < 0) {
      output.totalDeptReductions.push({
        user_id: settlement.user_id,
        amount: Math.abs(settlement.amount),
        settlement_id: settlement.id
      });
      output.settlementsToMarkPaid.push(settlement.id);
    }
    output.newWeeklySettlements.push({
      user_id: settlement.user_id,
      week_start_date: newWeekStartDate
    });
  }

  return output;
}

export function processLateFees(
  openSettlements: WeeklySettlement[],
  currentDateStr: string
): { settlement_id: string; late_fee_addition: number }[] {
  const lateFeeAdditions: { settlement_id: string; late_fee_addition: number }[] = [];
  const currentDate = new Date(currentDateStr);

  for (const settlement of openSettlements) {
    const weekStart = new Date(settlement.week_start_date);
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const daysSinceStart = Math.floor((currentDate.getTime() - weekStart.getTime()) / MS_PER_DAY);
    
    if (daysSinceStart >= 8) {
      lateFeeAdditions.push({
        settlement_id: settlement.id,
        late_fee_addition: 5.00
      });
    }
  }

  return lateFeeAdditions;
}
