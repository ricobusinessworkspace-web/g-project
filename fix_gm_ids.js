import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const ricoId = 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e';
  const leoId = 'dd7b667f-1456-4805-8d47-3f6df5619ff4';
  
  // 1. Fetch the old Rico GM
  const { data: oldGm } = await supabase.from('tracker_action_entries').select('*').eq('id', 'gm_2026-07-28').single();
  
  if (oldGm) {
    // 2. Insert Rico's GM with new ID format
    await supabase.from('tracker_action_entries').insert({
      ...oldGm,
      id: `gm_2026-07-28_${ricoId}`
    });
    // 3. Delete old GM
    await supabase.from('tracker_action_entries').delete().eq('id', 'gm_2026-07-28');
    console.log("Migrated Rico's GM to new ID format.");
  }
  
  // 4. Check if Leo has a GM with new ID
  const { data: leoGm } = await supabase.from('tracker_action_entries').select('*').eq('id', `gm_2026-07-28_${leoId}`).single();
  if (!leoGm) {
    // 5. Restore Leo's GM (guess 07:00 AM)
    const leoGmTime = new Date('2026-07-28T07:00:00').getTime();
    await supabase.from('tracker_action_entries').insert({
      id: `gm_2026-07-28_${leoId}`,
      user_id: leoId,
      rule_id: 'gm_1',
      timestamp: leoGmTime,
      points_applied: 25,
      debt_applied: 0,
      is_cancelled: false
    });
    
    // update Leo's stats
    const { data: leoStats } = await supabase.from('tracker_user_stats').select('my_points').eq('user_id', leoId).single();
    if (leoStats) {
      // he was at 5 (daily reset), now +20 sleep tax = 25
      await supabase.from('tracker_user_stats').update({ my_points: 25, last_gm_date: '2026-07-28' }).eq('user_id', leoId);
    }
    console.log("Restored Leo's GM with new ID format.");
  }
}
run();
