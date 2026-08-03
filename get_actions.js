import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://duzmanqvyhqurxlpxrrg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1em1hbnF2eWhxdXJ4bHB4cnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTk1NTQsImV4cCI6MjA5NDk3NTU1NH0.v7dSCQQn2T_3LHrTj4j2K5Byz3oKvuKE2zO7M9BA4Uo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: actions, error } = await supabase.from('tracker_action_entries')
    .select('*')
    .eq('user_id', 'eece1aed-0205-41be-bf2d-7b4f1ff8f42e') // Rico
    .order('timestamp', { ascending: false })
    .limit(5);
    
  console.log("Rico Recent Actions:", actions);
}
run();
