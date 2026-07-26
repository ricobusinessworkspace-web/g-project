import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
let url = '';
let key = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function run() {
  const userId = 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e'; // Rico
  
  const { data: stats } = await supabase.from('tracker_user_stats').select('*').eq('user_id', userId).single();
  console.log("Stats:", JSON.stringify(stats, null, 2));
  
  const { data: actions } = await supabase.from('tracker_action_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('is_cancelled', false)
    .order('timestamp', { ascending: false })
    .limit(10);
    
  console.log("Recent Actions:", JSON.stringify(actions, null, 2));
}
run();
