"use client";

import { useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AssignModal } from "@/components/AssignModal";
import { DutiesModal } from "@/components/DutiesModal";
import { TeamSidebar } from "@/components/TeamSidebar";
import { InviteModal } from "@/components/InviteModal";
import {
  BookOpen,
  Users2,
  CheckCircle2,
  Circle,
  Zap,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Role {
  id: number;
  name: string;
  category: string;
  duties: string[];
  isCritical: boolean;
  sortOrder: number;
}

interface Member {
  id: number;
  displayName: string;
  email: string | null;
  status: string;
}

interface Assignment {
  id: number;
  roleId: number;
  assignedMemberId: number | null;
  backupMemberId: number | null;
  notes: string | null;
}

interface RoleAssignmentBoardProps {
  projectId: number;
  ownerId: string;
  currentUserId: string;
  roles: Role[];
  members: Member[];
  assignments: Assignment[];
  recommendedRoleNames?: string[];
  productionTypeLabel?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RoleAssignmentBoard({
  projectId,
  ownerId,
  currentUserId,
  roles,
  members: initialMembers,
  assignments: initialAssignments,
  recommendedRoleNames,
  productionTypeLabel,
}: RoleAssignmentBoardProps) {
  const isOwner = currentUserId === ownerId;

  const [assignments, setAssignments] =
    useState<Assignment[]>(initialAssignments);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [roleList, setRoleList] = useState<Role[]>(roles);

  // "Recommended only" filter, driven by the project's production type.
  const recommendedSet = new Set(recommendedRoleNames ?? []);
  const hasRecommended =
    recommendedSet.size > 0 && recommendedSet.size < roleList.length;
  const [recommendedOnly, setRecommendedOnly] = useState(hasRecommended);
  const visibleRoles =
    recommendedOnly && hasRecommended
      ? roleList.filter((r) => recommendedSet.has(r.name))
      : roleList;

  // Modal state
  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    role: Role | null;
  }>({ open: false, role: null });
  const [dutiesModal, setDutiesModal] = useState<{
    open: boolean;
    role: Role | null;
  }>({ open: false, role: null });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleCategory, setNewRoleCategory] = useState("");
  const [newRoleCritical, setNewRoleCritical] = useState(false);
  const [savingRole, setSavingRole] = useState(false);

  function openAddRole() {
    setEditingRole(null);
    setNewRoleName("");
    setNewRoleCategory("");
    setNewRoleCritical(false);
    setAddRoleOpen(true);
  }

  function openEditRole(role: Role) {
    setEditingRole(role);
    setNewRoleName(role.name);
    setNewRoleCategory(role.category);
    setNewRoleCritical(role.isCritical);
    setAddRoleOpen(true);
  }

  async function handleSaveRole() {
    if (!newRoleName.trim()) return;
    setSavingRole(true);
    try {
      const body = JSON.stringify({
        name: newRoleName,
        category: newRoleCategory,
        isCritical: newRoleCritical,
      });
      if (editingRole) {
        const res = await fetch(
          `/api/projects/${projectId}/roles/${editingRole.id}`,
          { method: "PATCH", headers: { "Content-Type": "application/json" }, body }
        );
        if (res.ok) {
          const updated = await res.json();
          const oldId = updated.replacedRoleId ?? editingRole.id;
          setRoleList((rs) =>
            rs.map((r) =>
              r.id === oldId ? { ...updated, duties: updated.duties ?? [] } : r
            )
          );
          if (updated.replacedRoleId) {
            setAssignments((as) =>
              as.map((a) =>
                a.roleId === updated.replacedRoleId ? { ...a, roleId: updated.id } : a
              )
            );
          }
          setAddRoleOpen(false);
        }
      } else {
        const res = await fetch(`/api/projects/${projectId}/roles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (res.ok) {
          const created = await res.json();
          setRoleList((rs) => [...rs, { ...created, duties: created.duties ?? [] }]);
          setAddRoleOpen(false);
        }
      }
    } finally {
      setSavingRole(false);
    }
  }

  async function handleRemoveRole(role: Role) {
    if (!confirm(`Remove "${role.name}" from this project?`)) return;
    const res = await fetch(`/api/projects/${projectId}/roles/${role.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setRoleList((rs) => rs.filter((r) => r.id !== role.id));
      setAssignments((as) => as.filter((a) => a.roleId !== role.id));
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getAssignment(roleId: number) {
    return assignments.find((a) => a.roleId === roleId) ?? null;
  }

  function getMember(id: number | null) {
    if (id === null) return null;
    return members.find((m) => m.id === id) ?? null;
  }

  // Members enriched with role counts for sidebar
  const membersWithCounts = members.map((m) => ({
    ...m,
    roleCount: assignments.filter((a) => a.assignedMemberId === m.id).length,
  }));

  const assignedCount = assignments.filter(
    (a) => a.assignedMemberId !== null
  ).length;
  const totalRoles = roleList.length;

  // ── Assign handler ────────────────────────────────────────────────────────

  const handleAssign = useCallback(
    async (
      roleId: number,
      assignedMemberId: number | null,
      backupMemberId: number | null
    ) => {
      const res = await fetch(`/api/projects/${projectId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, assignedMemberId, backupMemberId }),
      });
      if (!res.ok) throw new Error("Failed to save assignment");
      const updated: Assignment = await res.json();

      setAssignments((prev) => {
        const idx = prev.findIndex((a) => a.roleId === roleId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
    },
    [projectId]
  );

  // ── Load Lean Template ─────────────────────────────────────────────────────

  async function handleLoadTemplate() {
    if (members.length < 3) {
      alert(
        "The Lean 8-Person Template needs at least 3 team members. Please invite 2 more people first."
      );
      return;
    }
    if (
      !confirm(
        "This will overwrite all current assignments with the Lean 8-Person Template. Continue?"
      )
    )
      return;

    setLoadingTemplate(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/lean-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member1Id: members[0].id, // owner (person 1)
          member2Id: members[1].id, // person 2
          member3Id: members[2].id, // person 3
        }),
      });
      if (!res.ok) throw new Error("Template load failed");
      const result = await res.json();
      setAssignments(result.assignments);
    } catch (e) {
      alert("Failed to load template. Please try again.");
      console.error(e);
    } finally {
      setLoadingTemplate(false);
    }
  }

  // ── Reload members after invite ────────────────────────────────────────────

  async function reloadMembers() {
    const res = await fetch(`/api/projects/${projectId}/members`);
    if (res.ok) {
      const data = await res.json();
      setMembers(data);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Recommended-roles filter banner */}
      {hasRecommended && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm">
          <span className="text-slate-600">
            {recommendedOnly ? (
              <>
                Showing the{" "}
                <span className="font-medium text-slate-900">
                  {recommendedSet.size} roles
                </span>{" "}
                recommended
                {productionTypeLabel ? ` for a ${productionTypeLabel.toLowerCase()}` : ""}.
              </>
            ) : (
              <>Showing all {roleList.length} roles.</>
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRecommendedOnly((v) => !v)}
          >
            {recommendedOnly ? "Show all roles" : "Show recommended only"}
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {assignedCount}/{totalRoles} assigned
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:flex items-center gap-1">
            <Users2 className="h-4 w-4 text-slate-400" />
            {members.length} team member{members.length !== 1 ? "s" : ""}
          </span>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadTemplate}
              disabled={loadingTemplate}
              className="gap-1.5"
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              {loadingTemplate ? "Loading…" : "Load Lean 8-Person Template"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openAddRole}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Role
            </Button>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              Invite Member
            </Button>
          </div>
        )}
      </div>

      {/* Add role dialog */}
      <Dialog open={addRoleOpen} onOpenChange={setAddRoleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingRole ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingRole ? "Edit Role" : "Add a Role"}
            </DialogTitle>
            <DialogDescription>
              {editingRole
                ? "Changes apply to this project only."
                : "Add a custom role to this project. It won't affect your other projects."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="role-name">Role name</Label>
              <Input
                id="role-name"
                placeholder="e.g. Drone Operator"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="role-cat">Department</Label>
              <Input
                id="role-cat"
                placeholder="e.g. Camera"
                value={newRoleCategory}
                onChange={(e) => setNewRoleCategory(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={newRoleCritical}
                onChange={(e) => setNewRoleCritical(e.target.checked)}
              />
              Mark as a critical role
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRoleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={savingRole || !newRoleName.trim()}>
              {savingRole ? "Saving…" : editingRole ? "Save" : "Add Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main layout: table + sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Role table */}
        <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-[220px]">Responsibility</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="hidden lg:table-cell">Backup</TableHead>
                <TableHead>Status</TableHead>
                {isOwner && (
                  <TableHead className="text-right">Action</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRoles
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((role) => {
                  const assignment = getAssignment(role.id);
                  const assigned = getMember(
                    assignment?.assignedMemberId ?? null
                  );
                  const backup = getMember(
                    assignment?.backupMemberId ?? null
                  );
                  const isAssigned = !!assigned;

                  return (
                    <TableRow
                      key={role.id}
                      className={role.isCritical && !isAssigned ? "bg-red-50/30" : ""}
                    >
                      {/* Role name */}
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {role.isCritical && (
                            <span
                              className="h-2 w-2 rounded-full bg-red-500 shrink-0"
                              title="Critical role"
                            />
                          )}
                          <span className="text-slate-900">{role.name}</span>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{role.category}</Badge>
                      </TableCell>

                      {/* Assigned member */}
                      <TableCell>
                        {assigned ? (
                          <span className="text-slate-900 font-medium text-sm">
                            {assigned.displayName}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm italic">
                            Unassigned
                          </span>
                        )}
                      </TableCell>

                      {/* Backup */}
                      <TableCell className="hidden lg:table-cell text-sm text-slate-500">
                        {backup ? backup.displayName : "—"}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {isAssigned ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Assigned
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Circle className="h-3 w-3" />
                            Open
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      {isOwner && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setDutiesModal({ open: true, role })
                              }
                              title="View duties"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              <span className="sr-only">View Duties</span>
                            </Button>
                            <Button
                              size="sm"
                              variant={isAssigned ? "outline" : "default"}
                              onClick={() =>
                                setAssignModal({ open: true, role })
                              }
                            >
                              {isAssigned ? "Reassign" : "Assign"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditRole(role)}
                              title="Edit role"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Edit role</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveRole(role)}
                              title="Remove role from this project"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                              <span className="sr-only">Remove role</span>
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        {/* Sidebar */}
        <TeamSidebar
          members={membersWithCounts}
          projectId={projectId}
          onInvite={() => setInviteOpen(true)}
        />
      </div>

      {/* Modals */}
      {assignModal.role && (
        <AssignModal
          open={assignModal.open}
          onOpenChange={(open) => setAssignModal((s) => ({ ...s, open }))}
          roleName={assignModal.role.name}
          roleId={assignModal.role.id}
          isCritical={assignModal.role.isCritical}
          members={members}
          currentAssignedId={
            getAssignment(assignModal.role.id)?.assignedMemberId ?? null
          }
          currentBackupId={
            getAssignment(assignModal.role.id)?.backupMemberId ?? null
          }
          onAssign={handleAssign}
        />
      )}

      {dutiesModal.role && (
        <DutiesModal
          open={dutiesModal.open}
          onOpenChange={(open) => setDutiesModal((s) => ({ ...s, open }))}
          roleName={dutiesModal.role.name}
          category={dutiesModal.role.category}
          isCritical={dutiesModal.role.isCritical}
          duties={dutiesModal.role.duties}
        />
      )}

      <InviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        projectId={projectId}
        onInvited={reloadMembers}
      />
    </div>
  );
}
