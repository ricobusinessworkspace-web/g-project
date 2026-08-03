import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const leoId = 'dd7b667f-1456-4805-8d47-3f6df5619ff4';
  const newWakeTime = new Date('2026-07-28T08:35:00').getTime();
  const newPointsApplied = 30; // 5 base + 10(5am) + 5(6am) + 5(7am) + 5(8am)
  
  // 1. Update action entry
  const { data: leoGm } = await supabase.from('tracker_action_entries').select('*').eq('id', `gm_2026-07-28_${leoId}`).single();
  if (leoGm) {
    const diff = newPointsApplied - leoGm.points_applied; // 30 - 25 = 5
    await supabase.from('tracker_action_entries').update({
      timestamp: newWakeTime,
      points_applied: newPointsApplied
    }).eq('id', `gm_2026-07-28_${leoId}`);
    
    // 2. Update user stats
    const { data: stats } = await supabase.from('tracker_user_stats').select('my_points').eq('user_id', leoId).single();
    if (stats) {
      await supabase.from('tracker_user_stats').update({
        my_points: stats.my_points + diff
      }).eq('user_id', leoId);
    }
    console.log(`Updated Leo's GM to 08:35 (Points applied: 30). Total points updated by +${diff}.`);
  } else {
    console.log("Could not find Leo's GM entry.");
  }
}
run();
