import { Rule, ActionLog, GlobalDay, PenaltyTier, DailyResult } from './types';

export interface FinalizeDayInput {
  date: string;
  users: { id: string }[];
  rules: Rule[];
  actionLogs: ActionLog[];
  globalDay: GlobalDay | null;
  penaltyTiers: PenaltyTier[];
}

export interface FinalizeDayOutput {
  dailyResults: Omit<DailyResult, 'id' | 'created_at'>[];
  weeklyDeptAdditions: { user_id: string; amount: number }[]; 
}

export function finalizeDay(input: FinalizeDayInput): FinalizeDayOutput {
  const { date, users, rules, actionLogs, globalDay, penaltyTiers } = input;
  
  const output: FinalizeDayOutput = {
    dailyResults: [],
    weeklyDeptAdditions: []
  };

  const isGoofFree = globalDay?.is_goof_free ?? false;
  const isSick = globalDay?.is_sick ?? false;
  const isAbroad = globalDay?.is_abroad ?? false;
  const isLongTrip = globalDay?.is_long_trip ?? false;
  const sleepRulesDisabled = isSick || isAbroad;

  const ruleBySysId = new Map<string, Rule>();
  const ruleById = new Map<string, Rule>();
  for (const r of rules) {
    ruleById.set(r.id, r);
    if (r.system_id) ruleBySysId.set(r.system_id, r);
  }

  const userScores = new Map<string, { raw: number; final: number }>();
  const userMoneyAdditions = new Map<string, number>();

  for (const user of users) {
    let rawScore = isGoofFree ? 0 : 5; 
    let moneyAdditions = 0;
    const userLogs = actionLogs.filter(l => l.user_id === user.id);

    for (const log of userLogs) {
      const rule = log.rule_id ? ruleById.get(log.rule_id) : null;
      if (!rule) continue;
      moneyAdditions += Number(log.money_calculated);
      if (isGoofFree) continue;
      if (isLongTrip && rule.system_id === 'sys_fastfood') continue;
      if (sleepRulesDisabled && (rule.system_id === 'sys_gm' || rule.system_id === 'sys_gn' || rule.system_id === 'sys_nap')) continue;
      rawScore += log.points_calculated;
    }

    if (!isGoofFree) {
      if (!sleepRulesDisabled) {
        const gmRule = ruleBySysId.get('sys_gm');
        if (gmRule && !userLogs.some(l => l.rule_id === gmRule.id)) {
          rawScore += gmRule.config?.max_penalty ?? 25;
        }
      }

      const m1Rule = ruleBySysId.get('sys_m1');
      if (m1Rule && !isSick) {
        const exerciseSysIds = m1Rule.config?.exercise_system_ids || ['sys_ex_pushups', 'sys_ex_situps', 'sys_ex_run'];
        let totalM1Points = 0;
        for (const log of userLogs) {
          const r = log.rule_id ? ruleById.get(log.rule_id) : null;
          if (r && r.system_id && exerciseSysIds.includes(r.system_id)) {
            totalM1Points += Math.abs(log.points_calculated);
          }
        }
        if (totalM1Points < (m1Rule.config?.min_points ?? 3)) rawScore += (m1Rule.config?.penalty ?? 3);
      }
      
      const m2Rule = ruleBySysId.get('sys_m2_social');
      if (m2Rule && !userLogs.some(l => l.rule_id === m2Rule.id)) rawScore += m2Rule.config?.penalty ?? 2;

      const m3Rule = ruleBySysId.get('sys_m3_chess');
      if (m3Rule && !userLogs.some(l => l.rule_id === m3Rule.id)) rawScore += m3Rule.config?.penalty ?? 1;
    }

    const finalScore = Math.max(0, rawScore);
    userScores.set(user.id, { raw: rawScore, final: finalScore });
    userMoneyAdditions.set(user.id, moneyAdditions);
  }

  if (users.length === 2 && !isGoofFree) {
    const p1 = users[0].id;
    const p2 = users[1].id;
    const score1 = userScores.get(p1)!.final;
    const score2 = userScores.get(p2)!.final;
    const diff = Math.abs(score1 - score2);
    
    let penaltyAmount = 0;
    const tier = penaltyTiers.find(t => diff >= t.min_diff && diff <= t.max_diff);
    if (tier) penaltyAmount = Number(tier.penalty_amount);

    let loser: string | null = null;
    if (score1 > score2) loser = p1;
    else if (score2 > score1) loser = p2;

    output.dailyResults.push({ user_id: p1, date, raw_score: userScores.get(p1)!.raw, final_score: score1, penalty_incurred: loser === p1 ? penaltyAmount : 0 });
    output.dailyResults.push({ user_id: p2, date, raw_score: userScores.get(p2)!.raw, final_score: score2, penalty_incurred: loser === p2 ? penaltyAmount : 0 });

    if (loser && penaltyAmount > 0) userMoneyAdditions.set(loser, userMoneyAdditions.get(loser)! + penaltyAmount);
  } else {
    for (const u of users) {
      output.dailyResults.push({ user_id: u.id, date, raw_score: userScores.get(u.id)?.raw || 0, final_score: userScores.get(u.id)?.final || 0, penalty_incurred: 0 });
    }
  }

  for (const [userId, amount] of userMoneyAdditions.entries()) {
    if (amount !== 0) output.weeklyDeptAdditions.push({ user_id: userId, amount });
  }

  return output;
}
