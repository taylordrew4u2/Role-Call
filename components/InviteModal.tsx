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
import { Mail, UserPlus, Copy, Check } from "lucide-react";

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
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Failed to add member.");
      } else {
        const sent = d.emailStatus === "sent";
        setInviteUrl(d.inviteUrl || "");
        setSuccess(
          sent
            ? `Invite emailed to ${email}.`
            : `${name} was added, but the email couldn't be sent. Share the invite link below directly.`
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
            They&apos;ll get an email invite — or you can copy the link and send
            it to them directly.
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
          {inviteUrl && (
            <div className="space-y-1.5">
              <Label>Invite link</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={inviteUrl} onFocus={(e) => e.target.select()} />
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
            <Mail className="h-4 w-4" />
            {sending ? "Sending…" : "Send Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
