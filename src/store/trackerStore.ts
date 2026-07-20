import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { CODE_OF_HONOR } from '../constants/rules';
import { runCatchUpEngine } from '../utils/catchUpEngine';

export type ImpactType = 'POINTS' | 'DEBT';
export type TimeModifier = 'DOUBLE_BEFORE_6AM' | 'NONE';

export interface Rule {
  id: string;
  name: string;
  category: 'REOCCURING' | 'ONCE_DAILY' | 'SLEEP_TAXES' | 'EXERCISE' | 'RECREATIONAL' | 'BUSINESS' | 'PERSONAL' | 'MANDATORY' | 'ABBAUEN' | 'GN' | 'GM';
  impact_type: ImpactType;
  base_value: number;
  iconName: string;
  requires_input?: boolean;
  input_step?: number;
  time_modifier?: TimeModifier;
  daily_max?: number;
  weekly_max?: number;
  free_uses_per_week?: number;
  miss_penalty?: number;
}

export interface ActionEntry {
  id: string;
  rule_id: string;
  timestamp: number;
  points_applied: number;
  debt_applied: number;
  is_cancelled?: boolean;
}

export const getISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLogicalDate = (date: Date) => {
  // Points boundary is 0:00 (Midnight)
  return getISODate(date);
};

export const getGmDate = (date: Date) => {
  // GM boundary is 4:00 AM
  const logicalNow = new Date(date.getTime() - 4 * 60 * 60 * 1000);
  return getISODate(logicalNow);
};

export const getRuleUsageStats = (entries: ActionEntry[], rule: Rule) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const d = new Date(startOfDay);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(d.setDate(diff)).getTime();
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let daily = 0;
  let weekly = 0;
  let monthly = 0;

  for (const entry of entries) {
    if (entry.rule_id === rule.id && !entry.is_cancelled) {
      // Calculate units based on base_value. For ABBAUEN the logic is different but they don't have limits.
      let units = 1;
      if (rule.impact_type === 'POINTS' && rule.base_value !== 0) {
        units = Math.abs(entry.points_applied / rule.base_value);
      } else if (rule.impact_type === 'DEBT' && rule.base_value !== 0) {
        units = Math.abs(entry.debt_applied / rule.base_value);
      }

      // Handle the DOUBLE_BEFORE_6AM modifier. If the entry had 2x points, it only counts as 1 use of the exercise rule physically.
      // Actually, if we use points_applied, a 6AM exercise gives double points, but does it count as double limit? 
      // User said: "eg -1 30min learning means only -4 points per day can be tracked". 
      // Let's assume units = points_applied / base_value, except for 6AM exercises which have no daily_max anyway.
      
      if (entry.timestamp >= startOfDay) daily += units;
      if (entry.timestamp >= startOfWeek) weekly += units;
      if (entry.timestamp >= startOfMonth) monthly += units;
    }
  }

  return { daily, weekly, monthly };
};

interface TrackerState {
  userId: string | null;
  userName: string | null;
  myPoints: number;
  myDebt: number; // Euro debt
  myWeeklyDebt: number;
  myTotalDebt: number;
  myUnpaidWeeklyDebt: number;
  opponentPoints: number;
  opponentWeeklyDebt: number;
  opponentTotalDebt: number;
  opponentUnpaidWeeklyDebt: number;
  opponentUserId: string | null;
  opponentName: string | null;
  opponentIsOnline: boolean;
  opponentLastSettlementDate: string | null;
  opponentLastWeeklyResetDate: string | null;
  opponentLastLatePayDate: string | null;
  opponentLastGmDate: string | null;
  myTripAbroad: boolean;
  myFamilyTrip: boolean;
  mySicko: boolean;
  myGoofFreeDayUsed: string | null;
  opponentTripAbroad: boolean;
  opponentFamilyTrip: boolean;
  opponentSicko: boolean;
  opponentGoofFreeDayUsed: string | null;
  rules: Rule[];
  actionEntries: ActionEntry[];
  opponentActionEntries: ActionEntry[];
  isLoading: boolean;
  isOnline: boolean;
  
  lastSettlementDate: string | null;
  lastWeeklyResetDate: string | null;
  lastGmDate: string | null;
  lastLatePayDate: string | null;

  fetchState: (userId: string) => Promise<void>;
  setupRealtimeSync: (userId: string) => void;
  fetchRules: () => Promise<void>;
  logAction: (rule: Rule, multiplier?: number) => void;
  undoAction: (actionId: string) => void;
  adjustDebt: (type: 'WEEKLY' | 'TOTAL', newAmount: number) => Promise<void>;
  adjustPoints: (newAmount: number) => Promise<void>;
  updateName: (newName: string) => Promise<void>;
  settleWeeklyDebt: () => Promise<void>;
  resetDay: () => void;
  setTripAbroad: (value: boolean) => Promise<void>;
  setFamilyTrip: (value: boolean) => Promise<void>;
  setSicko: (value: boolean) => Promise<void>;
  setGoofFreeDay: (date: string | null) => Promise<void>;
  
  checkAndRunSettlement: () => Promise<void>;
  logGm: (wakeTime: Date) => void;
  updateGm: (wakeTime: Date) => void;
  resetGm: () => void;
  setOpponentPoints: (points: number) => void;
}

export const useTrackerStore = create<TrackerState>((set, get) => ({
  userId: null,
  userName: null,
  myPoints: 5,
  myDebt: 0,
  myWeeklyDebt: 0,
  myTotalDebt: 0,
  myUnpaidWeeklyDebt: 0,
  opponentPoints: 7, 
  opponentWeeklyDebt: 0,
  opponentTotalDebt: 0,
  opponentUnpaidWeeklyDebt: 0,
  opponentUserId: null,
  opponentName: null,
  opponentIsOnline: false,
  opponentLastSettlementDate: null,
  opponentLastWeeklyResetDate: null,
  opponentLastLatePayDate: null,
  opponentLastGmDate: null,
  myTripAbroad: false,
  myFamilyTrip: false,
  mySicko: false,
  myGoofFreeDayUsed: null,
  opponentTripAbroad: false,
  opponentFamilyTrip: false,
  opponentSicko: false,
  opponentGoofFreeDayUsed: null,
  rules: [],
  actionEntries: [],
  opponentActionEntries: [],
  isLoading: true,
  isOnline: false,
  
  lastSettlementDate: null,
  lastWeeklyResetDate: null,
  lastGmDate: null,
  lastLatePayDate: null,

  fetchState: async (userId: string) => {
    set({ isLoading: true });
    const { data, error } = await supabase.from('tracker_user_stats').select('*').eq('user_id', userId).maybeSingle();
    if (error) alert('Select Error: ' + error.message);
    
    if (data) {
      set({
        myPoints: data.my_points ?? 5,
        myDebt: data.my_debt ?? 0,
        myWeeklyDebt: data.my_weekly_debt ?? 0,
        myTotalDebt: data.my_total_debt ?? 0,
        myUnpaidWeeklyDebt: data.unpaid_weekly_debt ?? 0,
        lastSettlementDate: data.last_settlement_date,
        lastWeeklyResetDate: data.last_weekly_reset_date,
        lastGmDate: data.last_gm_date,
        lastLatePayDate: data.last_late_pay_date,
        userName: data.name,
        myTripAbroad: data.trip_abroad ?? false,
        myFamilyTrip: data.family_trip ?? false,
        mySicko: data.sicko ?? false,
        myGoofFreeDayUsed: data.goof_free_day_used ?? null,
      });
    } else {
      const { error: insertErr } = await supabase.from('tracker_user_stats').insert({
        user_id: userId,
        my_points: 5,
        my_debt: 0,
        my_weekly_debt: 0,
        my_total_debt: 0,
        unpaid_weekly_debt: 0
      });
      if (insertErr) alert('Insert Error: ' + insertErr.message);
      set({
         myPoints: 5,
         myDebt: 0,
         myWeeklyDebt: 0,
         myTotalDebt: 0,
         myUnpaidWeeklyDebt: 0
      });
    }

    const now = new Date();
    const startOfLogicalDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); 
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    // Calculate todayStr exactly how getGmDate does to compare settlement dates
    const todayStr = new Date(startOfLogicalDay).toISOString().split('T')[0];

    const { data: opponentData } = await supabase.from('tracker_user_stats').select('*').neq('user_id', userId).maybeSingle();
    if (opponentData) {
      set({
        opponentPoints: opponentData.my_points ?? 5,
        opponentWeeklyDebt: opponentData.my_weekly_debt ?? 0,
        opponentTotalDebt: opponentData.my_total_debt ?? 0,
        opponentUnpaidWeeklyDebt: opponentData.unpaid_weekly_debt ?? 0,
        opponentName: opponentData.name ?? 'Opponent',
        opponentUserId: opponentData.user_id ?? null,
        opponentTripAbroad: opponentData.trip_abroad ?? false,
        opponentFamilyTrip: opponentData.family_trip ?? false,
        opponentSicko: opponentData.sicko ?? false,
        opponentGoofFreeDayUsed: opponentData.goof_free_day_used ?? null,
        opponentLastSettlementDate: opponentData.last_settlement_date,
        opponentLastWeeklyResetDate: opponentData.last_weekly_reset_date,
        opponentLastLatePayDate: opponentData.last_late_pay_date,
        opponentLastGmDate: opponentData.last_gm_date,
      });
    }


    const { data: actionsData, error: actionsError } = await supabase.from('tracker_action_entries')
      .select('*')
      .gte('timestamp', startOfMonth);
      
    if (actionsError) alert('Fetch Actions Error: ' + actionsError.message);
      
    if (actionsData) {
      set({
        actionEntries: actionsData.filter(a => a.user_id === userId),
        opponentActionEntries: actionsData.filter(a => a.user_id !== userId),
      });
    }

    await get().checkAndRunSettlement();
    
    set({ isLoading: false });
  },

  setupRealtimeSync: async (userId: string) => {
    await supabase.removeAllChannels();

    supabase.channel('public:user_stats')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tracker_user_stats' }, (payload) => {
        if (payload.new.user_id === userId) {
          set({
            myPoints: payload.new.my_points ?? 5,
            myDebt: payload.new.my_debt ?? 0,
            myWeeklyDebt: payload.new.my_weekly_debt ?? 0,
            myTotalDebt: payload.new.my_total_debt ?? 0,
            myUnpaidWeeklyDebt: payload.new.unpaid_weekly_debt ?? 0,
            lastSettlementDate: payload.new.last_settlement_date,
            lastWeeklyResetDate: payload.new.last_weekly_reset_date,
            lastGmDate: payload.new.last_gm_date,
            lastLatePayDate: payload.new.last_late_pay_date,
            myTripAbroad: payload.new.trip_abroad ?? false,
            myFamilyTrip: payload.new.family_trip ?? false,
            mySicko: payload.new.sicko ?? false,
            myGoofFreeDayUsed: payload.new.goof_free_day_used ?? null,
          });
        } else {
          set({
            opponentPoints: payload.new.my_points ?? 5,
            opponentWeeklyDebt: payload.new.my_weekly_debt ?? 0,
            opponentTotalDebt: payload.new.my_total_debt ?? 0,
            opponentUnpaidWeeklyDebt: payload.new.unpaid_weekly_debt ?? 0,
            opponentName: payload.new.name ?? 'Opponent',
            opponentUserId: payload.new.user_id ?? null,
            opponentTripAbroad: payload.new.trip_abroad ?? false,
            opponentFamilyTrip: payload.new.family_trip ?? false,
            opponentSicko: payload.new.sicko ?? false,
            opponentGoofFreeDayUsed: payload.new.goof_free_day_used ?? null,
            opponentLastSettlementDate: payload.new.last_settlement_date,
            opponentLastGmDate: payload.new.last_gm_date,
          });
        }
      })
      .subscribe((status) => {
        set({ isOnline: status === 'SUBSCRIBED' });
      });

    supabase.channel('public:action_entries')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tracker_action_entries' }, (payload) => {
        const state = get();
        if (payload.new.user_id === userId) {
          if (!state.actionEntries.find(e => e.timestamp === payload.new.timestamp)) {
             set({ actionEntries: [...state.actionEntries, payload.new as ActionEntry] });
          }
        } else {
          set({ opponentActionEntries: [...state.opponentActionEntries, payload.new as ActionEntry] });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tracker_action_entries' }, (payload) => {
        const state = get();
        if (payload.new.user_id === userId) {
          set({ actionEntries: state.actionEntries.map(e => e.timestamp === payload.new.timestamp ? payload.new as ActionEntry : e) });
        } else {
          set({ opponentActionEntries: state.opponentActionEntries.map(e => e.timestamp === payload.new.timestamp ? payload.new as ActionEntry : e) });
        }
      })
      .subscribe();

    const roomOne = supabase.channel('online-users');
    roomOne.on('presence', { event: 'sync' }, () => {
      const state = get();
      const newState = roomOne.presenceState();
      let oppIsOnline = false;
      for (const [key, value] of Object.entries(newState)) {
        // @ts-ignore
        if (value.some(v => v.user_id === state.opponentUserId)) {
          oppIsOnline = true;
          break;
        }
      }
      set({ opponentIsOnline: oppIsOnline });
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await roomOne.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    });
  },

  setOpponentPoints: (points: number) => set({ opponentPoints: points }),
  
  fetchRules: async () => {
    set({ rules: CODE_OF_HONOR });
  },
  
  checkAndRunSettlement: async () => {
    const state = get();
    await runCatchUpEngine(state, set);
  },

  logGm: async (wakeTime: Date) => {
    const state = get();
    if (!state.userId) return;
    
    await get().checkAndRunSettlement();

    const todayStr = getGmDate(wakeTime); 

    let sleepTax = 0; // +5 for breathing base tax is already applied during settlement
    const hours = wakeTime.getHours();
    
    // Equal taxation for Family Trip -> No sleep rules
    const isFamilyTrip = state.myFamilyTrip || state.opponentFamilyTrip;
    
    if (!isFamilyTrip) {
      if (hours >= 5) sleepTax += 10; // sleepy after 4:59
      if (hours >= 6) sleepTax += 5;  // every hour...
      if (hours >= 7) sleepTax += 5;
      if (hours >= 8) sleepTax += 5;  // ...until 8:00
    }

    const timestamp = wakeTime.getTime();
    
    await supabase.from('tracker_action_entries').insert({
      id: Math.random().toString(),
      user_id: state.userId,
      rule_id: 'gm_1', // Using generic gm_1 ID
      timestamp: timestamp,
      points_applied: sleepTax,
      debt_applied: 0,
    });

    const newPoints = get().myPoints + sleepTax; 
    
    const { error: updateErr } = await supabase.from('tracker_user_stats').update({
      my_points: newPoints,
      last_gm_date: todayStr,
    }).eq('user_id', state.userId);
    if (updateErr) alert('GM Update Error: ' + updateErr.message);

    set({
      myPoints: newPoints,
      lastGmDate: todayStr,
      actionEntries: [
        ...get().actionEntries,
        {
          id: 'gm_' + todayStr,
          rule_id: 'gm_1',
          timestamp: timestamp,
          points_applied: sleepTax,
          debt_applied: 0,
        }
      ]
    });
  },

  updateGm: async (wakeTime: Date) => {
      const todayStr = getGmDate(wakeTime);
      await get().undoAction('gm_' + todayStr);
      await get().logGm(wakeTime);
  },

  logAction: async (rule, multiplier = 1) => {
    const state = get();
    if (!state.userId) return;

    await get().checkAndRunSettlement();

    let pointsToApply = 0;
    let debtToApply = 0;
    
    const isBefore6am = new Date().getHours() < 6;
    let finalBaseValue = rule.base_value * multiplier;
    
    if (rule.time_modifier === 'DOUBLE_BEFORE_6AM' && isBefore6am) {
      finalBaseValue *= 2;
    }

    if (rule.id === 'ab_3') {
      pointsToApply = finalBaseValue;
      debtToApply = finalBaseValue;
    } else if (rule.impact_type === 'POINTS') {
      pointsToApply = finalBaseValue;
    } else if (rule.impact_type === 'DEBT') {
      debtToApply = finalBaseValue;
    }

    // BONUS DEBT MECHANIC for Pushups and Runs
    if (rule.id === 'ex_1' || rule.id === 'ex_3') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      
      const todayEntries = state.actionEntries.filter(
        a => a.rule_id === rule.id && a.timestamp >= startOfDay && !a.is_cancelled
      );
      
      let oldMultiplierSum = 0;
      for (const a of todayEntries) {
        const actionDate = new Date(a.timestamp);
        const actionIsBefore6am = actionDate.getHours() < 6;
        const factor = rule.time_modifier === 'DOUBLE_BEFORE_6AM' && actionIsBefore6am ? 2 : 1;
        let m = 1;
        if (rule.base_value !== 0) {
           m = a.points_applied / (rule.base_value * factor);
           if (!isNaN(m) && m > 0) oldMultiplierSum += Math.round(m);
        }
      }
      
      const newMultiplierSum = oldMultiplierSum + multiplier;
      
      if (rule.id === 'ex_1') {
        // Every 5x 100 pushups -> -5 debt
        const oldBlocks = Math.floor(oldMultiplierSum / 5);
        const newBlocks = Math.floor(newMultiplierSum / 5);
        if (newBlocks > oldBlocks) {
          debtToApply += (newBlocks - oldBlocks) * -5;
        }
      } else if (rule.id === 'ex_3') {
        // Every 10x 1km run -> -10 debt
        const oldBlocks = Math.floor(oldMultiplierSum / 10);
        const newBlocks = Math.floor(newMultiplierSum / 10);
        if (newBlocks > oldBlocks) {
          debtToApply += (newBlocks - oldBlocks) * -10;
        }
      }
    }

    const timestamp = Date.now();

    const newEntry: ActionEntry = {
      id: Math.random().toString(),
      rule_id: rule.id,
      timestamp: timestamp,
      points_applied: pointsToApply,
      debt_applied: debtToApply,
    };

    let newWeeklyDebt = get().myWeeklyDebt;
    let newTotalDebt = get().myTotalDebt;

    if (rule.id === 'ab_3') {
      // Manual Debt Payoff ALWAYS and ONLY reduces Total Debt
      newTotalDebt += debtToApply; 
    } else {
      // Normal rules affect Weekly Debt (which can go negative during the week)
      newWeeklyDebt += debtToApply;
    }

    set({
      myPoints: get().myPoints + pointsToApply,
      myDebt: get().myDebt + debtToApply,
      myWeeklyDebt: newWeeklyDebt,
      myTotalDebt: newTotalDebt,
      actionEntries: [...get().actionEntries, newEntry],
    });

    const { error: insertActionErr } = await supabase.from('tracker_action_entries').insert({
      id: newEntry.id,
      user_id: state.userId,
      rule_id: rule.id,
      timestamp: timestamp,
      points_applied: pointsToApply,
      debt_applied: debtToApply,
    });
    if (insertActionErr) alert('Insert Action Error: ' + insertActionErr.message);

    const { error: actionErr } = await supabase.from('tracker_user_stats').update({
      my_points: get().myPoints,
      my_debt: get().myDebt,
      my_weekly_debt: get().myWeeklyDebt,
      my_total_debt: get().myTotalDebt,
    }).eq('user_id', state.userId);
    if (actionErr) alert('Action Update Error: ' + actionErr.message);
  },
  
  undoAction: async (actionId: string) => {
    const state = get();
    if (!state.userId) return;

    const entry = state.actionEntries.find(e => e.id === actionId || (actionId.startsWith('gm_') && e.id === actionId));
    if (!entry) return;

    set({
      myPoints: state.myPoints - entry.points_applied,
      myDebt: state.myDebt - entry.debt_applied,
      myWeeklyDebt: state.myWeeklyDebt - entry.debt_applied,
      actionEntries: state.actionEntries.map(e => 
        e.id === entry.id ? { ...e, is_cancelled: true } : e
      ),
    });

    await supabase.from('tracker_action_entries')
      .update({ is_cancelled: true })
      .eq('user_id', state.userId)
      .eq('id', entry.id);

    await supabase.from('tracker_user_stats').update({
      my_points: state.myPoints - entry.points_applied,
      my_debt: state.myDebt - entry.debt_applied,
      my_weekly_debt: state.myWeeklyDebt - entry.debt_applied,
    }).eq('user_id', state.userId);
  },
  
  adjustDebt: async (type: 'WEEKLY' | 'TOTAL', newAmount: number) => {
    const state = get();
    if (!state.userId) return;

    let debtDiff = 0;
    const isWeekly = type === 'WEEKLY';
    
    if (isWeekly) {
      debtDiff = newAmount - state.myWeeklyDebt;
    } else {
      debtDiff = newAmount - state.myTotalDebt;
    }

    if (debtDiff === 0) return;

    const timestamp = Date.now();
    const rule_id = isWeekly ? 'adj_weekly' : 'adj_total';

    const newEntry: ActionEntry = {
      id: Math.random().toString(),
      rule_id: rule_id,
      timestamp: timestamp,
      points_applied: 0,
      debt_applied: debtDiff,
    };

    set({
      myWeeklyDebt: isWeekly ? newAmount : state.myWeeklyDebt,
      myTotalDebt: !isWeekly ? newAmount : state.myTotalDebt,
      actionEntries: [...state.actionEntries, newEntry],
    });

    await supabase.from('tracker_action_entries').insert({
      user_id: state.userId,
      rule_id: rule_id,
      timestamp: timestamp,
      points_applied: 0,
      debt_applied: debtDiff,
    });

    await supabase.from('tracker_user_stats').update({
      my_weekly_debt: isWeekly ? newAmount : state.myWeeklyDebt,
      my_total_debt: !isWeekly ? newAmount : state.myTotalDebt,
    }).eq('user_id', state.userId);
  },

  adjustPoints: async (newAmount: number) => {
    const state = get();
    if (!state.userId) return;

    const pointsDiff = newAmount - state.myPoints;
    if (pointsDiff === 0) return;

    const timestamp = Date.now();
    const rule_id = 'adj_points';

    const newEntry: ActionEntry = {
      id: Math.random().toString(),
      rule_id: rule_id,
      timestamp: timestamp,
      points_applied: pointsDiff,
      debt_applied: 0,
    };

    set({
      myPoints: newAmount,
      actionEntries: [...state.actionEntries, newEntry],
    });

    await supabase.from('tracker_action_entries').insert({
      id: newEntry.id,
      user_id: state.userId,
      rule_id: rule_id,
      timestamp: timestamp,
      points_applied: pointsDiff,
      debt_applied: 0,
    });

    await supabase.from('tracker_user_stats').update({
      my_points: newAmount,
    }).eq('user_id', state.userId);
  },

  updateName: async (newName: string) => {
    const state = get();
    if (!state.userId || !newName.trim()) return;
    
    set({ userName: newName });
    await supabase.from('tracker_user_stats').update({ name: newName }).eq('user_id', state.userId);
  },

  settleWeeklyDebt: async () => {
     const state = get();
     if (!state.userId || state.myUnpaidWeeklyDebt <= 0) return;

     set({ myUnpaidWeeklyDebt: 0, lastLatePayDate: null });
     
     await supabase.from('tracker_user_stats').update({
         unpaid_weekly_debt: 0,
         last_late_pay_date: null
     }).eq('user_id', state.userId);
  },

  resetDay: () => set({ myPoints: 5, myDebt: 0, actionEntries: [] }),
  resetGm: () => set({ lastGmDate: null }),
  
  setTripAbroad: async (value: boolean) => {
    const state = get();
    if (!state.userId) return;
    set({ myTripAbroad: value });
    await supabase.from('tracker_user_stats').update({ trip_abroad: value }).eq('user_id', state.userId);
  },
  
  setFamilyTrip: async (value: boolean) => {
    const state = get();
    if (!state.userId) return;
    set({ myFamilyTrip: value });
    await supabase.from('tracker_user_stats').update({ family_trip: value }).eq('user_id', state.userId);
  },
  
  setSicko: async (value: boolean) => {
    const state = get();
    if (!state.userId) return;
    set({ mySicko: value });
    await supabase.from('tracker_user_stats').update({ sicko: value }).eq('user_id', state.userId);
  },
  
  setGoofFreeDay: async (date: string | null) => {
    const state = get();
    if (!state.userId) return;
    set({ myGoofFreeDayUsed: date });
    await supabase.from('tracker_user_stats').update({ goof_free_day_used: date }).eq('user_id', state.userId);
  },
}));
