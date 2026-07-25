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
  const d = new Date();
  d.setHours(d.getHours() - 4);
  const today = d.toISOString().split('T')[0];
  
  const { data: actions } = await supabase.from('tracker_action_entries')
    .select('*')
    .eq('rule_id', 'gm_1')
    
  console.log("\nALL GM Actions for Today (cancelled or not):");
  const todayActions = actions.filter(a => {
    const ad = new Date(a.timestamp);
    ad.setHours(ad.getHours() - 4);
    return ad.toISOString().split('T')[0] === today;
  });
  console.log(JSON.stringify(todayActions, null, 2));
}
run();
