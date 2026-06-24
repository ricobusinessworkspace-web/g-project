const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ajeknrzlltatuopvkycn.supabase.co', 'sb_publishable_Gpi4HY06nTHDDA4BRyjmsQ_V1pWxt1I');
async function check() {
  const { data, error } = await supabase.from('action_entries').select('*').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}
check();
