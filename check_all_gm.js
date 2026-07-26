import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const leoId = 'dd7b667f-1456-4805-8d47-3f6df5619ff4';
  const { data: actions } = await supabase.from('tracker_action_entries')
      .select('*')
      .eq('user_id', leoId)
      .like('id', 'gm_%');
      
  console.log('Leo GM entries:');
  for (const a of actions) {
      console.log(`- id: ${a.id}, cancelled: ${a.is_cancelled}`);
  }
}
check();
