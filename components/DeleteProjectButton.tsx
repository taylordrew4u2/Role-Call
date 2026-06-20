"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteProjectButton({
  projectId,
  projectTitle,
}: {
  projectId: number;
  projectTitle: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Delete "${projectTitle}"? This permanently removes the project and all its roles, cast, script, shots and schedule. This cannot be undone.`
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        alert("Couldn't delete the project. Please try again.");
        setDeleting(false);
      }
    } catch {
      alert("Network error. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={deleting}
      className="text-slate-500 hover:text-red-600"
      title="Delete project"
    >
      <Trash2 className="h-4 w-4 sm:mr-1" />
      <span className="hidden sm:inline">{deleting ? "Deleting…" : "Delete"}</span>
    </Button>
  );
}
