import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lvvpgcqzbvvpjshbkavk.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_qQmxthBt0VtKH31I8WnFZg_tZww0nmX";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
