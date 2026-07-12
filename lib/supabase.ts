import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("Checking URL:", process.env.SUPABASE_URL); // Or whichever variable name you are using
export const supabase = createClient(supabaseUrl, supabaseAnonKey);