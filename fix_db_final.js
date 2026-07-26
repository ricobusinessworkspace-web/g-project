import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  const ricoId = 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e';
  const leoId = 'dd7b667f-1456-4805-8d47-3f6df5619ff4';

  const { data: entries } = await supabase
    .from('tracker_action_entries')
    .select('*')
    .gte('timestamp', new Date('2026-07-20T00:00:00Z').getTime())
    .lte('timestamp', new Date('2026-07-26T23:59:59Z').getTime());

  let fixedEntries = [...entries];

  const invalidRicoGM = fixedEntries.find(e => e.id === '0.22250695251785713');
  if (invalidRicoGM) {
    console.log('REAL: Deleting invalid Rico GM on Monday...');
    await supabase.from('tracker_action_entries').delete().eq('id', invalidRicoGM.id);
    fixedEntries = fixedEntries.filter(e => e.id !== '0.22250695251785713');
  }

  const leoGM = fixedEntries.find(e => e.id === '0.8745648850291197');
  if (leoGM && leoGM.is_cancelled) {
    console.log('REAL: Restoring Leo GM on Tuesday...');
    await supabase.from('tracker_action_entries').update({ is_cancelled: false }).eq('id', leoGM.id);
    leoGM.is_cancelled = false;
  }

  const leoAdj = fixedEntries.find(e => e.id === '0.7625659798362212');
  if (leoAdj) {
    console.log('REAL: Deleting Leo adj_points -5 on Tuesday...');
    await supabase.from('tracker_action_entries').delete().eq('id', leoAdj.id);
    fixedEntries = fixedEntries.filter(e => e.id !== '0.7625659798362212');
  }

  const getDayData = (uid, dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const start = new Date(y, m - 1, d).getTime();
    const end = start + 86400000;
    const actions = fixedEntries.filter(a => a.user_id === uid && a.timestamp >= start && a.timestamp < end && !a.is_cancelled);
    
    let totalPoints = 5;
    let settlementAction = null;
    for (const a of actions) {
        if (a.rule_id && a.rule_id.startsWith('gm_')) {
            totalPoints += Math.max(0, a.points_applied - 5);
        } else if (a.rule_id !== 'daily_debt_settlement') {
            totalPoints += a.points_applied;
        } else {
            settlementAction = a;
        }
    }
    return { totalPoints, settlementAction };
  };

  // Skip 2026-07-26 since it hasn't ended yet
  const datesToFix = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24', '2026-07-25'];
  
  let ricoDebtDelta = 0;
  let leoDebtDelta = 0;
  
  for (const dateStr of datesToFix) {
      const ricoData = getDayData(ricoId, dateStr);
      const leoData = getDayData(leoId, dateStr);
      
      let myComputed = Math.max(0, ricoData.totalPoints);
      let oppComputed = Math.max(0, leoData.totalPoints);
      let diff = myComputed - oppComputed;
      
      let expectedPenalty = 0;
      let loserId = null;
      let absDiff = Math.abs(diff);
      
      if (absDiff > 0 && absDiff <= 9) expectedPenalty = 5;
      else if (absDiff >= 10 && absDiff <= 19) expectedPenalty = 10;
      else if (absDiff >= 20) expectedPenalty = 15;
      
      if (expectedPenalty > 0) {
          loserId = diff > 0 ? ricoId : leoId; 
      }
      
      const ricoExisting = ricoData.settlementAction ? ricoData.settlementAction.debt_applied : 0;
      const leoExisting = leoData.settlementAction ? leoData.settlementAction.debt_applied : 0;
      
      const ricoExpected = loserId === ricoId ? expectedPenalty : 0;
      const leoExpected = loserId === leoId ? expectedPenalty : 0;
      
      if (ricoExisting !== ricoExpected) {
          console.log(`REAL: Fixing Rico Penalty on ${dateStr} from ${ricoExisting} to ${ricoExpected}`);
          if (ricoData.settlementAction) {
              await supabase.from('tracker_action_entries').update({ debt_applied: ricoExpected }).eq('id', ricoData.settlementAction.id);
          } else if (ricoExpected > 0) {
              const [y, m, d] = dateStr.split('-').map(Number);
              const ts = new Date(y, m - 1, d).getTime() + 86400000 - 1000;
              await supabase.from('tracker_action_entries').insert({
                  id: Math.random().toString(), user_id: ricoId, rule_id: 'daily_debt_settlement', timestamp: ts, points_applied: 0, debt_applied: ricoExpected
              });
          }
          ricoDebtDelta += (ricoExpected - ricoExisting);
      }
      
      if (leoExisting !== leoExpected) {
          console.log(`REAL: Fixing Leo Penalty on ${dateStr} from ${leoExisting} to ${leoExpected}`);
          if (leoData.settlementAction) {
              await supabase.from('tracker_action_entries').update({ debt_applied: leoExpected }).eq('id', leoData.settlementAction.id);
          } else if (leoExpected > 0) {
              const [y, m, d] = dateStr.split('-').map(Number);
              const ts = new Date(y, m - 1, d).getTime() + 86400000 - 1000;
              await supabase.from('tracker_action_entries').insert({
                  id: Math.random().toString(), user_id: leoId, rule_id: 'daily_debt_settlement', timestamp: ts, points_applied: 0, debt_applied: leoExpected
              });
          }
          leoDebtDelta += (leoExpected - leoExisting);
      }
  }
  
  if (ricoDebtDelta !== 0) {
      console.log(`REAL: Updating Rico Stats total/weekly debt by delta=${ricoDebtDelta}`);
      const { data: ricoStats } = await supabase.from('tracker_user_stats').select('*').eq('user_id', ricoId).single();
      await supabase.from('tracker_user_stats').update({
          total_debt: ricoStats.total_debt + ricoDebtDelta,
          weekly_debt: ricoStats.weekly_debt + ricoDebtDelta
      }).eq('user_id', ricoId);
  }
  
  if (leoDebtDelta !== 0) {
      console.log(`REAL: Updating Leo Stats total/weekly debt by delta=${leoDebtDelta}`);
      const { data: leoStats } = await supabase.from('tracker_user_stats').select('*').eq('user_id', leoId).single();
      await supabase.from('tracker_user_stats').update({
          total_debt: leoStats.total_debt + leoDebtDelta,
          weekly_debt: leoStats.weekly_debt + leoDebtDelta
      }).eq('user_id', leoId);
  }
  
  console.log('Done!');
}
fix();
