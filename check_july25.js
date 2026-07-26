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
  
  // Filter for actions on 2026-07-25
  // Note: timestamps are in ms. We can convert to date string.
  const july25Actions = actions.filter(a => {
    const d = new Date(a.timestamp);
    // getLogicalDate equivalent
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}` === '2026-07-25';
  });
  
  console.log("Actions for July 25th:");
  let totalPoints = 0;
  july25Actions.forEach(a => {
    console.log(`- ${a.rule_id} (${new Date(a.timestamp).toISOString()}): points=${a.points_applied} (debt=${a.debt_applied})`);
    totalPoints += a.points_applied;
  });
  console.log("Total points applied by these actions: " + totalPoints);
  
  const { data: stats } = await supabase.from('tracker_user_stats').select('*').eq('user_id', 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e');
  console.log("Current user points in DB:", stats[0].my_points);
}
run();
