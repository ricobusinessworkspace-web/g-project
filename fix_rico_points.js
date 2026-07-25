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
  
  // Fetch current user stats
  const { data: stats } = await supabase.from('tracker_user_stats').select('my_points').eq('user_id', userId).single();
  console.log(`Current points: ${stats.my_points}`);
  
  // Reduce by 10
  const newPoints = stats.my_points - 10;
  await supabase.from('tracker_user_stats').update({ my_points: newPoints }).eq('user_id', userId);
  console.log(`Updated points to: ${newPoints}`);
  
  // Find the gm_1 action
  const { data: actions } = await supabase.from('tracker_action_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('rule_id', 'gm_1')
    .eq('is_cancelled', false);
    
  // Keep the one from today
  const todayAction = actions.find(a => a.points_applied === 10);
  if (todayAction) {
    await supabase.from('tracker_action_entries').update({ points_applied: 5 }).eq('id', todayAction.id);
    console.log(`Updated GM action ${todayAction.id} to 5 points (base 5 + 0 tax).`);
  }
}
run();
