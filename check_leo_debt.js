import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const leoId = 'dd7b667f-1456-4805-8d47-3f6df5619ff4';
  
  const { data: stats } = await supabase.from('tracker_user_stats').select('my_debt, my_weekly_debt, my_total_debt').eq('user_id', leoId).single();
  console.log("Leo Stats:", stats);

  const { data: actions } = await supabase.from('tracker_action_entries')
    .select('*')
    .eq('user_id', leoId)
    .neq('debt_applied', 0)
    .order('timestamp', { ascending: false })
    .limit(10);
    
  console.log("Leo Debt Actions:", JSON.stringify(actions, null, 2));
}
run();
