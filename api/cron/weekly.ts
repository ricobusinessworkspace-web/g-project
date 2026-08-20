import { supabaseAdmin } from '../_utils/supabaseAdmin';
import { processWeeklyReset } from '../../src/engine/weeklySettlement';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const now = new Date();
    // Monday date string
    const newWeekStartDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    // Get all open settlements for the week that just ended
    // Since it's Monday 00:00, any OPEN settlement with week_start_date < today is the past week.
    const { data: oldSettlements, error: osErr } = await supabaseAdmin
      .from('g_weekly_settlements')
      .select('*')
      .eq('status', 'OPEN')
      .lt('week_start_date', newWeekStartDate);

    if (osErr) throw new Error('Could not fetch open settlements');

    if (!oldSettlements || oldSettlements.length === 0) {
      return res.status(200).json({ success: true, message: 'No past open settlements found' });
    }

    const output = processWeeklyReset(oldSettlements, newWeekStartDate);

    // 1. Mark paid for negative balances
    if (output.settlementsToMarkPaid.length > 0) {
      await supabaseAdmin.from('g_weekly_settlements')
        .update({ status: 'PAID' })
        .in('id', output.settlementsToMarkPaid);
    }

    // 2. Reduce Total Dept
    for (const reduction of output.totalDeptReductions) {
      // Assuming tracker_user_stats holds my_total_debt
      const { data: stats } = await supabaseAdmin.from('tracker_user_stats').select('my_total_debt').eq('user_id', reduction.user_id).single();
      if (stats) {
        const newTotal = Number(stats.my_total_debt) - reduction.amount;
        await supabaseAdmin.from('tracker_user_stats').update({ my_total_debt: newTotal }).eq('user_id', reduction.user_id);
      }
    }

    // 3. Create new weekly settlements
    if (output.newWeeklySettlements.length > 0) {
      await supabaseAdmin.from('g_weekly_settlements').insert(
        output.newWeeklySettlements.map(s => ({
          user_id: s.user_id,
          week_start_date: s.week_start_date,
          amount: 0.00,
          status: 'OPEN',
          late_fees: 0.00
        }))
      );
    }

    return res.status(200).json({ success: true, output });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
