import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const leoId = 'dd7b667f-1456-4805-8d47-3f6df5619ff4';
  
  const { data: beforeStats } = await supabase.from('tracker_user_stats').select('my_weekly_debt').eq('user_id', leoId).single();
  console.log("Before:", beforeStats);

  // Insert adj_weekly
  const newEntry = {
      id: Math.random().toString(),
      user_id: leoId,
      rule_id: 'adj_weekly',
      timestamp: Date.now(),
      points_applied: 0,
      debt_applied: 5,
  };
  
  await supabase.from('tracker_action_entries').insert(newEntry);
  
  // Wait a second for trigger
  await new Promise(r => setTimeout(r, 1000));
  
  const { data: afterStats } = await supabase.from('tracker_user_stats').select('my_weekly_debt').eq('user_id', leoId).single();
  console.log("After:", afterStats);
  
  // Revert
  await supabase.from('tracker_action_entries').update({ is_cancelled: true }).eq('id', newEntry.id);
}
run();
