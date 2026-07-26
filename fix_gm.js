import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);
async function run() {
  const { data } = await supabase.from('tracker_action_entries').select('*').eq('user_id', 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e').eq('rule_id', 'gm_1');
  console.log(JSON.stringify(data, null, 2));
}
run();
