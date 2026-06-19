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
import { Mail, UserPlus } from "lucide-react";

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onInvited: () => void;
}

export function InviteModal({
  open,
  onOpenChange,
  projectId,
  onInvited,
}: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSend() {
    setError("");
    setSuccess("");
    if (!email || !name) {
      setError("Name and email are required.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName: name }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to send invite.");
      } else {
        setSuccess(`Invite sent to ${email}!`);
        setEmail("");
        setName("");
        onInvited();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            They&apos;ll receive an email with a link to join the project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="inv-name">Display Name</Label>
            <Input
              id="inv-name"
              placeholder="e.g. Jordan Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="inv-email">Email Address</Label>
            <Input
              id="inv-email"
              type="email"
              placeholder="jordan@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-md px-3 py-2">
              {success}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="w-full gap-2"
          >
            <Mail className="h-4 w-4" />
            {sending ? "Sending…" : "Send Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
