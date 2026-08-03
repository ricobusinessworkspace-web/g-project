import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const leoId = 'dd7b667f-1456-4805-8d47-3f6df5619ff4';
  const { data } = await supabase.from('tracker_action_entries').select('*').eq('user_id', leoId).order('timestamp', { ascending: false }).limit(5);
  console.log(JSON.stringify(data, null, 2));
}
run();
