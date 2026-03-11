import { redirect } from "next/navigation";
import { getUserRole } from "./getUserRole";

export async function requireRole(roles:string[]) {

  const role = await getUserRole();

  if (!role || !roles.includes(role)) {
    redirect("/");
  }

}