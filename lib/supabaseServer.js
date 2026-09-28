import { createClient } from "@supabase/supabase-js";

// Bu dosya SADECE sunucu tarafında (API route'larında) import edilir.
// SUPABASE_SERVICE_ROLE_KEY tarayıcıya asla gönderilmez.
export function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
