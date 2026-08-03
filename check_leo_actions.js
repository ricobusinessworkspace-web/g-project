import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const startOfDay = new Date('2026-07-28T00:00:00').getTime();
  const { data } = await supabase.from('tracker_action_entries').select('*').gte('timestamp', startOfDay);
  console.log(JSON.stringify(data, null, 2));
}
run();
