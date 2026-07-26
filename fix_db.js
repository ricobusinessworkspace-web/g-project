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
    fixedEntries = fixedEntries.filter(e => e.id !== '0.22250695251785713');
  }

  const leoGM = fixedEntries.find(e => e.id === '0.8745648850291197');
  if (leoGM && leoGM.is_cancelled) {
    leoGM.is_cancelled = false;
  }

  const leoAdj = fixedEntries.find(e => e.id === '0.7625659798362212');
  if (leoAdj) {
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

  const datesToFix = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24', '2026-07-25', '2026-07-26'];
  
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
      
      console.log(`${dateStr} | Rico: ${ricoData.totalPoints} -> ${myComputed} (Debt ${ricoExisting}->${ricoExpected}) | Leo: ${leoData.totalPoints} -> ${oppComputed} (Debt ${leoExisting}->${leoExpected}) | Diff: ${diff}`);
  }
}
fix();
