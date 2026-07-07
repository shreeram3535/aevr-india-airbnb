const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, './.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8').replace(/\r/g, '');
  envContent.split('\n').forEach((line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Env variables missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('listings')
    .select('id, title, price_per_night, guest_count_max, bedrooms, beds, baths, is_active, category_id');
  if (error) {
    console.error('Error fetching listings:', error);
  } else {
    console.log('Fetched listings:', data.length);
    data.forEach(item => {
      console.log(`- Title: "${item.title}" | Price: ${item.price_per_night} | Bedrooms: ${item.bedrooms} | Max Guests: ${item.guest_count_max} | Beds: ${item.beds}`);
    });
  }
}

run();
