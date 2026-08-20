import { Rule, ActionLog } from './types';

export interface EvaluationResult {
  points_calculated: number;
  money_calculated: number;
  amount: number;
}

export function evaluateAction(
  rule: Rule,
  amount: number,
  finishedAt: Date, 
  todaysLogsForRule: ActionLog[] = []
): EvaluationResult {
  const unitSize = rule.unit_size ? Number(rule.unit_size) : 1;
  const units = Math.floor(amount / (isNaN(unitSize) || unitSize <= 0 ? 1 : unitSize));

  let points = units * rule.points;
  let money = units * Number(rule.money_value);

  if (rule.is_exercise) {
    const hours = finishedAt.getHours();
    if (hours < 6) {
      points *= 2;
    }
  }

  if (rule.cap_type === 'DAILY' && rule.cap_value !== null) {
    const alreadyLoggedPoints = todaysLogsForRule.reduce((sum, log) => sum + log.points_calculated, 0);
    if (rule.points < 0 && rule.cap_value < 0) {
      if (alreadyLoggedPoints <= rule.cap_value) {
        points = 0; 
      } else if (alreadyLoggedPoints + points < rule.cap_value) {
        points = rule.cap_value - alreadyLoggedPoints;
      }
    } else if (rule.points > 0 && rule.cap_value > 0) {
      if (alreadyLoggedPoints >= rule.cap_value) {
        points = 0;
      } else if (alreadyLoggedPoints + points > rule.cap_value) {
        points = rule.cap_value - alreadyLoggedPoints;
      }
    }
  }

  return { amount, points_calculated: points, money_calculated: money };
}
