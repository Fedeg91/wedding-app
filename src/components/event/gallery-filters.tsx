import { ArrowDownUp, Users } from "lucide-react";
import type { Guest } from "@/types";

export type SortOrder = "newest" | "oldest";

export function GalleryFilters({ guests, guestId, sortOrder, onGuestChange, onSortChange }: { guests: Guest[]; guestId: string; sortOrder: SortOrder; onGuestChange: (value: string) => void; onSortChange: (value: SortOrder) => void }) {
  const selectClass = "min-h-11 appearance-none rounded-full border border-stone-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-stone-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100";
  return (
    <div className="sticky top-16 z-20 border-b border-stone-100 bg-[#faf9f7]/95 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        <label className="relative shrink-0"><Users className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" /><span className="sr-only">Filtra per invitato</span><select className={selectClass} value={guestId} onChange={(e) => onGuestChange(e.target.value)}><option value="all">Tutte le foto</option>{guests.map((guest) => <option value={guest.id} key={guest.id}>{guest.nickname}</option>)}</select></label>
        <label className="relative shrink-0"><ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" /><span className="sr-only">Ordina le foto</span><select className={selectClass} value={sortOrder} onChange={(e) => onSortChange(e.target.value as SortOrder)}><option value="newest">Più recenti</option><option value="oldest">Meno recenti</option></select></label>
      </div>
    </div>
  );
}
