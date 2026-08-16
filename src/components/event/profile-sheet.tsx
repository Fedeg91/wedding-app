"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Guest } from "@/types";

export function ProfileSheet({ open, onOpenChange, guest, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; guest: Guest; onSave: (nickname: string) => Promise<void> }) {
  const [nickname, setNickname] = useState(guest.nickname);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) { event.preventDefault(); const clean = nickname.trim(); if (!clean || clean === guest.nickname) { onOpenChange(false); return; } setSaving(true); setError(null); try { await onSave(clean); onOpenChange(false); } catch { setError("Non siamo riusciti ad aggiornare il nickname. Riprova."); } finally { setSaving(false); } }
  function changeOpen(next: boolean) { if (saving) return; if (!next) { setNickname(guest.nickname); setError(null); } onOpenChange(next); }
  return <Dialog open={open} onOpenChange={changeOpen}><DialogContent><DialogTitle className="pr-12 font-serif text-2xl">Il tuo profilo</DialogTitle><DialogDescription>Stai pubblicando come <strong>{guest.nickname}</strong>. Il nuovo nome comparirà anche sulle foto già condivise.</DialogDescription><form className="mt-5 space-y-3" onSubmit={submit}><label htmlFor="edit-nickname" className="text-sm font-semibold text-stone-700">Nickname</label><Input id="edit-nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={40} autoFocus />{error && <p className="text-sm text-red-600" role="alert">{error}</p>}<Button className="w-full" disabled={saving || !nickname.trim()}>{saving ? "Salvataggio…" : "Salva nickname"}</Button></form></DialogContent></Dialog>;
}
