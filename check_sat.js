import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSat() {
  const leoId = 'dd7b667f-1456-4805-8d47-3f6df5619ff4';
  const tsStart = new Date('2026-07-25T00:00:00+02:00').getTime();
  const tsEnd = new Date('2026-07-25T23:59:59+02:00').getTime();

  const { data: actions } = await supabase.from('tracker_action_entries')
      .select('*')
      .eq('user_id', leoId)
      .gte('timestamp', tsStart)
      .lte('timestamp', tsEnd);
      
  console.log('Leo actions on 2026-07-25:');
  for (const a of actions) {
      console.log(`- rule: ${a.rule_id}, pts: ${a.points_applied}, debt: ${a.debt_applied}, cancelled: ${a.is_cancelled}`);
  }
}
checkSat();
