import Image from "next/image";
import { Check } from "lucide-react";
import { AVATARS, avatarUrl, type AvatarId } from "@/features/guests/avatars";
import { cn } from "@/lib/utils";

export function AvatarPicker({ value, onChange, disabled }: { value: AvatarId; onChange: (value: AvatarId) => void; disabled?: boolean }) {
  return <fieldset disabled={disabled}><legend className="mb-3 text-sm font-semibold text-stone-700">Scegli il tuo avatar</legend><div className="grid grid-cols-6 gap-x-5 gap-y-7">{AVATARS.map((avatar) => <button type="button" onClick={() => onChange(avatar.id)} aria-label={`Scegli ${avatar.label}`} aria-pressed={value === avatar.id} className="relative aspect-square transition hover:scale-105 focus-visible:outline-none" key={avatar.id}><span className={cn("absolute inset-0 overflow-hidden rounded-full ring-2", value === avatar.id ? "ring-rose-500 ring-offset-2" : "ring-transparent")}><Image src={avatarUrl(avatar.id)} alt={avatar.label} fill sizes="64px" className="object-cover" /></span>{value === avatar.id && <span className="absolute -right-4 top-1/2 z-10 flex size-5 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm ring-2 ring-white"><Check className="size-3" /></span>}</button>)}</div></fieldset>;
}
