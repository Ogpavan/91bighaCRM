"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Role = {
  id: string;
  name: string;
  slug: string;
};

type Team = {
  id: string;
  name: string;
  description?: string | null;
};

type UserListItem = {
  id: string;
  fullName?: string | null;
  name?: string | null;
  email: string;
  role?: string | null;
  team_name?: string | null;
  team?: {
    id: string;
    name: string;
  } | null;
};

type Status = { type: "success" | "error"; message: string };

const API_BASE = "/api/v1";

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  roleId: "",
  teamId: ""
};

const initialTeamForm = {
  name: "",
  description: ""
};

export default function AdminUsersPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [form, setForm] = useState(initialForm);
  const [teamForm, setTeamForm] = useState(initialTeamForm);
  const [status, setStatus] = useState<Status | null>(null);
  const [teamStatus, setTeamStatus] = useState<Status | null>(null);
  const [pending, setPending] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    fetchMeta();
    fetchUsers();
  }, []);

  async function fetchMeta() {
    setLoadingMeta(true);
    try {
      const [rolesResp, teamsResp] = await Promise.all([
        fetch(`${API_BASE}/roles`),
        fetch(`${API_BASE}/teams`)
      ]);

      if (!rolesResp.ok || !teamsResp.ok) {
        throw new Error("Unable to load roles or teams.");
      }

      const rolesData = await rolesResp.json();
      const teamsData = await teamsResp.json();

      setRoles(Array.isArray(rolesData.items) ? rolesData.items : []);
      setTeams(Array.isArray(teamsData.items) ? teamsData.items : []);
      setForm((prev) => ({
        ...prev,
        roleId: prev.roleId || (rolesData.items?.[0]?.id ?? "")
      }));
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Failed to reload metadata." });
    } finally {
      setLoadingMeta(false);
    }
  }

  async function fetchUsers() {
    setUsersLoading(true);
    try {
      const response = await fetch(`${API_BASE}/users`);
      if (!response.ok) {
        throw new Error("Unable to load created users.");
      }

      const payload = (await response.json()) as { items?: UserListItem[] };
      const normalized = Array.isArray(payload.items)
        ? payload.items.map((user: UserListItem) => ({
          ...user,
            name: user.name || user.fullName || user.email,
            team_name: user.team_name || user.team?.name || null
          }))
        : [];
      setUsers(normalized);
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Unable to load users." });
    } finally {
      setUsersLoading(false);
    }
  }

  const handleChange =
    (field: keyof typeof initialForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleTeamChange =
    (field: keyof typeof initialTeamForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setTeamForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!form.fullName || !form.email || !form.password || !form.roleId) {
      setStatus({ type: "error", message: "Name, email, password, and role are required." });
      return;
    }

    setPending(true);

    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          roleId: Number(form.roleId),
          teamId: form.teamId ? Number(form.teamId) : undefined
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Unable to create user.");
      }

      setStatus({ type: "success", message: "User created successfully." });
      setForm((current) => ({ ...current, fullName: "", email: "", password: "", phone: "" }));
      fetchUsers();
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Unable to create user." });
    } finally {
      setPending(false);
    }
  };

  const handleTeamSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTeamStatus(null);

    if (!teamForm.name.trim()) {
      setTeamStatus({ type: "error", message: "Team name is required." });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamForm.name.trim(),
          description: teamForm.description.trim() || undefined
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to create team.");
      }

      setTeams((current) => [...current, payload.team]);
      setTeamStatus({ type: "success", message: "Team created." });
      setTeamForm(initialTeamForm);
    } catch (error) {
      setTeamStatus({ type: "error", message: error instanceof Error ? error.message : "Unable to create team." });
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-16 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">CRM Admin</p>
          <h1 className="text-3xl font-bold text-slate-900">Manage CRM users</h1>
          <p className="text-slate-500">
            Create staff accounts and assign them the appropriate role and optional team so they can log into the
            CRM dashboard.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Create user</h2>
              <span className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                {roles.length} roles • {teams.length} teams
              </span>
            </div>

            {loadingMeta && <p className="text-sm text-slate-500">Loading roles and teams…</p>}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm font-medium text-slate-600">Full name</label>
                <input
                  value={form.fullName}
                  onChange={handleChange("fullName")}
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange("email")}
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-600">Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={handleChange("password")}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
                <label className="text-sm font-medium text-slate-600">
                  Phone (optional)
                  <input
                    value={form.phone}
                    onChange={handleChange("phone")}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </label>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="text-sm font-medium text-slate-600">
                  Role
                  <select
                    value={form.roleId}
                    onChange={handleChange("roleId")}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="">Select role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Team
                  <select
                    value={form.teamId}
                    onChange={handleChange("teamId")}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="">Standalone</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {status ? (
                <p className={`text-sm ${status.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>
                  {status.message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-2xl bg-[#0F172A] px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-slate-900 disabled:opacity-60"
              >
                {pending ? "Saving…" : "Create user"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Create or update a team</h2>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Optional</span>
            </div>
            <form className="space-y-4" onSubmit={handleTeamSubmit}>
              <div>
                <label className="text-sm font-medium text-slate-600">Team name</label>
                <input
                  value={teamForm.name}
                  onChange={handleTeamChange("name")}
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Description</label>
                <textarea
                  value={teamForm.description}
                  onChange={handleTeamChange("description")}
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  rows={3}
                />
              </div>

              {teamStatus ? (
                <p className={`text-sm ${teamStatus.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>
                  {teamStatus.message}
                </p>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-900 transition hover:border-slate-500"
              >
                Create team
              </button>
            </form>
          </section>
        </div>
        <section className="mt-8 rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900">Users</h2>
            {usersLoading ? <span className="text-xs text-slate-500">Refreshing…</span> : null}
          </div>
          {users.length === 0 ? (
            <p className="text-sm text-slate-500">No users yet. Create one above to fill this list.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500">
                    <th className="pb-3 pr-4 font-normal">Name</th>
                    <th className="pb-3 pr-4 font-normal">Email</th>
                    <th className="pb-3 pr-4 font-normal">Role</th>
                    <th className="pb-3 font-normal">Team</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-slate-100">
                      <td className="py-3 pr-4 font-medium">{user.name || user.fullName || user.email}</td>
                      <td className="py-3 pr-4">{user.email}</td>
                      <td className="py-3 pr-4">{user.role}</td>
                      <td className="py-3">{user.team_name || "Standalone"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mt-8 rounded-3xl bg-white border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          <p className="mb-2">
            Need advanced workflows? The CRM roles are stored in Postgres; you can extend APIs for permission management
            using the helper in <code>src/lib/crm-auth.ts</code>.
          </p>
          <Link href="/admin/properties" className="text-indigo-600 hover:underline">
            Back to property uploads
          </Link>
        </div>
      </div>
    </main>
  );
}
