import { authenticateRequest } from "@/lib/server/supabaseRoute";

const ALLOWED_ROLES = new Set(["admin", "leader", "owner", "driver"]);

export async function authenticateDashboardRequest(request: Request) {
  const { supabase, user } = await authenticateRequest(request);

  const [{ data: userRow }, { data: roleRow }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
  ]);

  const businessRole = userRow?.role ?? null;
  const systemRole = roleRow?.role ?? "user";

  if (!ALLOWED_ROLES.has(systemRole) && !ALLOWED_ROLES.has(businessRole ?? "")) {
    throw new Error("Forbidden");
  }

  return { supabase, user, businessRole, systemRole };
}
