import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function printBreakdown() {
  const ricoId = 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e';

  const { data: users } = await supabase.from('tracker_user_stats').select('*');
  const ricoStats = users.find(u => u.user_id === ricoId);
  const myResetTimestamp = ricoStats.last_weekly_reset_date ? new Date(ricoStats.last_weekly_reset_date).getTime() : 0;

  const { data: allActions } = await supabase.from('tracker_action_entries').select('*');
  const { data: rules } = await supabase.from('tracker_rules').select('*');
  
  const isTotalDebtRule = (rule_id) => {
    if (rule_id === 'adj_total' || rule_id === 'ab_3') return true;
    const rule = rules.find(r => r.id === rule_id);
    return rule?.category === 'ABBAUEN';
  };

  const actions = allActions.filter(a => 
      a.user_id === ricoId && 
      !a.is_cancelled && 
      a.timestamp > myResetTimestamp &&
      a.rule_id !== 'weekly_reset' && 
      a.rule_id !== 'adj_total' && 
      a.rule_id !== 'late_fee' && 
      !isTotalDebtRule(a.rule_id) &&
      a.debt_applied !== 0
  );
  
  actions.sort((a, b) => b.timestamp - a.timestamp);

  let sum = 0;
  for (const a of actions) {
      console.log(`[${new Date(a.timestamp).toLocaleString()}] Rule: ${a.rule_id}, Debt: ${a.debt_applied}`);
      sum += a.debt_applied;
  }
  console.log(`Total: ${sum}`);
}
printBreakdown();
