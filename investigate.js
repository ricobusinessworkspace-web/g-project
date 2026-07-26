import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function investigate() {
  const ricoId = 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e';
  const leoId = 'dd7b667f-1456-4805-8d47-3f6df5619ff4';

  // 1. Leo's Monday (July 20th)
  console.log("--- LEO MONDAY (July 20) ---");
  const t1Start = new Date('2026-07-20T00:00:00+02:00').getTime();
  const t1End = new Date('2026-07-20T23:59:59+02:00').getTime();
  const { data: leoMon } = await supabase.from('tracker_action_entries')
      .select('*')
      .eq('user_id', leoId)
      .gte('timestamp', t1Start)
      .lte('timestamp', t1End);
      
  leoMon.sort((a,b) => a.timestamp - b.timestamp);
  for (const a of leoMon) {
      console.log(`- time: ${new Date(a.timestamp).toLocaleTimeString()} rule: ${a.rule_id} pts: ${a.points_applied} cancelled: ${a.is_cancelled}`);
  }

  // 2. Rico's Thursday (July 23rd)
  console.log("\n--- RICO THURSDAY (July 23) ---");
  const t2Start = new Date('2026-07-23T00:00:00+02:00').getTime();
  const t2End = new Date('2026-07-23T23:59:59+02:00').getTime();
  const { data: ricoThu } = await supabase.from('tracker_action_entries')
      .select('*')
      .eq('user_id', ricoId)
      .gte('timestamp', t2Start)
      .lte('timestamp', t2End);
      
  ricoThu.sort((a,b) => a.timestamp - b.timestamp);
  let ricoThuPoints = 5; // Base points
  for (const a of ricoThu) {
      console.log(`- time: ${new Date(a.timestamp).toLocaleTimeString()} rule: ${a.rule_id} pts: ${a.points_applied} cancelled: ${a.is_cancelled}`);
      if (!a.is_cancelled && !a.rule_id.startsWith('gm_')) {
          ricoThuPoints += a.points_applied;
      }
  }
  console.log(`Rico calculated Thursday points without GM: ${ricoThuPoints}`);
}
investigate();
