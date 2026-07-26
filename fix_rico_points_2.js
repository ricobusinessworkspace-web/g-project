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
  
  // 1. Fix the incorrectly updated old action back to 10
  await supabase.from('tracker_action_entries')
    .update({ points_applied: 10 })
    .eq('id', '0.2772638413397104');
  console.log('Restored old action 0.2772638413397104 to 10 points.');
  
  // 2. Fix today's GM action (0.9177650836990279) to 5
  await supabase.from('tracker_action_entries')
    .update({ points_applied: 5 })
    .eq('id', '0.9177650836990279');
  console.log('Fixed today GM action 0.9177650836990279 to 5 points.');
  
  // 3. Fix my_points to 8
  await supabase.from('tracker_user_stats')
    .update({ my_points: 8 })
    .eq('user_id', userId);
  console.log('Fixed my_points to 8.');
}
run();
