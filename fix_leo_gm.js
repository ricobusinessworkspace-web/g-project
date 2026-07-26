import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLeoGM() {
  const leoId = 'dd7b667f-1456-4805-8d47-3f6df5619ff4';
  const ts = new Date('2026-07-25T07:00:00+02:00').getTime(); // arbitrary morning time

  await supabase.from('tracker_action_entries').insert({
      id: 'gm_2026-07-25_leo_fix',
      user_id: leoId,
      rule_id: 'gm_1',
      timestamp: ts,
      points_applied: 5,
      debt_applied: 0,
      is_cancelled: false
  });
  
  console.log('Inserted missing GM for Leo on Saturday!');
}
fixLeoGM();
