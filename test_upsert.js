import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const gmTime = new Date('2026-07-28T07:15:00').getTime();
  const gmActionId = 'gm_2026-07-28';
  const ricoId = 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e';
  
  const { data, error } = await supabase.from('tracker_action_entries').upsert({
      id: gmActionId,
      user_id: ricoId,
      rule_id: 'gm_1',
      timestamp: gmTime,
      points_applied: 5,
      debt_applied: 0,
      is_cancelled: false
  });
  console.log("Upsert error:", error);
}
run();
