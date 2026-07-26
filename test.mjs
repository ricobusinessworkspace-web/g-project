import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: entries, error } = await supabase
    .from('tracker_action_entries')
    .select('*')
    .order('timestamp', { ascending: true });
  
  if (error) {
    console.error(error);
    return;
  }

  const userMap = {
    'd27931c8-c67d-419b-ab09-efbcebb12d80': 'Rico',
    'fb5fbf3c-bb4b-4b2f-9877-bb894dcb41fc': 'Leo'
  };

  for (const a of entries) {
    const d = new Date(a.timestamp);
    if (d > new Date('2026-07-19T23:00:00') && d < new Date('2026-07-24T00:00:00')) {
      console.log(`[${d.toLocaleDateString('en-CA')} ${d.toLocaleTimeString('en-GB')}] User: ${userMap[a.user_id] || a.user_id} | Rule: ${a.rule_id} | Pts: ${a.points_applied} | Debt: ${a.debt_applied} | ID: ${a.id} | Cancelled: ${a.is_cancelled}`);
    }
  }
}
check();
