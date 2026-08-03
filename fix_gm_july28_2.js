import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://duzmanqvyhqurxlpxrrg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1em1hbnF2eWhxdXJ4bHB4cnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTk1NTQsImV4cCI6MjA5NDk3NTU1NH0.v7dSCQQn2T_3LHrTj4j2K5Byz3oKvuKE2zO7M9BA4Uo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const gmTime = new Date('2026-07-28T07:15:00').getTime();
  const gmActionId = 'gm_2026-07-28';
  const ricoId = 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e';
  
  // Exemption is OFF for Rico (Family Trip ended)
  let sleepTax = 20; // 5:00 (+10), 6:00 (+5), 7:00 (+5)
  let totalPoints = 5 + sleepTax; // 25
  
  const { data: currentStats } = await supabase.from('tracker_user_stats').select('my_points').eq('user_id', ricoId).single();
  const { data: currentAction } = await supabase.from('tracker_action_entries').select('points_applied').eq('id', gmActionId).single();
  
  let currentActionPoints = currentAction ? currentAction.points_applied : 0;
  
  if (currentActionPoints !== totalPoints) {
    let diff = totalPoints - currentActionPoints;
    let newPoints = (currentStats.my_points || 0) + diff;
    
    await supabase.from('tracker_action_entries').upsert({
        id: gmActionId,
        user_id: ricoId,
        rule_id: 'gm_1',
        timestamp: gmTime,
        points_applied: totalPoints,
        debt_applied: 0,
        is_cancelled: false
    });
    
    await supabase.from('tracker_user_stats').update({ my_points: newPoints, last_gm_date: '2026-07-28' }).eq('user_id', ricoId);
    console.log(`Updated Rico GM. Points: ${totalPoints}. New total points: ${newPoints}`);
  } else {
    console.log('Already correct.');
  }
}
run();
