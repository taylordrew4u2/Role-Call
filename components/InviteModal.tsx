"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UserPlus,
  Copy,
  Check,
  Link as LinkIcon,
  PenLine,
  Megaphone,
  Share2,
  RotateCcw,
} from "lucide-react";

type Position = "writer" | "director";

// Web Share API support is a static, client-only fact; reading it through
// useSyncExternalStore keeps SSR markup (no share button) hydration-safe.
const emptySubscribe = () => () => {};
function useCanShare() {
  return useSyncExternalStore(
    emptySubscribe,
    () => !!navigator.share,
    () => false
  );
}

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
  // Shareable join link — the primary, zero-setup way to add people.
  const [joinUrl, setJoinUrl] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [joinCopied, setJoinCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const canShare = useCanShare();

  // Per-person invite (assigns a position like writer/director).
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [position, setPosition] = useState<Position>("director");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || joinUrl) return;
    let cancelled = false;
    (async () => {
      setLinkLoading(true);
      setLinkError("");
      try {
        const res = await fetch(`/api/projects/${projectId}/invite-link`);
        const d = await res.json();
        if (cancelled) return;
        if (res.ok) setJoinUrl(d.joinUrl || "");
        else setLinkError(d.error || "Couldn't load the join link.");
      } catch {
        if (!cancelled) setLinkError("Couldn't load the join link.");
      } finally {
        if (!cancelled) setLinkLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, joinUrl, projectId]);

  async function copyText(
    text: string,
    setFlag: (v: boolean) => void
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setFlag(true);
      setTimeout(() => setFlag(false), 2000);
    } catch {
      setError("Couldn't copy — select and copy the link manually.");
    }
  }

  async function shareJoinLink() {
    try {
      await navigator.share({
        title: "Join my project on RoleCall",
        url: joinUrl,
      });
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  }

  async function resetJoinLink() {
    setResetting(true);
    setLinkError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/invite-link`, {
        method: "POST",
      });
      const d = await res.json();
      if (res.ok) setJoinUrl(d.joinUrl || "");
      else setLinkError(d.error || "Couldn't reset the join link.");
    } catch {
      setLinkError("Network error. Please try again.");
    } finally {
      setResetting(false);
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
            Add People
          </DialogTitle>
          <DialogDescription>
            Share one link with your whole team — anyone who opens it joins
            this project instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="join-link">Project join link</Label>
            <div className="flex items-center gap-2">
              <Input
                id="join-link"
                readOnly
                value={linkLoading ? "Loading…" : joinUrl}
                onFocus={(e) => e.target.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyText(joinUrl, setJoinCopied)}
                disabled={!joinUrl}
                className="shrink-0 gap-1.5"
              >
                {joinCopied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy
                  </>
                )}
              </Button>
              {canShare && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={shareJoinLink}
                  disabled={!joinUrl}
                  aria-label="Share join link"
                  className="shrink-0 px-2"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-500">
              People join as crew and can be given roles afterwards.{" "}
              <button
                type="button"
                onClick={resetJoinLink}
                disabled={resetting || !joinUrl}
                className="inline-flex items-center gap-1 text-slate-600 underline hover:no-underline disabled:opacity-50"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                {resetting ? "Resetting…" : "Reset link"}
              </button>{" "}
              to revoke copies you&apos;ve already shared.
            </p>
            {linkError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                {linkError}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1" role="separator">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">
              or invite someone by name
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

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
                  onClick={() => copyText(inviteUrl, setCopied)}
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

          <Button
            onClick={handleSend}
            disabled={sending}
            variant="outline"
            className="w-full gap-2"
          >
            <LinkIcon className="h-4 w-4" />
            {sending ? "Creating…" : "Create personal invite link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
