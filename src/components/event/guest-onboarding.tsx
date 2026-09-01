"use client";

import { FormEvent, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Event } from "@/types";
import { AvatarPicker } from "./avatar-picker";
import type { AvatarId } from "@/features/guests/avatars";

export function GuestOnboarding({
  event,
  onComplete,
  pending,
  error,
}: {
  event: Event;
  onComplete: (nickname: string, avatarKey: AvatarId) => void;
  pending?: boolean;
  error?: string | null;
}) {
  const [nickname, setNickname] = useState("");
  const [avatarKey, setAvatarKey] = useState<AvatarId>("fox");

  function submit(e: FormEvent) {
    e.preventDefault();
    const cleanNickname = nickname.trim();
    if (!cleanNickname) return;
    onComplete(cleanNickname, avatarKey);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,#fff1f2,transparent_48%)] px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <section className="w-full max-w-sm text-center">
        <div className="mx-auto mb-7 flex size-16 items-center justify-center rounded-full bg-rose-100 text-rose-500">
          <Heart className="size-7 fill-current" />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-rose-500">
          Benvenuto al matrimonio di
        </p>
        <h1 className="font-serif text-4xl text-stone-800">{event.title}</h1>
        <p className="mx-auto mt-4 max-w-xs leading-relaxed text-stone-500">
          Scegli il nome che gli altri invitati vedranno accanto alle tue foto.
        </p>
        <form className="mt-9 space-y-3 text-left" onSubmit={submit}>
          <label
            htmlFor="nickname"
            className="ml-1 text-sm font-semibold text-stone-700">
            Il tuo nickname
          </label>
          <Input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Es. Anna"
            maxLength={32}
            autoFocus
            autoComplete="nickname"
          />
          <div className="pt-3"><AvatarPicker value={avatarKey} onChange={setAvatarKey} disabled={pending} /></div>
          {error && (
            <p
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert">
              {error}
            </p>
          )}
          <Button
            className="mt-3 w-full"
            type="submit"
            disabled={!nickname.trim() || pending}>
            {pending ? "Registrazione…" : "Entra nella gallery"}{" "}
            <Heart className="size-4" />
          </Button>
        </form>
        <p className="mt-6 text-xs leading-relaxed text-stone-400">
          Nessun account necessario. Il nickname resta salvato su questo
          dispositivo.
        </p>
      </section>
    </main>
  );
}
