import { supabaseAdmin } from './_utils/supabaseAdmin';
import { evaluateAction } from '../src/engine/ruleEvaluator';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, rule_id, amount, finished_at_iso, date } = req.body;

  if (!user_id || !rule_id || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Fetch the Rule
    const { data: ruleData, error: ruleErr } = await supabaseAdmin
      .from('g_rules')
      .select('*')
      .eq('id', rule_id)
      .single();

    if (ruleErr || !ruleData) throw new Error('Rule not found');

    // 2. Fetch today's logs for this rule (for Caps)
    const { data: todaysLogs, error: logsErr } = await supabaseAdmin
      .from('g_action_logs')
      .select('*')
      .eq('user_id', user_id)
      .eq('rule_id', rule_id)
      .eq('date', date)
      .eq('is_correction', false);
      
    if (logsErr) throw new Error('Could not fetch logs');

    const finishedAt = finished_at_iso ? new Date(finished_at_iso) : new Date();
    
    // 3. Evaluate points and money
    const evaluation = evaluateAction(ruleData, amount || 1, finishedAt, todaysLogs || []);

    // 4. Insert Snapshot into Action Logs
    const { data: newLog, error: insertErr } = await supabaseAdmin
      .from('g_action_logs')
      .insert({
        user_id,
        rule_id,
        date,
        amount: evaluation.amount,
        points_calculated: evaluation.points_calculated,
        money_calculated: evaluation.money_calculated,
        is_correction: false
      })
      .select()
      .single();

    if (insertErr) throw new Error('Could not save action log: ' + insertErr.message);

    return res.status(200).json({ success: true, log: newLog });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
