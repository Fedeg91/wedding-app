import { Heart } from "lucide-react";
import type { Event, Guest } from "@/types";

export function EventHeader({ event, guest, onProfile }: { event: Event; guest: Guest; onProfile: () => void }) {
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-stone-200/70 bg-[#faf9f7]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
        <div><h1 className="font-serif text-xl leading-none text-stone-900">{event.title}</h1><p className="mt-1 text-[11px] text-stone-500">La nostra gallery</p></div>
        <button type="button" onClick={onProfile} className="flex min-h-11 items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-stone-200" aria-label={`Stai pubblicando come ${guest.nickname}. Tocca per modificare.`}><Heart className="size-3.5 fill-rose-400 text-rose-400" /><span className="max-w-28 truncate text-xs font-semibold text-stone-600">{guest.nickname}</span></button>
      </div>
    </header>
  );
}
