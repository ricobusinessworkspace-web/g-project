import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env manually
const envPath = join(__dirname, '../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(
  envConfig.EXPO_PUBLIC_SUPABASE_URL || envConfig.VITE_SUPABASE_URL,
  envConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY || envConfig.VITE_SUPABASE_ANON_KEY
);

async function resetDB() {
    console.log("Resetting all history...");
    
    // We cannot truncate via the client easily, but we can delete all where id is not null
    const { error: err1 } = await supabase.from('tracker_action_entries').delete().neq('id', 'null');
    if (err1) console.log(err1);
    
    console.log("Resetting all users...");
    const { error: err2 } = await supabase.from('tracker_user_stats').update({
        my_points: 5,
        my_debt: 0,
        my_weekly_debt: 0,
        unpaid_weekly_debt: 0,
        my_total_debt: 0,
        last_settlement_date: null,
        last_weekly_reset_date: null,
        last_late_pay_date: null,
        last_gm_date: null,
    }).neq('user_id', 'null');
    if (err2) console.log(err2);

    console.log("Database reset complete!");
}

resetDB();
