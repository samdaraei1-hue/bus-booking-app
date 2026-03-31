"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  role: string | null;
  profile_completed: boolean | null;
};

type SystemRoleRow = {
  user_id: string;
  role: string | null;
};

type DashboardUser = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  businessRole: string | null;
  systemRole: string | null;
  profileCompleted: boolean;
};

const BUSINESS_ROLE_OPTIONS = ["", "leader", "owner"] as const;
const SYSTEM_ROLE_OPTIONS = ["user", "admin"] as const;

export default function DashboardUsersPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const t = useT(lang);

  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    void fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setMsg(null);

    try {
      const [
        { data: userRows, error: userError },
        { data: roleRows, error: roleError },
      ] = await Promise.all([
        supabase
          .from("users")
          .select("id, email, name, phone, role, profile_completed")
          .order("email", { ascending: true }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (userError) throw userError;
      if (roleError) throw roleError;

      const systemRoles = new Map(
        ((roleRows ?? []) as SystemRoleRow[]).map((row) => [
          row.user_id,
          row.role ?? "user",
        ])
      );

      const nextUsers = ((userRows ?? []) as UserRow[]).map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        businessRole: user.role ?? null,
        systemRole: systemRoles.get(user.id) ?? "user",
        profileCompleted: Boolean(user.profile_completed),
      }));

      setUsers(nextUsers);
    } catch (error) {
      console.error(error);
      setUsers([]);
      setMsg(error instanceof Error ? error.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (
    userId: string,
    role: string,
    type: "business" | "system"
  ) => {
    const savingId = `${userId}:${type}`;
    setSavingKey(savingId);
    setMsg(null);

    try {
      if (type === "business") {
        const { error } = await supabase
          .from("users")
          .update({ role: role || null })
          .eq("id", userId);

        if (error) throw error;
      } else if (role === "user") {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .upsert({ user_id: userId, role }, { onConflict: "user_id" });

        if (error) throw error;
      }

      setUsers((current) =>
        current.map((user) =>
          user.id === userId
            ? {
                ...user,
                businessRole:
                  type === "business" ? (role || null) : user.businessRole,
                systemRole: type === "system" ? role : user.systemRole,
              }
            : user
        )
      );

      setMsg(t("common.save", "Saved"));
    } catch (error) {
      console.error(error);
      setMsg(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setSavingKey(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users;

    return users.filter((user) =>
      [user.email, user.name, user.phone, user.businessRole, user.systemRole]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle))
    );
  }, [search, users]);

  const summary = useMemo(() => {
    const completed = users.filter((user) => user.profileCompleted).length;
    const admins = users.filter((user) => user.systemRole === "admin").length;
    const leaders = users.filter((user) => user.businessRole === "leader").length;

    return {
      total: users.length,
      completed,
      admins,
      leaders,
    };
  }, [users]);

  return (
    <main className="page-shell">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
            {t("page.dashboard.users", "Manage Users")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            {t("page.dashboard.users_desc", "Roles and user profiles")}
          </p>
        </div>

        <div className="w-full lg:max-w-sm">
          <label
            htmlFor="user-search"
            className="block text-sm font-semibold text-zinc-700"
          >
            {t("page.admin.translations.search", "Search")}
          </label>
          <input
            id="user-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="email / name / role"
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 transition focus:ring-4"
          />
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="page-card p-5">
          <div className="text-sm text-zinc-500">Users</div>
          <div className="mt-2 text-3xl font-extrabold text-zinc-900">
            {summary.total}
          </div>
        </div>
        <div className="page-card p-5">
          <div className="text-sm text-zinc-500">Admins</div>
          <div className="mt-2 text-3xl font-extrabold text-zinc-900">
            {summary.admins}
          </div>
        </div>
        <div className="page-card p-5">
          <div className="text-sm text-zinc-500">Leaders</div>
          <div className="mt-2 text-3xl font-extrabold text-zinc-900">
            {summary.leaders}
          </div>
        </div>
        <div className="page-card p-5">
          <div className="text-sm text-zinc-500">Completed Profiles</div>
          <div className="mt-2 text-3xl font-extrabold text-zinc-900">
            {summary.completed}
          </div>
        </div>
      </div>

      <div className="page-card p-4 sm:p-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-2xl bg-zinc-100"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-4 lg:hidden">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-900">
                        {user.name || "Unnamed user"}
                      </div>
                      <div className="mt-1 break-all text-sm text-zinc-500">
                        {user.email || "No email"}
                      </div>
                      <div className="mt-1 text-sm text-zinc-500">
                        {user.phone || "-"}
                      </div>
                    </div>
                    <span
                      className={[
                        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                        user.profileCompleted
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700",
                      ].join(" ")}
                    >
                      {user.profileCompleted ? "Complete" : "Incomplete"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {t("table.business_role", "Business Role")}
                      </div>
                      <select
                        value={user.businessRole ?? ""}
                        onChange={(event) =>
                          void updateRole(user.id, event.target.value, "business")
                        }
                        disabled={savingKey === `${user.id}:business`}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"
                        title="Business role"
                      >
                        {BUSINESS_ROLE_OPTIONS.map((role) => (
                          <option key={role || "none"} value={role}>
                            {role || t("role.none", "None")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {t("table.system_role", "System Role")}
                      </div>
                      <select
                        value={user.systemRole ?? "user"}
                        onChange={(event) =>
                          void updateRole(user.id, event.target.value, "system")
                        }
                        disabled={savingKey === `${user.id}:system`}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"
                        title="System role"
                      >
                        {SYSTEM_ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="px-3 py-3 text-start">User</th>
                    <th className="px-3 py-3 text-start">Phone</th>
                    <th className="px-3 py-3 text-start">
                      {t("table.business_role", "Business Role")}
                    </th>
                    <th className="px-3 py-3 text-start">
                      {t("table.system_role", "System Role")}
                    </th>
                    <th className="px-3 py-3 text-start">Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-zinc-100">
                      <td className="px-3 py-4">
                        <div className="font-semibold text-zinc-900">
                          {user.name || "Unnamed user"}
                        </div>
                        <div className="mt-1 text-zinc-500">
                          {user.email || "No email"}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-zinc-700">
                        {user.phone || "-"}
                      </td>
                      <td className="px-3 py-4">
                        <select
                          value={user.businessRole ?? ""}
                          onChange={(event) =>
                            void updateRole(user.id, event.target.value, "business")
                          }
                          disabled={savingKey === `${user.id}:business`}
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2"
                          title="Business role"
                        >
                          {BUSINESS_ROLE_OPTIONS.map((role) => (
                            <option key={role || "none"} value={role}>
                              {role || t("role.none", "None")}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-4">
                        <select
                          value={user.systemRole ?? "user"}
                          onChange={(event) =>
                            void updateRole(user.id, event.target.value, "system")
                          }
                          disabled={savingKey === `${user.id}:system`}
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2"
                          title="System role"
                        >
                          {SYSTEM_ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                            user.profileCompleted
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700",
                          ].join(" ")}
                        >
                          {user.profileCompleted ? "Complete" : "Incomplete"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!filteredUsers.length ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                No users found.
              </div>
            ) : null}
          </>
        )}

        {msg ? <div className="mt-4 text-sm text-zinc-700">{msg}</div> : null}
      </div>
    </main>
  );
}
