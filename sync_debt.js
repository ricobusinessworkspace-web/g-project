import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncWeeklyDebt() {
  const ricoId = 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e';
  const leoId = 'dd7b667f-1456-4805-8d47-3f6df5619ff4';

  const { data: users } = await supabase.from('tracker_user_stats').select('*');
  const ricoStats = users.find(u => u.user_id === ricoId);
  const leoStats = users.find(u => u.user_id === leoId);

  const myResetTimestamp = ricoStats.last_weekly_reset_date ? new Date(ricoStats.last_weekly_reset_date).getTime() : 0;
  const oppResetTimestamp = leoStats.last_weekly_reset_date ? new Date(leoStats.last_weekly_reset_date).getTime() : 0;

  const { data: allActions } = await supabase.from('tracker_action_entries').select('*');

  const calcWeeklyDebt = (userId, resetTimestamp) => {
      const actions = allActions.filter(a => 
          a.user_id === userId && 
          !a.is_cancelled && 
          a.timestamp > resetTimestamp &&
          a.rule_id !== 'weekly_reset' && 
          a.rule_id !== 'adj_total' && 
          a.rule_id !== 'late_fee' && 
          a.rule_id !== 'ab_3' // Wait, what about ABBAUEN category? 
          // I should fetch rules to check category
      );
      return actions;
  };

  const { data: rules } = await supabase.from('tracker_rules').select('*');
  
  const isTotalDebtRule = (rule_id) => {
    if (rule_id === 'adj_total' || rule_id === 'ab_3') return true;
    const rule = rules.find(r => r.id === rule_id);
    return rule?.category === 'ABBAUEN';
  };

  const calcFinal = (userId, resetTimestamp) => {
      const actions = allActions.filter(a => 
          a.user_id === userId && 
          !a.is_cancelled && 
          a.timestamp > resetTimestamp &&
          a.rule_id !== 'weekly_reset' && 
          a.rule_id !== 'adj_total' && 
          a.rule_id !== 'late_fee' && 
          !isTotalDebtRule(a.rule_id)
      );
      const sum = actions.reduce((acc, curr) => acc + curr.debt_applied, 0);
      return { sum, actions };
  };

  const ricoResult = calcFinal(ricoId, myResetTimestamp);
  const leoResult = calcFinal(leoId, oppResetTimestamp);

  console.log(`Rico DB weekly_debt: ${ricoStats.weekly_debt} | Calculated Sum: ${ricoResult.sum}`);
  console.log(`Leo DB weekly_debt: ${leoStats.weekly_debt} | Calculated Sum: ${leoResult.sum}`);

  if (ricoStats.weekly_debt !== ricoResult.sum) {
      console.log('Fixing Rico weekly_debt...');
      await supabase.from('tracker_user_stats').update({ my_weekly_debt: ricoResult.sum }).eq('user_id', ricoId);
  }
  
  if (leoStats.weekly_debt !== leoResult.sum) {
      console.log('Fixing Leo weekly_debt...');
      await supabase.from('tracker_user_stats').update({ my_weekly_debt: leoResult.sum }).eq('user_id', leoId);
  }
  console.log('Done!');
}
syncWeeklyDebt();
