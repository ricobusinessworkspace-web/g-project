import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://duzmanqvyhqurxlpxrrg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1em1hbnF2eWhxdXJ4bHB4cnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTk1NTQsImV4cCI6MjA5NDk3NTU1NH0.v7dSCQQn2T_3LHrTj4j2K5Byz3oKvuKE2zO7M9BA4Uo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const ricoId = 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e';
  const leoId = 'dd7b667f-1456-4805-8d47-3f6df5619ff4';
  const todayStr = '2026-07-27';
  
  // 1. Process Weekly Reset manually for today (Monday)
  const { data: users } = await supabase.from('tracker_user_stats').select('*');
  
  for (const user of users) {
    if (user.last_weekly_reset_date !== todayStr) {
       console.log(`Processing weekly reset for ${user.user_id}`);
       const removedWeekly = user.my_weekly_debt || 0;
       
       let newDebt = user.my_debt || 0;
       let newUnpaid = user.unpaid_weekly_debt || 0;
       
       if (removedWeekly < 0) {
           newDebt += removedWeekly;
       } else {
           newUnpaid += removedWeekly;
       }
       
       // Note: No late fee for today since today is Monday!
       
       await supabase.from('tracker_user_stats').update({
           my_weekly_debt: 0,
           my_debt: newDebt,
           unpaid_weekly_debt: newUnpaid,
           last_weekly_reset_date: todayStr
       }).eq('user_id', user.user_id);
       
       // Insert reset action
       const resetTime = new Date('2026-07-27T00:00:01').getTime();
       await supabase.from('tracker_action_entries').insert({
           id: Math.random().toString(),
           user_id: user.user_id,
           rule_id: 'weekly_reset',
           timestamp: resetTime,
           points_applied: 0,
           debt_applied: -removedWeekly
       });
       console.log(`Reset completed for ${user.user_id}, removed weekly: ${removedWeekly}`);
    }
  }

  // 2. Add missing GM for Rico today 4:59
  // Points: 4:59 is < 5:00, so sleepTax is 0. Base is 5. Total = 5.
  const gmTime = new Date('2026-07-27T04:59:00').getTime();
  const gmActionId = 'gm_2026-07-27';
  
  // Upsert action
  await supabase.from('tracker_action_entries').upsert({
      id: gmActionId,
      user_id: ricoId,
      rule_id: 'gm_1',
      timestamp: gmTime,
      points_applied: 5,
      debt_applied: 0,
      is_cancelled: false
  });
  
  // Update stats
  const ricoStats = users.find(u => u.user_id === ricoId);
  const newPoints = (ricoStats.my_points || 0) + 0; // wait, if myPoints was already calculated by catchUpEngine as 5, we only ADD sleepTax (0). So we don't need to add anything.
  // Wait, let's just make sure last_gm_date is set!
  await supabase.from('tracker_user_stats').update({
      last_gm_date: todayStr
  }).eq('user_id', ricoId);
  
  console.log('Fixed Rico GM');
}

run();
