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
  const { data: users } = await supabase.from('tracker_users').select('*');
  const rico = users.find(u => u.id === 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e');
  const oppId = rico.opponent_id;
  console.log("Opponent ID:", oppId);
  
  const { data: actions } = await supabase.from('tracker_action_entries')
    .select('*')
    .eq('user_id', oppId)
    .eq('is_cancelled', false);
    
  const july25Actions = actions.filter(a => {
    const d = new Date(a.timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}` === '2026-07-25';
  });
  
  let totalPoints = 0;
  july25Actions.forEach(a => {
    totalPoints += a.points_applied;
  });
  console.log("Opponent total points applied on July 25:", totalPoints);
  
  // Let's also check if daily_debt_settlement was applied on July 25th
  const { data: dailySettlements } = await supabase.from('tracker_action_entries')
    .select('*')
    .eq('rule_id', 'daily_debt_settlement');
    
  dailySettlements.forEach(d => {
      console.log(`Debt Settlement: User ${d.user_id === rico.id ? 'Rico' : 'Opp'} - debt: ${d.debt_applied} at ${new Date(d.timestamp).toISOString()}`);
  });
}
run();
