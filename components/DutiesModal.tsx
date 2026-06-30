"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

interface DutiesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleName: string;
  category: string;
  isCritical: boolean;
  duties: string[];
}

export function DutiesModal({
  open,
  onOpenChange,
  roleName,
  category,
  isCritical,
  duties,
}: DutiesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {roleName}
            <Badge variant="secondary">{category}</Badge>
            {isCritical && <Badge variant="critical">Critical</Badge>}
          </DialogTitle>
          <DialogDescription>Full list of responsibilities</DialogDescription>
        </DialogHeader>

        {duties.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-2">No duties defined for this role yet.</p>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {duties.map((duty, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-700">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                <span>{duty}</span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
