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
  
  await supabase.from('tracker_user_stats')
    .update({ my_points: 3 })
    .eq('user_id', userId);
  console.log('Fixed my_points to 3.');
}
run();
