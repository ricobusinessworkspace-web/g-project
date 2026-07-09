const { createClient } = require('@supabase/supabase-js');

const OLD_URL = 'https://ajeknrzlltatuopvkycn.supabase.co';
const OLD_KEY = 'sb_publishable_Gpi4HY06nTHDDA4BRyjmsQ_V1pWxt1I';

const NEW_URL = 'https://duzmanqvyhqurxlpxrrg.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1em1hbnF2eWhxdXJ4bHB4cnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTk1NTQsImV4cCI6MjA5NDk3NTU1NH0.v7dSCQQn2T_3LHrTj4j2K5Byz3oKvuKE2zO7M9BA4Uo';

const oldSb = createClient(OLD_URL, OLD_KEY);
const newSb = createClient(NEW_URL, NEW_KEY);

async function migrate() {
  try {
    console.log('--- Migrating action_rules ---');
    const { data: rules } = await oldSb.from('action_rules').select('*');
    if (rules && rules.length > 0) {
      await newSb.from('tracker_action_rules').delete().neq('id', '0');
      const { error } = await newSb.from('tracker_action_rules').insert(rules);
      if (error) throw error;
      console.log(`✅ Migrated ${rules.length} action rules.`);
    }

    console.log('--- Migrating user_stats ---');
    const { data: stats } = await oldSb.from('user_stats').select('*');
    if (stats && stats.length > 0) {
      await newSb.from('tracker_user_stats').delete().neq('user_id', '0');
      const { error } = await newSb.from('tracker_user_stats').insert(stats);
      if (error) throw error;
      console.log(`✅ Migrated ${stats.length} user stats.`);
    }

    console.log('--- Migrating action_entries ---');
    let hasMore = true;
    let offset = 0;
    const limit = 1000;
    let count = 0;
    
    await newSb.from('tracker_action_entries').delete().neq('id', '0');

    while (hasMore) {
      const { data: entries } = await oldSb.from('action_entries').select('*').range(offset, offset + limit - 1);
      if (entries && entries.length > 0) {
        const { error } = await newSb.from('tracker_action_entries').insert(entries);
        if (error) throw error;
        count += entries.length;
        offset += limit;
      } else {
        hasMore = false;
      }
    }
    console.log(`✅ Migrated ${count} action entries.`);
    
    console.log('MIGRATION COMPLETE 🎉');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
