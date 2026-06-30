"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "@/components/Toaster";

export function DeleteProjectButton({
  projectId,
  projectTitle,
}: {
  projectId: number;
  projectTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        toast("Couldn't delete the project. Please try again.", "error");
        setDeleting(false);
      }
    } catch {
      toast("Network error. Please try again.", "error");
      setDeleting(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-slate-500 hover:text-red-600"
        title="Delete project"
      >
        <Trash2 className="h-4 w-4 sm:mr-1" aria-hidden="true" />
        <span className="hidden sm:inline">Delete</span>
      </Button>

      <Dialog open={open} onOpenChange={(o) => !o && !deleting && setOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This permanently removes <strong>{projectTitle}</strong> and all its roles, cast,
              script, shots, and schedule. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" disabled={deleting} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
