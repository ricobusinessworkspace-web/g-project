const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const code = fs.readFileSync('utils/supabase.ts', 'utf8');
const urlMatch = code.match(/supabaseUrl\s*=\s*'([^']+)'/);
const keyMatch = code.match(/supabaseAnonKey\s*=\s*'([^']+)'/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function check() {
  const { data, error } = await supabase.from('user_stats').select('*');
  console.log('User Stats:', JSON.stringify(data, null, 2));
}
check();
