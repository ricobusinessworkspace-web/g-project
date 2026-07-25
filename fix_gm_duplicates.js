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
  const { data: entries } = await supabase
    .from('tracker_action_entries')
    .select('*')
    .eq('rule_id', 'gm_1')
    .eq('is_cancelled', false);
    
  if (!entries) {
    console.log("No entries found");
    return;
  }
  
  // Group by user_id and day
  const grouped = {};
  for (const e of entries) {
    // Determine the GM date
    const d = new Date(e.timestamp);
    d.setHours(d.getHours() - 4);
    const day = d.toISOString().split('T')[0];
    const key = `${e.user_id}_${day}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  }
  
  let toCancel = [];
  for (const key in grouped) {
    const list = grouped[key];
    if (list.length > 1) {
      // Sort by timestamp descending (keep newest)
      list.sort((a, b) => b.timestamp - a.timestamp);
      for (let i = 1; i < list.length; i++) {
        toCancel.push(list[i].id);
      }
    }
  }
  
  console.log(`Found ${toCancel.length} duplicate GM entries to cancel.`);
  
  if (toCancel.length > 0) {
    for (const id of toCancel) {
      await supabase.from('tracker_action_entries').update({ is_cancelled: true }).eq('id', id);
    }
    console.log("Duplicates cancelled successfully.");
  }
}
run();
