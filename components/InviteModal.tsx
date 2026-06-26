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
import { UserPlus, Copy, Check, Link as LinkIcon, PenLine, Megaphone } from "lucide-react";

type Position = "writer" | "director";

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
  const [position, setPosition] = useState<Position>("director");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — select and copy the link manually.");
    }
  }

  async function handleSend() {
    setError("");
    setSuccess("");
    setInviteUrl("");
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name,
          email: email || undefined,
          position,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Failed to create invite.");
      } else {
        setInviteUrl(d.inviteUrl || "");
        const emailed = email && d.emailStatus === "sent";
        const role = position === "writer" ? "writer" : "director";
        setSuccess(
          emailed
            ? `Invite link created and emailed to ${email} as ${role}. You can also copy it below.`
            : `Invite link created for ${name} as ${role}. Copy it below and send it to them.`
        );
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
            Enter a name to generate an invite link you can copy and send. Email
            is optional — add it to also email them (when email is configured).
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

          <div className="space-y-1.5">
            <Label htmlFor="inv-role-group">Invite as</Label>
            <div id="inv-role-group" role="group" aria-label="Invite as" className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPosition("director")}
                aria-pressed={position === "director"}
                className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  position === "director"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Megaphone className="h-4 w-4" />
                Director
              </button>
              <button
                type="button"
                onClick={() => setPosition("writer")}
                aria-pressed={position === "writer"}
                className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  position === "writer"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <PenLine className="h-4 w-4" />
                Writer
              </button>
            </div>
            {position === "writer" && (
              <p className="text-xs text-slate-500">
                The writer can approve or decline suggested script edits once they
                join.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="inv-email">
              Email Address <span className="text-slate-400">(optional)</span>
            </Label>
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
          {inviteUrl && (
            <div className="space-y-1.5">
              <Label htmlFor="inv-link">Invite link</Label>
              <div className="flex items-center gap-2">
                <Input id="inv-link" readOnly value={inviteUrl} onFocus={(e) => e.target.select()} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyLink}
                  className="shrink-0 gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Anyone with this link can join the project.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="w-full gap-2"
          >
            <LinkIcon className="h-4 w-4" />
            {sending ? "Creating…" : "Create invite link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
