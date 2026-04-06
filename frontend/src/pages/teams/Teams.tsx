import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createTeam,
  deleteTeam,
  getTeamPermissions,
  getTeams,
  updateTeam,
  updateTeamPermissions,
  type TeamItem
} from "@/lib/teams-service";

const pagePermissionOptions = [
  { key: "view_dashboard", label: "Dashboard" },
  { key: "view_leads", label: "Leads" },
  { key: "view_all_tasks", label: "All Tasks" },
  { key: "view_users", label: "Users" },
  { key: "view_reports", label: "Reports" },
  { key: "manage_settings", label: "Settings" }
];

export default function Teams() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("manage_users");

  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [permissionTeam, setPermissionTeam] = useState<TeamItem | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const loadTeams = async () => {
    setLoading(true);
    setError("");
    try {
      const items = await getTeams();
      setTeams(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeams();
  }, []);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) {
      setError("Team name is required");
      return;
    }

    setCreating(true);
    setError("");
    try {
      await createTeam({ name: newName.trim(), description: newDescription.trim() || undefined });
      setNewName("");
      setNewDescription("");
      setIsCreateOpen(false);
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (team: TeamItem) => {
    setEditingId(team.id);
    setEditName(team.name);
    setEditDescription(team.description || "");
  };

  const handleSaveEdit = async (teamId: string) => {
    if (!editName.trim()) {
      setError("Team name is required");
      return;
    }

    setSavingEdit(true);
    setError("");
    try {
      await updateTeam(teamId, { name: editName.trim(), description: editDescription.trim() || "" });
      setEditingId(null);
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update team");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (teamId: string) => {
    setError("");
    try {
      await deleteTeam(teamId);
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete team");
    }
  };

  const openPermissions = async (team: TeamItem) => {
    setError("");
    try {
      const permissions = await getTeamPermissions(team.id);
      setPermissionTeam(team);
      setSelectedPermissions(permissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team access");
    }
  };

  const togglePermission = (permissionKey: string, checked: boolean) => {
    setSelectedPermissions((prev) => {
      if (checked) {
        return [...new Set([...prev, permissionKey])];
      }
      return prev.filter((item) => item !== permissionKey);
    });
  };

  const savePermissions = async () => {
    if (!permissionTeam) {
      return;
    }

    setSavingPermissions(true);
    setError("");
    try {
      const updated = await updateTeamPermissions(permissionTeam.id, selectedPermissions);
      setSelectedPermissions(updated);
      setPermissionTeam(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save team access");
    } finally {
      setSavingPermissions(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="rounded-sm">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-gray-800">All Teams</CardTitle>
            {canManage ? (
              <Button className="h-8 text-xs" onClick={() => setIsCreateOpen(true)}>
                Add Team
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {loading ? <p className="text-xs text-gray-500">Loading teams...</p> : null}
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          {!loading && !error ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => {
                    const isEditing = editingId === team.id;
                    return (
                      <tr key={team.id} className="border-b border-gray-100">
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <Input className="h-8 text-xs" value={editName} onChange={(event) => setEditName(event.target.value)} />
                          ) : (
                            <span className="text-gray-800">{team.name}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <Input className="h-8 text-xs" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} />
                          ) : (
                            <span className="text-gray-600">{team.description || "No description"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {canManage ? (
                            isEditing ? (
                              <div className="flex gap-2">
                                <Button className="h-7 text-[11px]" disabled={savingEdit} onClick={() => void handleSaveEdit(team.id)}>
                                  Save
                                </Button>
                                <Button variant="outline" className="h-7 text-[11px]" onClick={() => setEditingId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button variant="outline" className="h-7 text-[11px]" onClick={() => startEdit(team)}>
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  className="h-7 text-[11px]"
                                  onClick={() => void openPermissions(team)}
                                >
                                  Access
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="h-7 text-[11px] text-red-600 hover:bg-gray-100"
                                  onClick={() => void handleDelete(team.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            )
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!teams.length ? <p className="mt-2 text-xs text-gray-500">No teams found.</p> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4">
          <div className="w-full max-w-md rounded-sm border border-gray-200 bg-white p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-gray-800">Add Team</h2>
            <form className="mt-3 space-y-2" onSubmit={handleCreate}>
              <Input
                className="h-9 text-xs"
                placeholder="Team name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
              <Input
                className="h-9 text-xs"
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="h-8 text-xs" disabled={creating}>
                  {creating ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {permissionTeam ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4">
          <div className="w-full max-w-md rounded-sm border border-gray-200 bg-white p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-gray-800">Team Page Access</h2>
            <p className="mt-1 text-xs text-gray-500">{permissionTeam.name}</p>
            <div className="mt-3 space-y-2">
              {pagePermissionOptions.map((permission) => (
                <label key={permission.key} className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded-sm border-gray-300"
                    checked={selectedPermissions.includes(permission.key)}
                    onChange={(event) => togglePermission(permission.key, event.target.checked)}
                  />
                  {permission.label}
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setPermissionTeam(null)}
              >
                Cancel
              </Button>
              <Button className="h-8 text-xs" onClick={() => void savePermissions()} disabled={savingPermissions}>
                {savingPermissions ? "Saving..." : "Save Access"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
