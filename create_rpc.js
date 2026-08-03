import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const sql = `
    CREATE OR REPLACE FUNCTION atomic_increment_stats(
      p_user_id UUID,
      p_points NUMERIC,
      p_weekly_debt NUMERIC,
      p_total_debt NUMERIC
    ) RETURNS void AS $$
    BEGIN
      UPDATE tracker_user_stats
      SET 
        my_points = my_points + COALESCE(p_points, 0),
        my_weekly_debt = my_weekly_debt + COALESCE(p_weekly_debt, 0),
        my_total_debt = my_total_debt + COALESCE(p_total_debt, 0)
      WHERE user_id = p_user_id;
    END;
    $$ LANGUAGE plpgsql;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.log("RPC Error:", error);
  } else {
    console.log("RPC atomic_increment_stats created successfully.");
  }
}
run();
