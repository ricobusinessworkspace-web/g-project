-- 1. Create a function to recalculate user stats based on the ledger
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

-- 2. Create the trigger to fire on any changes to the ledger
DROP TRIGGER IF EXISTS trigger_recalculate_user_stats ON tracker_action_entries;

CREATE TRIGGER trigger_recalculate_user_stats
AFTER INSERT OR UPDATE OR DELETE ON tracker_action_entries
FOR EACH ROW
EXECUTE FUNCTION recalculate_user_stats();
