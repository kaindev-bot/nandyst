import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("⚠️  Faltam variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── helpers de usuário ──────────────────────────────────────── */
export const getUser    = () => supabase.auth.getUser();
export const getSession = () => supabase.auth.getSession();

export async function isAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("usuarios")
    .select("role")
    .eq("auth_id", user.id)
    .single();
  return data?.role === "admin";
}

/* ── formatador de moeda ─────────────────────────────────────── */
export const fmt = v =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
