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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AssignModal } from "@/components/AssignModal";
import { DutiesModal } from "@/components/DutiesModal";
import { TeamSidebar } from "@/components/TeamSidebar";
import { InviteModal } from "@/components/InviteModal";
import {
  AlertTriangle,
  BookOpen,
  Users2,
  CheckCircle2,
  Circle,
  Zap,
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
  email: string;
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
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RoleAssignmentBoard({
  projectId,
  ownerId,
  currentUserId,
  roles,
  members: initialMembers,
  assignments: initialAssignments,
}: RoleAssignmentBoardProps) {
  const isOwner = currentUserId === ownerId;

  const [assignments, setAssignments] =
    useState<Assignment[]>(initialAssignments);
  const [members, setMembers] = useState<Member[]>(initialMembers);

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

  // Critical unassigned roles
  const criticalUnassigned = roles.filter((r) => {
    if (!r.isCritical) return false;
    const a = getAssignment(r.id);
    return !a || a.assignedMemberId === null;
  });

  const assignedCount = assignments.filter(
    (a) => a.assignedMemberId !== null
  ).length;
  const totalRoles = roles.length;

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
      {/* Critical warning banner */}
      {criticalUnassigned.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {criticalUnassigned.length} Critical Role
            {criticalUnassigned.length > 1 ? "s" : ""} Unassigned
          </AlertTitle>
          <AlertDescription>
            <span className="font-medium">
              {criticalUnassigned.map((r) => r.name).join(", ")}
            </span>{" "}
            must be filled before shoot day.
          </AlertDescription>
        </Alert>
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
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              Invite Member
            </Button>
          </div>
        )}
      </div>

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
              {roles
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
