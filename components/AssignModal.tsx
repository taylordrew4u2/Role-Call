"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, UserCheck } from "lucide-react";

interface Member {
  id: number;
  displayName: string;
  email: string | null;
}

interface AssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleName: string;
  roleId: number;
  isCritical: boolean;
  members: Member[];
  currentAssignedId: number | null;
  currentBackupId: number | null;
  onAssign: (
    roleId: number,
    assignedId: number | null,
    backupId: number | null
  ) => Promise<void>;
}

export function AssignModal({
  open,
  onOpenChange,
  roleName,
  roleId,
  isCritical,
  members,
  currentAssignedId,
  currentBackupId,
  onAssign,
}: AssignModalProps) {
  const [search, setSearch] = useState("");
  const [assignedId, setAssignedId] = useState<number | null>(
    currentAssignedId
  );
  const [backupId, setBackupId] = useState<number | null>(currentBackupId);
  const [saving, setSaving] = useState(false);

  const filtered = members.filter(
    (m) =>
      m.displayName.toLowerCase().includes(search.toLowerCase()) ||
      (m.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleSave() {
    setSaving(true);
    try {
      await onAssign(roleId, assignedId, backupId);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  function selectMember(id: number) {
    // If clicking the already-assigned primary, move to backup
    if (assignedId === id) {
      setAssignedId(null);
    } else if (backupId === id) {
      setBackupId(null);
    } else if (assignedId === null) {
      setAssignedId(id);
    } else if (backupId === null) {
      setBackupId(id);
    } else {
      // Replace primary
      setAssignedId(id);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-slate-600" />
            Assign Role
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-slate-800">{roleName}</span>
            {isCritical && (
              <Badge variant="critical" className="ml-2">
                Critical
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search team members…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search members"
          />
        </div>

        {/* Assignment slots summary */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-slate-200 p-3">
            <Label className="text-xs text-slate-500 uppercase tracking-wide">
              Primary
            </Label>
            <p className="mt-1 font-medium text-slate-900 truncate">
              {assignedId
                ? members.find((m) => m.id === assignedId)?.displayName
                : "— unassigned —"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <Label className="text-xs text-slate-500 uppercase tracking-wide">
              Backup
            </Label>
            <p className="mt-1 font-medium text-slate-900 truncate">
              {backupId
                ? members.find((m) => m.id === backupId)?.displayName
                : "— none —"}
            </p>
          </div>
        </div>

        {/* Member list */}
        <div className="relative max-h-56 overflow-y-auto space-y-1 rounded-md border border-slate-200 p-1 after:pointer-events-none after:absolute after:bottom-0 after:inset-x-0 after:h-6 after:rounded-b-md after:bg-gradient-to-t after:from-white after:to-transparent">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No members found
            </p>
          ) : (
            filtered.map((member) => {
              const isPrimary = assignedId === member.id;
              const isBackup = backupId === member.id;
              return (
                <button
                  key={member.id}
                  onClick={() => selectMember(member.id)}
                  aria-label={`Assign ${member.displayName}`}
                  className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors
                    ${isPrimary ? "bg-slate-900 text-white" : isBackup ? "bg-slate-200 text-slate-900" : "hover:bg-slate-100 text-slate-900"}`}
                >
                  <span className="font-medium">{member.displayName}</span>
                  <span
                    className={`text-xs ${isPrimary ? "text-slate-300" : "text-slate-500"}`}
                  >
                    {isPrimary ? "Primary" : isBackup ? "Backup" : member.email ?? ""}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <p className="text-xs text-slate-400">
          Click once to set Primary · click again to set Backup · click a third
          time to remove
        </p>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setAssignedId(null);
              setBackupId(null);
            }}
          >
            Clear
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
