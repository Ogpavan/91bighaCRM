import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { alpha } from "@mui/material/styles";
import { useAuth } from "@/components/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getRoles, type RoleItem } from "@/api/roles-service";
import { disableUser, getUsers, updateUser, type UserItem } from "@/api/users-service";
import { getTeams, type TeamItem } from "@/api/teams-service";

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
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [roleEditingUser, setRoleEditingUser] = useState<UserItem | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editTeamId, setEditTeamId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
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

  const loadTeams = async () => {
    if (!hasPermission("manage_users")) {
      return;
    }

    try {
      const teamItems = await getTeams();
      setTeams(teamItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
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
    void loadTeams();
  }, []);

  const openEditStaff = (user: UserItem) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditEmail(user.email);
    setEditPhone(user.phone || "");
    setEditRole(user.role);
    setEditTeamId(user.teamId || "");
    setEditIsActive(user.isActive);
  };

  const handleSaveStaff = async () => {
    if (!editingUser || !editRole) {
      return;
    }

    setSavingEdit(true);
    setError("");
    try {
      await updateUser(editingUser.id, {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        roleName: editRole,
        teamId: editTeamId || undefined,
        isActive: editIsActive
      });
      setEditingUser(null);
      await loadUsers(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSavingEdit(false);
    }
  };

  const openAssignRole = (user: UserItem) => {
    setRoleEditingUser(user);
    setSelectedRole(user.role);
  };

  const handleSaveAssignedRole = async () => {
    if (!roleEditingUser || !selectedRole) {
      return;
    }

    setSavingRole(true);
    setError("");
    try {
      await updateUser(roleEditingUser.id, { roleName: selectedRole });
      setRoleEditingUser(null);
      await loadUsers(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setSavingRole(false);
    }
  };

  const userColumns: Array<GridColDef<UserItem>> = [
    { field: "fullName", headerName: "Name", minWidth: 180, flex: 1 },
    { field: "email", headerName: "Email", minWidth: 220, flex: 1 },
    {
      field: "phone",
      headerName: "Phone",
      width: 150,
      renderCell: (params) => params.row.phone || "-"
    },
    {
      field: "role",
      headerName: "Role",
      width: 140,
      renderCell: (params) => <Badge className={pickRoleBadgeClass(params.row.role)}>{params.row.role}</Badge>
    },
    {
      field: "team",
      headerName: "Team",
      minWidth: 160,
      flex: 1,
      renderCell: (params) => params.row.team?.name || "-"
    },
    {
      field: "isActive",
      headerName: "Status",
      width: 130,
      renderCell: (params) => (
        <Badge variant={params.row.isActive ? "success" : "secondary"}>
          {params.row.isActive ? "Active" : "Inactive"}
        </Badge>
      )
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 260,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-7 text-[11px]"
            onClick={() => openEditStaff(params.row)}
            disabled={!hasPermission("manage_users")}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            className="h-7 text-[11px]"
            onClick={() => openAssignRole(params.row)}
            disabled={!hasPermission("manage_users")}
          >
            Assign Role
          </Button>
          <Button
            variant="ghost"
            className="h-7 text-[11px] text-red-600 hover:bg-gray-100"
            onClick={() => void handleDisable(params.row.id)}
            disabled={!hasPermission("manage_users") || !params.row.isActive}
          >
            Disable
          </Button>
        </div>
      )
    }
  ];

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
              <div style={{ minWidth: 950, height: 420 }}>
                <DataGrid
                  density="compact"
                  rows={items}
                  columns={userColumns}
                  getRowId={(row) => row.id}
                  loading={loading}
                  disableRowSelectionOnClick
                  hideFooter
                  sx={(theme) => ({
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: "0.375rem",
                    fontSize: "0.75rem",
                    "& .MuiDataGrid-columnHeaders": {
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText,
                      borderBottom: `1px solid ${alpha(theme.palette.primary.contrastText, 0.2)}`
                    },
                    "& .MuiDataGrid-columnHeaderTitle": {
                      fontWeight: 700
                    },
                    "& .MuiDataGrid-row:nth-of-type(odd) .MuiDataGrid-cell": {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04)
                    },
                    "& .MuiDataGrid-row:nth-of-type(even) .MuiDataGrid-cell": {
                      backgroundColor: theme.palette.background.paper
                    },
                    "& .MuiDataGrid-row:hover .MuiDataGrid-cell": {
                      backgroundColor: theme.palette.action.hover
                    },
                    "& .MuiDataGrid-iconButtonContainer, & .MuiDataGrid-menuIcon, & .MuiDataGrid-sortIcon, & .MuiDataGrid-filterIcon": {
                      color: theme.palette.primary.contrastText
                    }
                  })}
                />
              </div>
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
            <h2 className="text-sm font-semibold text-gray-800">Edit Staff Details</h2>
            <p className="mt-1 text-xs text-gray-500">{editingUser.fullName}</p>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">Full Name</label>
              <Input className="h-9 text-xs" value={editFullName} onChange={(event) => setEditFullName(event.target.value)} />
            </div>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">Email</label>
              <Input className="h-9 text-xs" type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} />
            </div>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">Phone</label>
              <Input className="h-9 text-xs" value={editPhone} onChange={(event) => setEditPhone(event.target.value)} />
            </div>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">Role</label>
              <Select className="h-9 text-xs" value={editRole} onChange={(event) => setEditRole(event.target.value)}>
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">Team</label>
              <Select className="h-9 text-xs" value={editTeamId} onChange={(event) => setEditTeamId(event.target.value)}>
                <option value="">Unassigned</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select
                className="h-9 text-xs"
                value={editIsActive ? "active" : "inactive"}
                onChange={(event) => setEditIsActive(event.target.value === "active")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" className="h-8 text-xs" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button className="h-8 text-xs" onClick={() => void handleSaveStaff()} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {roleEditingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4">
          <div className="w-full max-w-sm rounded-sm border border-gray-200 bg-white p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-gray-800">Assign Role</h2>
            <p className="mt-1 text-xs text-gray-500">{roleEditingUser.fullName}</p>
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
              <Button variant="outline" className="h-8 text-xs" onClick={() => setRoleEditingUser(null)}>
                Cancel
              </Button>
              <Button className="h-8 text-xs" onClick={() => void handleSaveAssignedRole()} disabled={savingRole}>
                {savingRole ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
