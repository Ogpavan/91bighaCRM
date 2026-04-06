import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getRoles, type RoleItem } from "@/lib/roles-service";
import { disableUser, getUsers, updateUser, type UserItem } from "@/lib/users-service";

const roleBadgeClasses = [
  "border-blue-200 bg-blue-50 text-blue-700",
  "border-gray-200 bg-gray-50 text-gray-700",
  "border-green-200 bg-green-50 text-green-700",
  "border-orange-200 bg-orange-50 text-orange-700",
  "border-indigo-200 bg-indigo-50 text-indigo-700"
];

const pickRoleBadgeClass = (role: string) => {
  const seed = role.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return roleBadgeClasses[seed % roleBadgeClasses.length];
};

export default function Users() {
  const { hasPermission } = useAuth();
  const PAGE_SIZE = 6;

  const [items, setItems] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  const loadUsers = async (nextPage = page) => {
    setLoading(true);
    setError("");
    try {
      const data = await getUsers({ page: nextPage, limit: PAGE_SIZE });
      setItems(data.items);
      setPage(data.pagination.page);
      setTotalPages(Math.max(data.pagination.totalPages, 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    if (!hasPermission("manage_users")) {
      return;
    }

    try {
      const roleItems = await getRoles();
      setRoles(roleItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles");
    }
  };

  const handleDisable = async (userId: string) => {
    try {
      await disableUser(userId);
      await loadUsers(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable user");
    }
  };

  useEffect(() => {
    void loadUsers(1);
    void loadRoles();
  }, []);

  const openEditRole = (user: UserItem) => {
    setEditingUser(user);
    setSelectedRole(user.role);
  };

  const handleSaveRole = async () => {
    if (!editingUser || !selectedRole) {
      return;
    }

    setSavingRole(true);
    setError("");
    try {
      await updateUser(editingUser.id, { roleName: selectedRole });
      setEditingUser(null);
      await loadUsers(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <Card className="rounded-sm">
      <CardHeader className="p-6 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-gray-800">Staff</CardTitle>
          {hasPermission("manage_users") ? (
            <Link to="/users/create" className={cn(buttonVariants({}), "h-8 px-3 text-xs")}>
              Add Staff Member
            </Link>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {loading ? <p className="text-xs text-gray-500">Loading users...</p> : null}
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        {!loading && !error ? (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">Team</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100">
                      <td className="px-3 py-2 text-gray-700">{user.fullName}</td>
                      <td className="px-3 py-2 text-gray-600">{user.email}</td>
                      <td className="px-3 py-2">
                        <Badge className={pickRoleBadgeClass(user.role)}>{user.role}</Badge>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{user.team?.name || "-"}</td>
                      <td className="px-3 py-2">
                        <Badge variant={user.isActive ? "success" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="h-7 text-[11px]"
                            onClick={() => openEditRole(user)}
                            disabled={!hasPermission("manage_users")}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-7 text-[11px] text-red-600 hover:bg-gray-100"
                            onClick={() => void handleDisable(user.id)}
                            disabled={!hasPermission("manage_users") || !user.isActive}
                          >
                            Disable
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages} (6 staff per page)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => void loadUsers(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => void loadUsers(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
      {editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4">
          <div className="w-full max-w-sm rounded-sm border border-gray-200 bg-white p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-gray-800">Assign Role</h2>
            <p className="mt-1 text-xs text-gray-500">{editingUser.fullName}</p>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">Role</label>
              <Select className="h-9 text-xs" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" className="h-8 text-xs" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button className="h-8 text-xs" onClick={() => void handleSaveRole()} disabled={savingRole}>
                {savingRole ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
