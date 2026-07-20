import { supabase } from './supabase';
import { getISODate, getLogicalDate, useTrackerStore } from '../store/trackerStore';

export const runCatchUpEngine = async (state: any, set: any) => {
  if (!state.userId) return;

  const now = new Date();
  const todayStr = getLogicalDate(now);

  let myDate = state.lastSettlementDate;
  let oppDate = state.opponentLastSettlementDate;

  // Initialize if null
  let needsMyInit = !myDate;
  let needsOppInit = !oppDate && state.opponentUserId;

  if (needsMyInit || needsOppInit) {
    if (needsMyInit) {
      myDate = todayStr;
      await supabase.from('tracker_user_stats').update({ last_settlement_date: todayStr }).eq('user_id', state.userId);
      set({ lastSettlementDate: todayStr });
    }
    if (needsOppInit) {
      oppDate = todayStr;
      await supabase.from('tracker_user_stats').update({ last_settlement_date: todayStr }).eq('user_id', state.opponentUserId);
      set({ opponentLastSettlementDate: todayStr });
    }
    if (myDate === todayStr && (!state.opponentUserId || oppDate === todayStr)) return;
  }

  let currentSimDate = myDate! < oppDate! ? myDate! : oppDate!;

  const ctx: any = {
    [state.userId]: {
      unpaid: state.myUnpaidWeeklyDebt || 0,
      weekly: state.myWeeklyDebt || 0,
      debt: state.myDebt || 0,
      lastReset: state.lastWeeklyResetDate,
      lastLate: state.lastLatePayDate,
      isExempt: state.myTripAbroad || state.mySicko || state.myGoofFreeDayUsed === currentSimDate || 
                state.opponentTripAbroad || state.opponentSicko || state.opponentGoofFreeDayUsed === currentSimDate
    }
  };
  
  if (state.opponentUserId) {
      ctx[state.opponentUserId] = {
          unpaid: state.opponentUnpaidWeeklyDebt || 0,
          weekly: state.opponentWeeklyDebt || 0,
          debt: 0,
          lastReset: state.opponentLastWeeklyResetDate,
          lastLate: state.opponentLastLatePayDate,
          isExempt: ctx[state.userId].isExempt
      };
  }

  const getMostRecentMonday = (d: Date) => {
    const dCopy = new Date(d);
    const day = dCopy.getDay();
    const diff = dCopy.getDate() - day + (day === 0 ? -6 : 1);
    return getISODate(new Date(dCopy.setDate(diff)));
  };

  const getDayData = async (uid: string, dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const start = new Date(y, m - 1, d).getTime();
    const end = start + 86400000;
    const { data: actions } = await supabase.from('tracker_action_entries')
      .select('*').eq('user_id', uid).gte('timestamp', start).lt('timestamp', end);
    
    let totalPoints = 5;
    let hasMandatoryPenalty = false;
    let hasDailyDebt = false;
    
    if (actions) {
       for (const a of actions) {
           if (!a.is_cancelled) {
               totalPoints += a.points_applied;
               if (a.rule_id === 'mandatory_penalty') hasMandatoryPenalty = true;
               if (a.rule_id === 'daily_debt_settlement') hasDailyDebt = true;
           }
       }
    }
    
    return { start, actions: actions || [], totalPoints, hasMandatoryPenalty, hasDailyDebt };
  };

  const calcMandatoryPenalty = (actions: any[]) => {
    let pen = 0;
    let hasSufficientExercise = false;
    const exerciseCounts: Record<string, number> = {};
    const rules = useTrackerStore.getState().rules;
    for (const action of actions) {
      const rule = rules.find(r => r.id === action.rule_id);
      if (rule && rule.category === 'EXERCISE' && !action.is_cancelled) {
        const actionDate = new Date(action.timestamp);
        const isBefore6am = actionDate.getHours() < 6;
        const factor = rule.time_modifier === 'DOUBLE_BEFORE_6AM' && isBefore6am ? 2 : 1;
        let multiplier = 1;
        if (rule.base_value !== 0) {
           multiplier = action.points_applied / (rule.base_value * factor);
           if (isNaN(multiplier) || multiplier <= 0) multiplier = 1;
           multiplier = Math.round(multiplier);
        }
        exerciseCounts[action.rule_id] = (exerciseCounts[action.rule_id] || 0) + multiplier;
        if (exerciseCounts[action.rule_id] >= 3) hasSufficientExercise = true;
      }
    }
    if (!hasSufficientExercise) pen += 3;
    if (!actions.some(a => a.rule_id === 'rec_5' && !a.is_cancelled)) pen += 1;
    if (!actions.some(a => a.rule_id === 'ma_2' && !a.is_cancelled)) pen += 2;
    return pen;
  };

  let allInserts: any[] = [];
  
  while (currentSimDate < todayStr) {
     const [y, m, d] = currentSimDate.split('-').map(Number);
     const simDateObj = new Date(y, m - 1, d);
     const dayOfWeek = simDateObj.getDay();
     const isMonday = dayOfWeek === 1;
     const simTimestampStr = simDateObj.getTime() + 86400000 - 1000;
     
     const myNeedsProcessing = myDate! <= currentSimDate;
     const oppNeedsProcessing = oppDate! <= currentSimDate && state.opponentUserId;

     const myData = await getDayData(state.userId, currentSimDate);
     const oppData = state.opponentUserId ? await getDayData(state.opponentUserId, currentSimDate) : null;
     
     if (myNeedsProcessing && !ctx[state.userId].isExempt && !myData.hasMandatoryPenalty) {
        const pen = calcMandatoryPenalty(myData.actions);
        if (pen > 0) {
            allInserts.push({ id: Math.random().toString(), user_id: state.userId, rule_id: 'mandatory_penalty', timestamp: simTimestampStr, points_applied: pen, debt_applied: 0 });
            myData.totalPoints += pen;
        }
     }
     if (oppNeedsProcessing && state.opponentUserId && !ctx[state.opponentUserId].isExempt && !oppData!.hasMandatoryPenalty) {
        const pen = calcMandatoryPenalty(oppData!.actions);
        if (pen > 0) {
            allInserts.push({ id: Math.random().toString(), user_id: state.opponentUserId, rule_id: 'mandatory_penalty', timestamp: simTimestampStr, points_applied: pen, debt_applied: 0 });
            oppData!.totalPoints += pen;
        }
     }

     const uidsToProcessDailyDebt = [];
     if (myNeedsProcessing && !myData.hasDailyDebt) uidsToProcessDailyDebt.push(state.userId);
     if (oppNeedsProcessing && state.opponentUserId && !oppData!.hasDailyDebt) uidsToProcessDailyDebt.push(state.opponentUserId);

     if (uidsToProcessDailyDebt.length > 0 && oppData && !ctx[state.userId].isExempt) {
         let diff = myData.totalPoints - oppData.totalPoints;
         let debtAmount = 0;
         let absDiff = Math.abs(diff);
         if (absDiff > 0 && absDiff <= 9) debtAmount = 5;
         else if (absDiff >= 10 && absDiff <= 19) debtAmount = 10;
         else if (absDiff >= 20) debtAmount = 15;
         
         if (debtAmount > 0) {
             const loserId = diff > 0 ? state.userId : state.opponentUserId;
             if (uidsToProcessDailyDebt.includes(loserId)) {
                 allInserts.push({ id: Math.random().toString(), user_id: loserId, rule_id: 'daily_debt_settlement', timestamp: simTimestampStr, points_applied: 0, debt_applied: debtAmount });
                 ctx[loserId].weekly += debtAmount;
                 ctx[loserId].debt += debtAmount;
             }
         }
     }

     const processDebtForUser = (uid: string, needsProcessing: boolean) => {
         const userCtx = ctx[uid];
         const recentMonday = getMostRecentMonday(simDateObj);
         
         if (userCtx.lastReset !== recentMonday && isMonday && needsProcessing) {
             const removedWeekly = userCtx.weekly;
             if (removedWeekly < 0) {
                 userCtx.debt += removedWeekly; // spilled over (negative means it reduces debt)
             } else {
                 userCtx.unpaid += removedWeekly; // moves to unpaid
             }
             userCtx.weekly = 0;
             userCtx.lastReset = recentMonday;
             allInserts.push({ id: Math.random().toString(), user_id: uid, rule_id: 'weekly_reset', timestamp: simDateObj.getTime() + 1000, points_applied: 0, debt_applied: -removedWeekly });
         }

         if (userCtx.unpaid > 0 && !isMonday && needsProcessing) {
             if (userCtx.lastLate !== currentSimDate) {
                 userCtx.unpaid += 5;
                 userCtx.lastLate = currentSimDate;
                 allInserts.push({ id: Math.random().toString(), user_id: uid, rule_id: 'late_fee', timestamp: simTimestampStr + 1000, points_applied: 0, debt_applied: 5 });
             }
         } else if (userCtx.unpaid <= 0 && needsProcessing) {
             userCtx.lastLate = null;
         }
     };

     if (myNeedsProcessing) processDebtForUser(state.userId, true);
     if (oppNeedsProcessing && state.opponentUserId) processDebtForUser(state.opponentUserId, true);

     const nextDay = new Date(simDateObj.getTime() + 86400000);
     currentSimDate = getISODate(nextDay);
     if (myNeedsProcessing) myDate = currentSimDate;
     if (oppNeedsProcessing) oppDate = currentSimDate;
  }

  if (allInserts.length > 0) {
      await supabase.from('tracker_action_entries').insert(allInserts);
  }

  let updatesMe: any = null;
  let updatesOpp: any = null;

  if (myDate !== state.lastSettlementDate) {
      updatesMe = {
          last_settlement_date: todayStr,
          my_points: 5,
          my_debt: ctx[state.userId].debt,
          my_weekly_debt: ctx[state.userId].weekly,
          unpaid_weekly_debt: ctx[state.userId].unpaid,
          last_weekly_reset_date: ctx[state.userId].lastReset,
          last_late_pay_date: ctx[state.userId].lastLate
      };
      await supabase.from('tracker_user_stats').update(updatesMe).eq('user_id', state.userId);
  }
  
  if (state.opponentUserId && oppDate !== state.opponentLastSettlementDate) {
      updatesOpp = {
          last_settlement_date: todayStr,
          my_points: 5,
          my_weekly_debt: ctx[state.opponentUserId].weekly,
          unpaid_weekly_debt: ctx[state.opponentUserId].unpaid,
          last_weekly_reset_date: ctx[state.opponentUserId].lastReset,
          last_late_pay_date: ctx[state.opponentUserId].lastLate
      };
      await supabase.from('tracker_user_stats').update(updatesOpp).eq('user_id', state.opponentUserId);
  }

  if (updatesMe || updatesOpp) {
      let zustandUpdates: any = {};
      if (updatesMe) {
          zustandUpdates = {
              ...zustandUpdates,
              lastSettlementDate: todayStr,
              myPoints: 5,
              myDebt: ctx[state.userId].debt,
              myWeeklyDebt: ctx[state.userId].weekly,
              myUnpaidWeeklyDebt: ctx[state.userId].unpaid,
              lastWeeklyResetDate: ctx[state.userId].lastReset,
              lastLatePayDate: ctx[state.userId].lastLate
          };
      }
      if (updatesOpp) {
          zustandUpdates = {
              ...zustandUpdates,
              opponentLastSettlementDate: todayStr,
              opponentPoints: 5,
              opponentWeeklyDebt: ctx[state.opponentUserId].weekly,
              opponentUnpaidWeeklyDebt: ctx[state.opponentUserId].unpaid,
              opponentLastWeeklyResetDate: ctx[state.opponentUserId].lastReset,
              opponentLastLatePayDate: ctx[state.opponentUserId].lastLate
          };
      }
      set(zustandUpdates);
  }
};
