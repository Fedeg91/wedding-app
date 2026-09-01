"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AvatarId } from "@/features/guests/avatars";
import type { Guest } from "@/types";
import { AvatarPicker } from "./avatar-picker";

export function ProfileSheet({ open, onOpenChange, guest, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; guest: Guest; onSave: (nickname: string, avatarKey: AvatarId) => Promise<void> }) {
  const [nickname, setNickname] = useState(guest.nickname);
  const [avatarKey, setAvatarKey] = useState<AvatarId>(guest.avatarKey);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) { event.preventDefault(); const clean = nickname.trim(); if (!clean || (clean === guest.nickname && avatarKey === guest.avatarKey)) { onOpenChange(false); return; } setSaving(true); setError(null); try { await onSave(clean, avatarKey); onOpenChange(false); } catch { setError("Non siamo riusciti ad aggiornare il profilo. Riprova."); } finally { setSaving(false); } }
  function changeOpen(next: boolean) { if (saving) return; if (!next) { setNickname(guest.nickname); setAvatarKey(guest.avatarKey); setError(null); } onOpenChange(next); }
  return <Dialog open={open} onOpenChange={changeOpen}><DialogContent><DialogTitle className="pr-12 font-serif text-2xl">Il tuo profilo</DialogTitle><DialogDescription>Stai pubblicando come <strong>{guest.nickname}</strong>. Nome e avatar compariranno anche sulle foto già condivise.</DialogDescription><form className="mt-5 space-y-4" onSubmit={submit}><div><label htmlFor="edit-nickname" className="mb-2 block text-sm font-semibold text-stone-700">Nickname</label><Input id="edit-nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={40} autoFocus /></div><AvatarPicker value={avatarKey} onChange={setAvatarKey} disabled={saving} />{error && <p className="text-sm text-red-600" role="alert">{error}</p>}<Button className="w-full" disabled={saving || !nickname.trim()}>{saving ? "Salvataggio…" : "Salva profilo"}</Button></form></DialogContent></Dialog>;
}
