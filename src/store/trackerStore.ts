import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { CODE_OF_HONOR } from '../constants/rules';

export type ImpactType = 'POINTS' | 'DEBT';
export type TimeModifier = 'DOUBLE_BEFORE_6AM' | 'NONE';

export interface Rule {
  id: string;
  name: string;
  category: 'REOCCURING' | 'ONCE_DAILY' | 'SLEEP_TAXES' | 'EXERCISE' | 'RECREATIONAL' | 'SALES' | 'PERSONAL' | 'MANDATORY' | 'ABBAUEN' | 'GN' | 'GM';
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
      });
    }


    const { data: actionsData, error: actionsError } = await supabase.from('tracker_action_entries')
      .select('*')
      .gte('timestamp', startOfLogicalDay);
      
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
    if (!state.userId) return;

    const now = new Date();
    const todayStr = getLogicalDate(now);
    const dayOfWeek = now.getDay();

    let updates: any = {};
    let localUpdates: any = {};

    if (state.lastSettlementDate && state.lastSettlementDate !== todayStr) {
      const isExempt = state.myTripAbroad || state.opponentTripAbroad || 
                       state.mySicko || state.opponentSicko || 
                       state.myGoofFreeDayUsed === state.lastSettlementDate || 
                       state.opponentGoofFreeDayUsed === state.lastSettlementDate;
                       
      let newDebt = 0;
      if (!isExempt) {
        const diff = state.myPoints - state.opponentPoints;
        if (diff > 0 && diff <= 9) newDebt = 5;
        else if (diff >= 10 && diff <= 19) newDebt = 10;
        else if (diff >= 20) newDebt = 15;
      }

      const newWeeklyDebt = state.myWeeklyDebt + newDebt;

      updates.last_settlement_date = todayStr;
      updates.my_points = 5;
      updates.my_debt = state.myDebt + newDebt;
      updates.my_weekly_debt = newWeeklyDebt;

      Object.assign(localUpdates, {
        lastSettlementDate: todayStr,
        myPoints: 5,
        myDebt: state.myDebt + newDebt,
        myWeeklyDebt: newWeeklyDebt
      });
    } else if (!state.lastSettlementDate) {
      updates.last_settlement_date = todayStr;
      localUpdates.lastSettlementDate = todayStr;
    }

    let currentWeeklyDebt = localUpdates.myWeeklyDebt ?? state.myWeeklyDebt;
    let currentUnpaid = localUpdates.myUnpaidWeeklyDebt ?? state.myUnpaidWeeklyDebt;

    const getMostRecentMonday = (d: Date) => {
      const dCopy = new Date(d);
      const day = dCopy.getDay();
      const diff = dCopy.getDate() - day + (day === 0 ? -6 : 1);
      return getISODate(new Date(dCopy.setDate(diff)));
    };
    
    const recentMondayStr = getMostRecentMonday(now);

    if (state.lastWeeklyResetDate !== recentMondayStr) {
      currentUnpaid += currentWeeklyDebt;
      currentWeeklyDebt = 0;

      updates.last_weekly_reset_date = recentMondayStr;
      updates.my_weekly_debt = 0;
      updates.unpaid_weekly_debt = currentUnpaid;

      Object.assign(localUpdates, {
        lastWeeklyResetDate: recentMondayStr,
        myWeeklyDebt: 0,
        myUnpaidWeeklyDebt: currentUnpaid
      });
    }

    if (currentUnpaid > 0) {
       if (dayOfWeek !== 1) { // Apply stacking penalty every day except Monday
          if (state.lastLatePayDate !== todayStr) {
             currentUnpaid += 5; 
             
             updates.last_late_pay_date = todayStr;
             updates.unpaid_weekly_debt = currentUnpaid;

             Object.assign(localUpdates, {
                lastLatePayDate: todayStr,
                myUnpaidWeeklyDebt: currentUnpaid
             });
          }
       }
    } else {
       if (state.lastLatePayDate !== null) {
          updates.last_late_pay_date = null;
          localUpdates.lastLatePayDate = null;
       }
    }

    if (Object.keys(updates).length > 0) {
      set({ ...localUpdates });
      const { error } = await supabase.from('tracker_user_stats').update(updates).eq('user_id', state.userId);
      if (error) alert('Settlement Update Error: ' + error.message);
    }
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

    const timestamp = Date.now();

    const newEntry: ActionEntry = {
      id: Math.random().toString(),
      rule_id: rule.id,
      timestamp: timestamp,
      points_applied: pointsToApply,
      debt_applied: debtToApply,
    };

    set({
      myPoints: get().myPoints + pointsToApply,
      myDebt: get().myDebt + debtToApply,
      myWeeklyDebt: get().myWeeklyDebt + debtToApply,
      actionEntries: [...get().actionEntries, newEntry],
    });

    const { error: insertActionErr } = await supabase.from('tracker_action_entries').insert({
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
      .eq('timestamp', entry.timestamp);

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
