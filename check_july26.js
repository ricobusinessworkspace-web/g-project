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
  const { data: actions, error } = await supabase.from('tracker_action_entries')
    .select('*')
    .eq('user_id', 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e')
    .eq('is_cancelled', false);
    
  if (error) { console.error(error); return; }
  
  const july26Actions = actions.filter(a => {
    const d = new Date(a.timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}` === '2026-07-26';
  });
  
  console.log("Actions for July 26th:");
  let totalPoints = 0;
  july26Actions.forEach(a => {
    console.log(`- ${a.rule_id} (${new Date(a.timestamp).toISOString()}): points=${a.points_applied}`);
    totalPoints += a.points_applied;
  });
  console.log("Total points applied by these actions: " + totalPoints);
}
run();
