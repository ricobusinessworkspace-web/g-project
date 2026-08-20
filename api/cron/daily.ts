import { supabaseAdmin } from '../_utils/supabaseAdmin';
import { finalizeDay } from '../../src/engine/dailySettlement';

export default async function handler(req: any, res: any) {
  // Can secure via an Authorization header that Vercel Cron sends.
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Determine Date (Yesterday, if running right at 00:00, or today if 23:59)
    // To be safe, we just process the current logical day based on server time. 
    // Ideally pass a date param or infer from UTC.
    const now = new Date();
    // Vercel runs in UTC. If the users are in Germany, we might need timezone offset.
    // Let's assume the cron job passes the logical date, or we compute it.
    let targetDate = req.query.date;
    if (!targetDate) {
      // e.g. UTC + 2 for Germany summer time. For simplicity, just use local YYYY-MM-DD
      targetDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }

    // 2. Fetch all necessary data
    const [{ data: users }, { data: rules }, { data: globalDays }, { data: penaltyTiers }, { data: actionLogs }] = await Promise.all([
      supabaseAdmin.from('tracker_user_stats').select('user_id'), // Just need the IDs. Assuming tracker_user_stats has them.
      supabaseAdmin.from('g_rules').select('*').eq('is_active', true),
      supabaseAdmin.from('g_global_days').select('*').eq('date', targetDate),
      supabaseAdmin.from('g_penalty_tiers').select('*'),
      supabaseAdmin.from('g_action_logs').select('*').eq('date', targetDate)
    ]);

    if (!users || users.length !== 2) {
      return res.status(400).json({ error: 'System requires exactly 2 active users to run settlement' });
    }

    const globalDay = globalDays && globalDays.length > 0 ? globalDays[0] : null;

    // Map user_id format
    const mappedUsers = users.map(u => ({ id: u.user_id }));

    // 3. Run the engine
    const output = finalizeDay({
      date: targetDate,
      users: mappedUsers,
      rules: rules || [],
      actionLogs: actionLogs || [],
      globalDay,
      penaltyTiers: penaltyTiers || []
    });

    // 4. Save Daily Results
    if (output.dailyResults.length > 0) {
      const { error: drErr } = await supabaseAdmin.from('g_daily_results').upsert(output.dailyResults, { onConflict: 'user_id,date' });
      if (drErr) throw new Error('Failed to save daily results: ' + drErr.message);
    }

    // 5. Apply Weekly Dept additions (penalties + raw money)
    for (const addition of output.weeklyDeptAdditions) {
      // Find the open weekly settlement for this user.
      // Since weeks start on Monday, we find the one where status = 'OPEN'.
      const { data: openSettlements } = await supabaseAdmin
        .from('g_weekly_settlements')
        .select('*')
        .eq('user_id', addition.user_id)
        .eq('status', 'OPEN')
        .order('week_start_date', { ascending: false })
        .limit(1);

      if (openSettlements && openSettlements.length > 0) {
        const os = openSettlements[0];
        const newAmount = Number(os.amount) + addition.amount;
        await supabaseAdmin.from('g_weekly_settlements').update({ amount: newAmount }).eq('id', os.id);
      } else {
        // Fallback: create one if it doesn't exist
        // Note: In real life, the weekly reset creates it.
      }
    }

    return res.status(200).json({ success: true, output });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
