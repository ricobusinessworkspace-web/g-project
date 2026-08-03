import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const startOfDay = new Date(2026, 6, 27).getTime(); // July is 6 in JS
  const { data, error } = await supabase.from('tracker_action_entries')
    .select('*')
    .eq('user_id', 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e')
    .gte('timestamp', startOfDay)
    .order('timestamp', { ascending: false });
  console.log("GM Actions today:", data.filter(a => a.rule_id.startsWith('gm_')));
}
run();
