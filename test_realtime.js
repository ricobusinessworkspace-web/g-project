const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ajeknrzlltatuopvkycn.supabase.co', 'sb_publishable_Gpi4HY06nTHDDA4BRyjmsQ_V1pWxt1I');

const channel = supabase.channel('public:user_stats');
channel.on('postgres_changes', { event: '*', schema: 'public', table: 'user_stats' }, (payload) => {})
  .subscribe((status, err) => {
    console.log('Status:', status);
    if (err) console.error('Error:', err);
    process.exit(0);
  });
