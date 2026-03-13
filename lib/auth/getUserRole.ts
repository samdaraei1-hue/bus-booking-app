import { supabase } from "@/lib/supabaseClient";

export async function getUserRole() {

  const { data } = await supabase.auth.getUser();

  if (!data.user) return null;

  const { data: role } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .single();

  return role?.role ?? "passenger";
}