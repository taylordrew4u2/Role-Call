"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { PRODUCTION_TYPES } from "@/lib/production-types";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500";

export function EditProjectButton({
  projectId,
  title: initialTitle,
  projectType: initialType,
  shootDate: initialDate,
  description: initialDescription,
}: {
  projectId: number;
  title: string;
  projectType: string | null;
  shootDate: string | null;
  description: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [projectType, setProjectType] = useState(initialType ?? "");
  const [shootDate, setShootDate] = useState(initialDate ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          projectType: projectType || null,
          shootDate: shootDate || null,
          description,
        }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        alert("Couldn't save changes. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-slate-500 hover:text-slate-900"
        title="Edit project"
      >
        <Pencil className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">Edit</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select
                className={selectClass}
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
              >
                <option value="">No type</option>
                {PRODUCTION_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Shoot date</Label>
              <Input
                type="date"
                value={shootDate}
                onChange={(e) => setShootDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !title.trim()}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
