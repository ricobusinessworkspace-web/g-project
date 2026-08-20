import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { evaluateAction } from '../engine/ruleEvaluator';

export type ImpactType = 'POINTS' | 'DEBT';
export type TimeModifier = 'DOUBLE_BEFORE_6AM' | 'NONE';

export interface Rule {
  id: string;
  name: string;
  category: string;
  impact_type: ImpactType;
  base_value: number;
  iconName: string;
  requires_input?: boolean;
  input_step?: number;
  description?: string;
  time_modifier?: TimeModifier;
  daily_max?: number;
  weekly_max?: number;
  free_uses_per_week?: number;
  sort_order?: number;
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
  return getISODate(date);
};

export const getRuleUsageStats = (entries: ActionEntry[], rule?: Rule) => {
  let daily = 0, weekly = 0, monthly = 0;
  return { daily, weekly, monthly };
};

interface TrackerState {
  userId: string | null;
  userName: string | null;
  myPoints: number;
  myDebt: number; 
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
  selectedDate: string | null;
  lastGmDate: string | null;
  opponentLastSettlementDate: string | null;
  opponentLastGmDate: string | null;
  lastWeeklyResetDate: string | null;
  fetchState: (userId: string) => Promise<void>;
  setupRealtimeSync: (userId: string) => void;
  fetchRules: () => Promise<void>;
  logAction: (rule: Rule, multiplier?: number) => void;
  undoAction: (actionId: string) => void;
  logGm: (wakeTime: Date, forcedLogicalDay?: string) => void;
  updateGm: (wakeTime: Date, forcedLogicalDay?: string) => void;
  resetGm: () => void;
  addRule: (r: any) => Promise<void>;
  updateRule: (r: any) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  reorderCategoryRules: (ids: string[]) => Promise<void>;
  adjustDebt: (type: any, amount: number) => Promise<void>;
  adjustPoints: (amount: number) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  settleWeeklyDebt: () => Promise<void>;
  resetDay: () => void;
  setSharedTripAbroad: (v: boolean) => Promise<void>;
  setSharedFamilyTrip: (v: boolean) => Promise<void>;
  setSharedSicko: (v: boolean) => Promise<void>;
  setTripAbroad: (v: boolean) => Promise<void>;
  setFamilyTrip: (v: boolean) => Promise<void>;
  setSicko: (v: boolean) => Promise<void>;
  setGoofFreeDay: (d: string | null) => Promise<void>;
  setOpponentTripAbroad: (v: boolean) => Promise<void>;
  setOpponentFamilyTrip: (v: boolean) => Promise<void>;
  setOpponentSicko: (v: boolean) => Promise<void>;
  setOpponentGoofFreeDay: (d: string | null) => Promise<void>;
  recalculateTodayGms: () => Promise<void>;
  checkAndRunSettlement: () => Promise<void>;
  setOpponentPoints: (p: number) => void;
  setSelectedDate: (d: string | null) => void;
  requestDraw: () => Promise<void>;
  acceptDraw: () => Promise<void>;
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
  selectedDate: null,
  lastGmDate: null,
  opponentLastSettlementDate: null,
  opponentLastGmDate: null,
  lastWeeklyResetDate: null,

  fetchState: async (userId: string) => {
    set({ isLoading: true, userId });
    const { data: userStats } = await supabase.from('tracker_user_stats').select('*').eq('user_id', userId).maybeSingle();
    const { data: oppStats } = await supabase.from('tracker_user_stats').select('*').neq('user_id', userId).maybeSingle();
    const todayStr = getLogicalDate(new Date());
    const { data: globalDay } = await supabase.from('g_global_days').select('*').eq('date', todayStr).maybeSingle();
    const { data: myWeekly } = await supabase.from('g_weekly_settlements').select('amount').eq('user_id', userId).eq('status', 'OPEN');
    const { data: oppWeekly } = await supabase.from('g_weekly_settlements').select('amount').eq('user_id', oppStats?.user_id).eq('status', 'OPEN');
    const { data: myDaily } = await supabase.from('g_daily_results').select('*').eq('user_id', userId).eq('date', todayStr).maybeSingle();
    const { data: oppDaily } = await supabase.from('g_daily_results').select('*').eq('user_id', oppStats?.user_id).eq('date', todayStr).maybeSingle();
    const { data: logs } = await supabase.from('g_action_logs').select('*').eq('date', todayStr).eq('is_correction', false);

    const mapLogs = (logsArr: any[], uId: string) => {
      return logsArr.filter(l => l.user_id === uId).map(l => ({
        id: l.id,
        rule_id: l.rule_id,
        timestamp: new Date(l.created_at).getTime(),
        points_applied: l.points_calculated,
        debt_applied: l.money_calculated,
        is_cancelled: false
      }));
    };

    set({
      myTotalDebt: userStats?.my_total_debt || 0,
      myWeeklyDebt: myWeekly?.[0]?.amount || 0,
      myPoints: myDaily ? myDaily.final_score : 5,
      userName: userStats?.name || '',
      mySicko: globalDay?.is_sick || false,
      lastGmDate: userStats?.last_gm_date || null,
      lastWeeklyResetDate: userStats?.last_weekly_reset_date || null,
      opponentUserId: oppStats?.user_id || null,
      opponentTotalDebt: oppStats?.my_total_debt || 0,
      opponentWeeklyDebt: oppWeekly?.[0]?.amount || 0,
      opponentPoints: oppDaily ? oppDaily.final_score : 5,
      opponentName: oppStats?.name || 'Opponent',
      opponentSicko: globalDay?.is_sick || false,
      opponentLastSettlementDate: oppStats?.last_settlement_date || null,
      opponentLastGmDate: oppStats?.last_gm_date || null,
      actionEntries: mapLogs(logs || [], userId),
      opponentActionEntries: mapLogs(logs || [], oppStats?.user_id || ''),
      isLoading: false
    });
    get().recalculateTodayGms();
  },

  setupRealtimeSync: (userId: string) => set({ isOnline: true }),

  fetchRules: async () => {
    const { data } = await supabase.from('g_rules').select('*').eq('is_active', true).order('sort_order');
    if (data) {
      const mapped = data.map((r: any) => {
        let cat = r.category;
        if (cat === 'REOCCURRING') cat = 'REOCCURING';
        if (cat === 'DEBT_REDUCTION') cat = 'ABBAUEN';
        return {
          id: r.id,
          name: r.name,
          category: cat,
          impact_type: r.money_value != 0 ? 'DEBT' : 'POINTS',
          base_value: r.money_value != 0 ? r.money_value : r.points,
          iconName: r.icon_name || 'Circle',
          requires_input: r.unit_size ? true : false,
          input_step: r.unit_size ? Number(r.unit_size) : 1,
          daily_max: r.cap_type === 'DAILY' ? Math.abs(r.cap_value || 0) : undefined,
          weekly_max: r.cap_type === 'WEEKLY' ? Math.abs(r.cap_value || 0) : undefined,
          sort_order: r.sort_order || 0
        };
      });
      set({ rules: mapped as Rule[] });
    }
  },

  recalculateTodayGms: async () => {
    const state = get();
    let myLive = 5;
    for (const log of state.actionEntries) myLive += log.points_applied;
    let oppLive = 5;
    for (const log of state.opponentActionEntries) oppLive += log.points_applied;
    set({ myPoints: Math.max(0, myLive), opponentPoints: Math.max(0, oppLive) });
  },

  logAction: async (rule: Rule, multiplier = 1) => {
    const state = get();
    if (!state.userId) return;
    const todayStr = getLogicalDate(new Date());

    let gRule;
    if (rule.id === 'fallback_gm_id') {
       // Search by name in DB if we don't have the real ID
       const { data } = await supabase.from('g_rules').select('*').eq('system_id', 'sys_gm').maybeSingle();
       if (!data) {
           console.error("GM rule not found in DB! Please run the seed data SQL.");
           return;
       }
       gRule = data;
       rule.id = gRule.id; // Correct the ID so the UI rule matches the DB rule
    } else {
       const { data } = await supabase.from('g_rules').select('*').eq('id', rule.id).single();
       gRule = data;
    }
    
    if (!gRule) return;

    const { data: todaysLogs } = await supabase.from('g_action_logs').select('*').eq('user_id', state.userId).eq('rule_id', rule.id).eq('date', todayStr);

    const evaluation = evaluateAction(gRule, multiplier, new Date(), todaysLogs || []);

    const { data: newLog } = await supabase.from('g_action_logs').insert({
      user_id: state.userId,
      rule_id: rule.id,
      date: todayStr,
      amount: multiplier,
      points_calculated: evaluation.points_calculated,
      money_calculated: evaluation.money_calculated
    }).select().single();

    if (newLog) {
      const mappedAction = {
        id: newLog.id,
        rule_id: newLog.rule_id,
        timestamp: new Date(newLog.created_at).getTime(),
        points_applied: newLog.points_calculated,
        debt_applied: newLog.money_calculated,
        is_cancelled: false
      };
      set({ actionEntries: [...state.actionEntries, mappedAction] });
      get().recalculateTodayGms();
    }
  },

  undoAction: async (actionId: string) => {
    await supabase.from('g_action_logs').delete().eq('id', actionId);
    const state = get();
    set({ actionEntries: state.actionEntries.filter(a => a.id !== actionId) });
    get().recalculateTodayGms();
  },

  logGm: async (wakeTime: Date) => {
    const state = get();
    if (!state.userId) return;
    
    // Fallback: If for some reason GM isn't in state.rules, we create a dummy one that evaluateAction can parse
    let gmRule = state.rules.find(r => r.name === 'GM' || (r.category === 'MANDATORY' && r.name.includes('GM')));
    
    if (!gmRule) {
       const { data } = await supabase.from('g_rules').select('*').eq('system_id', 'sys_gm').maybeSingle();
       if (data) {
           gmRule = { 
               id: data.id, 
               name: data.name, 
               category: data.category as string, 
               impact_type: 'POINTS', 
               base_value: data.points, 
               iconName: data.icon_name || 'Sun' 
           };
       }
    }
    
    if (!gmRule) return;

    const existingGm = state.actionEntries.find(a => a.rule_id === gmRule?.id);
    if (existingGm) await get().undoAction(existingGm.id);
    
    // Also update tracker_user_stats for the dashboard UI
    const todayStr = getLogicalDate(wakeTime);
    await supabase.from('tracker_user_stats').update({ last_gm_date: todayStr }).eq('user_id', state.userId);
    set({ lastGmDate: todayStr });
    
    await get().logAction(gmRule, 1);
  },

  updateGm: async (wakeTime: Date) => get().logGm(wakeTime),
  resetGm: () => {},
  
  addRule: async () => {}, updateRule: async () => {}, deleteRule: async () => {},
  reorderCategoryRules: async () => {}, adjustDebt: async () => {}, adjustPoints: async () => {},
  updateName: async () => {}, settleWeeklyDebt: async () => {}, resetDay: () => {},
  setSharedTripAbroad: async () => {}, setSharedFamilyTrip: async () => {}, setSharedSicko: async () => {},
  setTripAbroad: async () => {}, setFamilyTrip: async () => {}, setSicko: async () => {},
  setGoofFreeDay: async () => {}, setOpponentTripAbroad: async () => {}, setOpponentFamilyTrip: async () => {},
  setOpponentSicko: async () => {}, setOpponentGoofFreeDay: async () => {}, checkAndRunSettlement: async () => {},
  setOpponentPoints: () => {}, setSelectedDate: () => {}, requestDraw: async () => {}, acceptDraw: async () => {}
}));
