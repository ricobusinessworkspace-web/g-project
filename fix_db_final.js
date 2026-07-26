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
  await supabase.from('tracker_action_entries')
    .update({ timestamp: 1784949300000 })
    .eq('id', 'gm_2026-07-25')
    .eq('user_id', 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e');

  console.log("DB reset to 5:15");
}
run();
