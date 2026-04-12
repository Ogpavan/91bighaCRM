import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getNotifications, type NotificationItem } from "@/api/notifications-service";
import {
  createPropertyType,
  deletePropertyType,
  getPropertyTypes,
  updatePropertyType,
  type PropertyTypeItem
} from "@/api/property-types-service";
import {
  createRole,
  deleteRole,
  getPermissions,
  getRolePermissions,
  getRoles,
  updateRole,
  updateRolePermissions,
  type PermissionItem,
  type RoleItem
} from "@/api/roles-service";

type ModulesTab = "roles" | "property-types" | "notifications";

const tabs: Array<{ id: ModulesTab; label: string }> = [
  { id: "roles", label: "Roles" },
  { id: "property-types", label: "Property Type" },
  { id: "notifications", label: "Notifications" }
];

const permissionGroups: Array<{ title: string; keys: string[] }> = [
  { title: "Dashboard", keys: ["view_dashboard"] },
  { title: "Leads", keys: ["view_leads", "create_leads", "edit_leads", "delete_leads"] },
  { title: "Tasks", keys: ["view_tasks", "create_tasks", "edit_tasks", "delete_tasks"] },
  { title: "Staff", keys: ["view_users", "manage_users"] },
  { title: "Reports", keys: ["view_reports"] },
  { title: "Settings", keys: ["manage_settings"] }
];

export default function ModulesPage() {
  const [activeTab, setActiveTab] = useState<ModulesTab>("roles");
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingName, setCreatingName] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingRole, setDeletingRole] = useState<RoleItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [permissionItems, setPermissionItems] = useState<PermissionItem[]>([]);
  const [permissionRole, setPermissionRole] = useState<RoleItem | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeItem[]>([]);
  const [propertyTypesLoading, setPropertyTypesLoading] = useState(true);
  const [showCreatePropertyTypeModal, setShowCreatePropertyTypeModal] = useState(false);
  const [creatingPropertyTypeName, setCreatingPropertyTypeName] = useState("");
  const [creatingPropertyType, setCreatingPropertyType] = useState(false);
  const [editingPropertyType, setEditingPropertyType] = useState<PropertyTypeItem | null>(null);
  const [editingPropertyTypeName, setEditingPropertyTypeName] = useState("");
  const [savingPropertyType, setSavingPropertyType] = useState(false);
  const [deletingPropertyType, setDeletingPropertyType] = useState<PropertyTypeItem | null>(null);
  const [deletingPropertyTypeBusy, setDeletingPropertyTypeBusy] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  const loadRoles = async () => {
    setLoading(true);
    setError("");
    try {
      const items = await getRoles();
      setRoles(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoles();
  }, []);

  const loadPermissionItems = async () => {
    try {
      const items = await getPermissions();
      setPermissionItems(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load permissions");
    }
  };

  useEffect(() => {
    void loadPermissionItems();
  }, []);

  const loadPropertyTypes = async () => {
    setPropertyTypesLoading(true);
    setError("");
    try {
      const items = await getPropertyTypes();
      setPropertyTypes(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load property types");
    } finally {
      setPropertyTypesLoading(false);
    }
  };

  useEffect(() => {
    void loadPropertyTypes();
  }, []);

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const response = await getNotifications(8);
      setNotifications(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.name.localeCompare(b.name)),
    [roles]
  );
  const sortedPropertyTypes = useMemo(
    () => [...propertyTypes].sort((a, b) => a.name.localeCompare(b.name)),
    [propertyTypes]
  );
  const groupedPermissions = useMemo(() => {
    const used = new Set<string>();
    const groups = permissionGroups
      .map((group) => ({
        title: group.title,
        items: group.keys
          .map((key) => permissionItems.find((item) => item.key === key))
          .filter((item): item is PermissionItem => Boolean(item))
      }))
      .filter((group) => {
        group.items.forEach((item) => used.add(item.key));
        return group.items.length > 0;
      });

    const remaining = permissionItems.filter((item) => !used.has(item.key));
    if (remaining.length) {
      groups.push({ title: "Other Access", items: remaining });
    }

    return groups;
  }, [permissionItems]);

  const handleCreateRole = async () => {
    if (!creatingName.trim()) {
      setError("Role name is required.");
      return;
    }

    setCreating(true);
    setError("");
    setNotice("");
    try {
      const role = await createRole({ name: creatingName.trim() });
      setRoles((prev) => [...prev, role]);
      setCreatingName("");
      setShowCreateModal(false);
      setNotice(`Role "${role.name}" created successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRole || !editingName.trim()) {
      setError("Role name is required.");
      return;
    }

    setSavingEdit(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateRole(editingRole.id, { name: editingName.trim() });
      setRoles((prev) => prev.map((role) => (role.id === updated.id ? updated : role)));
      setEditingRole(null);
      setEditingName("");
      setNotice(`Role "${updated.name}" updated successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deletingRole) {
      return;
    }

    setDeleting(true);
    setError("");
    setNotice("");
    try {
      await deleteRole(deletingRole.id);
      setRoles((prev) => prev.filter((role) => role.id !== deletingRole.id));
      setNotice(`Role "${deletingRole.name}" deleted successfully.`);
      setDeletingRole(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete role");
    } finally {
      setDeleting(false);
    }
  };

  const openPermissionsModal = async (role: RoleItem) => {
    setPermissionRole(role);
    setPermissionsLoading(true);
    setError("");
    setNotice("");
    try {
      const assigned = await getRolePermissions(role.id);
      setSelectedPermissions(assigned);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load role access");
      setPermissionRole(null);
    } finally {
      setPermissionsLoading(false);
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

  const handleSavePermissions = async () => {
    if (!permissionRole) {
      return;
    }

    setSavingPermissions(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateRolePermissions(permissionRole.id, selectedPermissions);
      setSelectedPermissions(updated);
      setNotice(`Access updated for "${permissionRole.name}".`);
      setPermissionRole(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save role access");
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleCreatePropertyType = async () => {
    if (!creatingPropertyTypeName.trim()) {
      setError("Property type name is required.");
      return;
    }

    setCreatingPropertyType(true);
    setError("");
    setNotice("");
    try {
      const item = await createPropertyType({ name: creatingPropertyTypeName.trim() });
      setPropertyTypes((prev) => [...prev, item]);
      setCreatingPropertyTypeName("");
      setShowCreatePropertyTypeModal(false);
      setNotice(`Property type "${item.name}" created successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create property type");
    } finally {
      setCreatingPropertyType(false);
    }
  };

  const handleSavePropertyType = async () => {
    if (!editingPropertyType || !editingPropertyTypeName.trim()) {
      setError("Property type name is required.");
      return;
    }

    setSavingPropertyType(true);
    setError("");
    setNotice("");
    try {
      const updated = await updatePropertyType(editingPropertyType.id, { name: editingPropertyTypeName.trim() });
      setPropertyTypes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingPropertyType(null);
      setEditingPropertyTypeName("");
      setNotice(`Property type "${updated.name}" updated successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update property type");
    } finally {
      setSavingPropertyType(false);
    }
  };

  const handleDeletePropertyType = async () => {
    if (!deletingPropertyType) {
      return;
    }

    setDeletingPropertyTypeBusy(true);
    setError("");
    setNotice("");
    try {
      await deletePropertyType(deletingPropertyType.id);
      setPropertyTypes((prev) => prev.filter((item) => item.id !== deletingPropertyType.id));
      setNotice(`Property type "${deletingPropertyType.name}" deleted successfully.`);
      setDeletingPropertyType(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete property type");
    } finally {
      setDeletingPropertyTypeBusy(false);
    }
  };

  return (
    <section className="space-y-3">
      <Card className="rounded-sm">
        <CardHeader className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-gray-800">Modules</CardTitle>
            {activeTab === "roles" ? (
              <Button className="h-8 px-3 text-xs" onClick={() => setShowCreateModal(true)}>
                Create Role
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-0">
          <div className="border-b border-gray-200">
            <div className="flex items-end gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`rounded-t-sm border border-b-0 px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-transparent bg-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
            </div>
          </div>

          {notice ? <p className="text-xs text-green-600">{notice}</p> : null}
          {error ? <p className="text-xs text-red-600">{error}</p> : null}

          {activeTab === "roles" ? (
            <div className="space-y-3">
              {loading ? <p className="text-xs text-gray-500">Loading roles...</p> : null}
              {!loading ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500">
                        <th className="px-3 py-2 font-medium">Role</th>
                        <th className="px-3 py-2 font-medium">Slug</th>
                        <th className="px-3 py-2 font-medium">Users</th>
                        <th className="px-3 py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRoles.map((role) => (
                        <tr key={role.id} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-gray-700">
                            <Badge variant="secondary">{role.name}</Badge>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{role.slug || "-"}</td>
                          <td className="px-3 py-2 text-gray-600">{Number(role.user_count ?? 0)}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                className="h-7 text-[11px]"
                                onClick={() => {
                                  setEditingRole(role);
                                  setEditingName(role.name);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                className="h-7 text-[11px]"
                                onClick={() => void openPermissionsModal(role)}
                              >
                                Access
                              </Button>
                              <Button
                                variant="ghost"
                                className="h-7 text-[11px] text-red-600 hover:bg-gray-100"
                                onClick={() => setDeletingRole(role)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "property-types" ? (
            <div className="space-y-3">
              <div className="rounded-sm border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                Property types are hardcoded across the CRM and are no longer editable from this module.
              </div>
              {propertyTypesLoading ? <p className="text-xs text-gray-500">Loading property types...</p> : null}
              {!propertyTypesLoading ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500">
                        <th className="px-3 py-2 font-medium">Property Type</th>
                        <th className="px-3 py-2 font-medium">Slug</th>
                        <th className="px-3 py-2 font-medium">Properties</th>
                        <th className="px-3 py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPropertyTypes.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-gray-700">
                            <Badge variant="secondary">{item.name}</Badge>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{item.slug}</td>
                          <td className="px-3 py-2 text-gray-600">{Number(item.property_count ?? 0)}</td>
                          <td className="px-3 py-2 text-gray-500">Fixed</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "notifications" ? (
            <div className="space-y-3">
              <Card className="rounded-sm border-dashed shadow-none">
                <CardContent className="grid gap-3 p-4 text-xs text-gray-600 md:grid-cols-3">
                  <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">Live Events</p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">Lead assignment and status changes</p>
                  </div>
                  <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">Task Activity</p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">New assignments, reassignments, completion</p>
                  </div>
                  <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">Delivery</p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">Bell icon in the navbar inbox</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-sm shadow-none">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm text-gray-800">Recent Notifications</CardTitle>
                    <Button variant="outline" className="h-8 text-xs" onClick={() => void loadNotifications()}>
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {notificationsLoading ? <p className="text-xs text-gray-500">Loading notifications...</p> : null}
                  {!notificationsLoading && notifications.length ? (
                    <div className="space-y-2">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`rounded-sm border px-3 py-2 ${notification.isRead ? "border-gray-200 bg-white" : "border-blue-200 bg-blue-50"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-gray-800">{notification.title}</p>
                            {!notification.isRead ? <Badge variant="secondary">Unread</Badge> : null}
                          </div>
                          <p className="mt-1 text-xs text-gray-600">{notification.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {!notificationsLoading && !notifications.length ? <p className="text-xs text-gray-500">No notifications yet.</p> : null}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4">
          <div className="w-full max-w-sm rounded-sm border border-gray-200 bg-white p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-gray-800">Create Role</h2>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">Role Name</label>
              <Input
                className="h-9 text-xs"
                value={creatingName}
                onChange={(event) => setCreatingName(event.target.value)}
                placeholder="e.g. Telecaller"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" className="h-8 text-xs" disabled={creating} onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button className="h-8 text-xs" disabled={creating} onClick={() => void handleCreateRole()}>
                {creating ? "Creating..." : "Create Role"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {editingRole ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4">
          <div className="w-full max-w-sm rounded-sm border border-gray-200 bg-white p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-gray-800">Edit Role</h2>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">Role Name</label>
              <Input className="h-9 text-xs" value={editingName} onChange={(event) => setEditingName(event.target.value)} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" className="h-8 text-xs" disabled={savingEdit} onClick={() => setEditingRole(null)}>
                Cancel
              </Button>
              <Button className="h-8 text-xs" disabled={savingEdit} onClick={() => void handleSaveEdit()}>
                {savingEdit ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deletingRole ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4">
          <div className="w-full max-w-sm rounded-sm border border-gray-200 bg-white p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-gray-800">Delete Role</h2>
            <p className="mt-2 text-xs text-gray-600">
              Delete role <span className="font-medium text-gray-800">{deletingRole.name}</span>?
            </p>
            <p className="mt-1 text-[11px] text-gray-500">Roles assigned to users cannot be deleted.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" className="h-8 text-xs" disabled={deleting} onClick={() => setDeletingRole(null)}>
                Cancel
              </Button>
              <Button className="h-8 text-xs bg-red-600 hover:bg-red-700" disabled={deleting} onClick={() => void handleDeleteRole()}>
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showCreatePropertyTypeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4">
          <div className="w-full max-w-sm rounded-sm border border-gray-200 bg-white p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-gray-800">Create Property Type</h2>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">Property Type Name</label>
              <Input
                className="h-9 text-xs"
                value={creatingPropertyTypeName}
                onChange={(event) => setCreatingPropertyTypeName(event.target.value)}
                placeholder="e.g. Apartment"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" className="h-8 text-xs" disabled={creatingPropertyType} onClick={() => setShowCreatePropertyTypeModal(false)}>
                Cancel
              </Button>
              <Button className="h-8 text-xs" disabled={creatingPropertyType} onClick={() => void handleCreatePropertyType()}>
                {creatingPropertyType ? "Creating..." : "Create Property Type"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {editingPropertyType ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4">
          <div className="w-full max-w-sm rounded-sm border border-gray-200 bg-white p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-gray-800">Edit Property Type</h2>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">Property Type Name</label>
              <Input className="h-9 text-xs" value={editingPropertyTypeName} onChange={(event) => setEditingPropertyTypeName(event.target.value)} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" className="h-8 text-xs" disabled={savingPropertyType} onClick={() => setEditingPropertyType(null)}>
                Cancel
              </Button>
              <Button className="h-8 text-xs" disabled={savingPropertyType} onClick={() => void handleSavePropertyType()}>
                {savingPropertyType ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deletingPropertyType ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4">
          <div className="w-full max-w-sm rounded-sm border border-gray-200 bg-white p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-gray-800">Delete Property Type</h2>
            <p className="mt-2 text-xs text-gray-600">
              Delete property type <span className="font-medium text-gray-800">{deletingPropertyType.name}</span>?
            </p>
            <p className="mt-1 text-[11px] text-gray-500">Property types used by properties cannot be deleted.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" className="h-8 text-xs" disabled={deletingPropertyTypeBusy} onClick={() => setDeletingPropertyType(null)}>
                Cancel
              </Button>
              <Button className="h-8 text-xs bg-red-600 hover:bg-red-700" disabled={deletingPropertyTypeBusy} onClick={() => void handleDeletePropertyType()}>
                {deletingPropertyTypeBusy ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {permissionRole
        ? createPortal(
            <div className="fixed inset-0 z-[100] bg-gray-950/40">
              <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
                <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-sm border border-gray-200 bg-white shadow-xl">
                  <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-800">Role Access</h2>
                      <p className="mt-1 text-xs text-gray-500">
                        Configure page access for <span className="font-medium text-gray-700">{permissionRole.name}</span>
                      </p>
                    </div>
                    <Button variant="outline" className="h-8 text-xs" onClick={() => setPermissionRole(null)}>
                      Close
                    </Button>
                  </div>

                  <div className="max-h-[78vh] overflow-y-auto px-5 py-4">
                    {permissionsLoading ? <p className="text-xs text-gray-500">Loading permissions...</p> : null}
                    {!permissionsLoading ? (
                      <div className="grid gap-4 xl:grid-cols-2">
                        {groupedPermissions.map((group) => (
                          <section key={group.title} className="rounded-sm border border-gray-200 bg-gray-50/60 p-4">
                            <div className="border-b border-gray-200 pb-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-700">{group.title}</p>
                            </div>
                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                              {group.items.map((permission) => {
                                const checked = selectedPermissions.includes(permission.key);
                                return (
                                  <label
                                    key={permission.key}
                                    className="flex min-h-[78px] items-start gap-3 rounded-sm border border-gray-200 bg-white px-3 py-3 text-xs"
                                  >
                                    <input
                                      type="checkbox"
                                      className="mt-0.5 cursor-pointer"
                                      checked={checked}
                                      onChange={(event) => togglePermission(permission.key, event.target.checked)}
                                    />
                                    <span>
                                      <span className="block font-medium text-gray-800">
                                        {permission.key.replace(/_/g, " ")}
                                      </span>
                                      <span className="mt-1 block text-gray-500">
                                        {permission.description || "No description"}
                                      </span>
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </section>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
                    <Button variant="outline" className="h-8 text-xs" disabled={savingPermissions} onClick={() => setPermissionRole(null)}>
                      Cancel
                    </Button>
                    <Button className="h-8 text-xs" disabled={savingPermissions || permissionsLoading} onClick={() => void handleSavePermissions()}>
                      {savingPermissions ? "Saving..." : "Save Access"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
