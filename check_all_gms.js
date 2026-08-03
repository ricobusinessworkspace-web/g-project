import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data } = await supabase.from('tracker_action_entries').select('*').eq('rule_id', 'gm_1').order('timestamp', { ascending: false }).limit(10);
  console.log(JSON.stringify(data, null, 2));
}
run();
