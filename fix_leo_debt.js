import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const leoId = 'dd7b667f-1456-4805-8d47-3f6df5619ff4';
  
  // Leo's weekly debt should be -10
  await supabase.from('tracker_user_stats').update({ my_weekly_debt: -10 }).eq('user_id', leoId);
  console.log("Fixed Leo's weekly debt to -10.");
}
run();
