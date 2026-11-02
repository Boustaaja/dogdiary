import { createClient } from "@supabase/supabase-js";

// Shared Supabase client used by all modules to access diary data, auth and storage.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
