import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const sql = `
    CREATE OR REPLACE FUNCTION recalculate_user_stats()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Recalculate my_points for the user
      UPDATE tracker_user_stats
      SET my_points = (
          SELECT COALESCE(SUM(points_applied), 0)
          FROM tracker_action_entries
          WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
            AND is_cancelled = false
      )
      WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
      
      -- Recalculate my_debt for the user
      UPDATE tracker_user_stats
      SET my_debt = (
          SELECT COALESCE(SUM(debt_applied), 0)
          FROM tracker_action_entries
          WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
            AND is_cancelled = false
            AND rule_id != 'weekly_reset'
      )
      WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_recalculate_user_stats ON tracker_action_entries;
    
    CREATE TRIGGER trigger_recalculate_user_stats
    AFTER INSERT OR UPDATE OR DELETE ON tracker_action_entries
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_user_stats();
  `;

  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.log("RPC exec_sql failed. Trying REST API directly or checking if we can use postgres.");
    console.log(error);
  } else {
    console.log("Trigger created successfully.");
  }
}
run();
