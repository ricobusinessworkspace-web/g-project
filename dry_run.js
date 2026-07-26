import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRun() {
  const ricoId = 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e';
  const leoId = 'dd7b667f-1456-4805-8d47-3f6df5619ff4';

  const { data: users } = await supabase.from('tracker_user_stats').select('*');
  const ricoStats = users.find(u => u.user_id === ricoId);
  const leoStats = users.find(u => u.user_id === leoId);

  console.log(`CURRENT STATE (SUNDAY EVENING)`);
  console.log(`Rico - Weekly Debt: ${ricoStats.my_weekly_debt}€, Unpaid Weekly Debt: ${ricoStats.unpaid_weekly_debt || 0}€`);
  console.log(`Leo  - Weekly Debt: ${leoStats.my_weekly_debt}€, Unpaid Weekly Debt: ${leoStats.unpaid_weekly_debt || 0}€`);
  console.log(`Rico Points: ${ricoStats.my_points}, Leo Points: ${leoStats.my_points}`);

  // 1. Calculate Sunday's Penalty
  let diff = ricoStats.my_points - leoStats.my_points;
  let absDiff = Math.abs(diff);
  let expectedPenalty = 0;
  
  if (absDiff > 0 && absDiff <= 9) expectedPenalty = 5;
  else if (absDiff >= 10 && absDiff <= 19) expectedPenalty = 10;
  else if (absDiff >= 20) expectedPenalty = 15;
  
  const loserId = diff > 0 ? ricoId : (diff < 0 ? leoId : null);
  
  console.log(`\n--- STEP 1: SUNDAY SETTLEMENT (Midnight) ---`);
  if (loserId === ricoId) {
      console.log(`Rico lost Sunday (Diff: ${absDiff} pts). Rico gets +${expectedPenalty}€ Penalty.`);
      ricoStats.my_weekly_debt += expectedPenalty;
  } else if (loserId === leoId) {
      console.log(`Leo lost Sunday (Diff: ${absDiff} pts). Leo gets +${expectedPenalty}€ Penalty.`);
      leoStats.my_weekly_debt += expectedPenalty;
  } else {
      console.log(`Tie on Sunday! No penalty.`);
  }

  console.log(`\n--- STEP 2: MONDAY WEEKLY RESET ---`);
  console.log(`Triggered when tracking the first action on Monday.`);
  
  let ricoRemoved = ricoStats.my_weekly_debt;
  let ricoUnpaidNew = ricoStats.unpaid_weekly_debt || 0;
  let ricoDebtNew = ricoStats.my_debt || 0;
  
  if (ricoRemoved < 0) {
      ricoDebtNew += ricoRemoved;
      console.log(`Rico had negative weekly debt (${ricoRemoved}€). This directly reduces his Total Debt!`);
  } else {
      ricoUnpaidNew += ricoRemoved;
      console.log(`Rico has positive weekly debt (${ricoRemoved}€). This is moved to UNPAID WEEKLY DEBT.`);
  }
  ricoStats.my_weekly_debt = 0;

  let leoRemoved = leoStats.my_weekly_debt;
  let leoUnpaidNew = leoStats.unpaid_weekly_debt || 0;
  let leoDebtNew = leoStats.my_debt || 0;

  if (leoRemoved < 0) {
      leoDebtNew += leoRemoved;
      console.log(`Leo had negative weekly debt (${leoRemoved}€). This directly reduces his Total Debt!`);
  } else {
      leoUnpaidNew += leoRemoved;
      console.log(`Leo has positive weekly debt (${leoRemoved}€). This is moved to UNPAID WEEKLY DEBT.`);
  }
  leoStats.my_weekly_debt = 0;

  console.log(`\nFINAL STATE (MONDAY MORNING)`);
  console.log(`Rico - Weekly Debt: 0€, Unpaid Weekly Debt: ${ricoUnpaidNew}€ (Has 24h to pay or gets Late Fees)`);
  console.log(`Leo  - Weekly Debt: 0€, Unpaid Weekly Debt: ${leoUnpaidNew}€ (Has 24h to pay or gets Late Fees)`);
}
testRun();
