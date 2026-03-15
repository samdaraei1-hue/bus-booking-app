"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";

type User = {
  id: string;
  email: string;
  role: string | null;
  systemRole: string | null;
};

export default function DashboardUsersPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const t = useT(lang);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data: userRows, error: userError } = await supabase.from("users").select("id, email, role");
    if (userError) console.error(userError);

    const { data: roleRows, error: roleError } = await supabase.from("user_roles").select("user_id, role");
    if (roleError) console.error(roleError);

    const usersData = (userRows || []).map((user) => {
      const roleRow = roleRows?.find(r => r.user_id === user.id);
      return {
        id: user.id,
        email: user.email,
        role: user.role || null,
        systemRole: roleRow?.role || null,
      };
    });

    setUsers(usersData);
    setLoading(false);
  };

  const updateRole = async (id: string, role: string, type: "business" | "system") => {
    if (type === "business") {
      const { error } = await supabase.from("users").upsert({ id, role });
      if (error) console.error(error);
    } else {
      const { error } = await supabase.from("user_roles").upsert({ user_id: id, role });
      if (error) console.error(error);
    }
    fetchUsers();
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">{t("page.dashboard.users", "مدیریت کاربران")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("page.dashboard.users_desc", "نقش‌ها و پروفایل کاربران")}</p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-start p-2">{t("table.email", "ایمیل")}</th>
              <th className="text-start p-2">{t("table.business_role", "نقش تجاری")}</th>
              <th className="text-start p-2">{t("table.system_role", "نقش سیستمی")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b">
                <td className="p-2">{user.email}</td>
                <td className="p-2">
                  <select
                    value={user.role || ""}
                    onChange={(e) => updateRole(user.id, e.target.value, "business")}
                    className="border rounded px-2 py-1"
                    title="Business role"
                  >
                    <option value="">{t("role.none", "هیچ")}</option>
                    <option value="leader">{t("role.leader", "رهبر")}</option>
                    <option value="owner">{t("role.owner", "صاحب")}</option>
                  </select>
                </td>
                <td className="p-2">
                  <select
                    value={user.systemRole || ""}
                    onChange={(e) => updateRole(user.id, e.target.value, "system")}
                    className="border rounded px-2 py-1"
                    title="System role"
                  >
                    <option value="user">{t("role.user", "کاربر")}</option>
                    <option value="admin">{t("role.admin", "ادمین")}</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}