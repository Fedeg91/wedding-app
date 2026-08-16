"use client";

import Image from "next/image";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Photo } from "@/types";

const formatter = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function PhotoCard({ photo, onOpen }: { photo: Photo; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const width = photo.width ?? 1200;
  const height = photo.height ?? 1200;
  return (
    <article className="overflow-hidden bg-white sm:rounded-2xl sm:shadow-sm sm:ring-1 sm:ring-stone-200/70">
      <div className="flex items-center gap-3 px-4 py-3"><div className="flex size-9 items-center justify-center rounded-full bg-rose-100 text-sm font-bold uppercase text-rose-600">{photo.guest.nickname.slice(0, 1)}</div><div><p className="text-sm font-semibold text-stone-800">{photo.guest.nickname}</p><time className="text-xs text-stone-400" dateTime={photo.createdAt}>{formatter.format(new Date(photo.createdAt))}</time></div></div>
      <button type="button" onClick={onOpen} className="relative block w-full overflow-hidden bg-stone-100 text-left" style={{ aspectRatio: `${width}/${height}` }} aria-label={`Apri la foto di ${photo.guest.nickname} a schermo intero`}>
        {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
        <Image src={photo.imageUrl} alt={photo.caption || `Foto di ${photo.guest.nickname}`} fill sizes="(max-width: 672px) 100vw, 640px" className={cn("object-cover transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0")} onLoad={() => setLoaded(true)} loading="lazy" />
      </button>
      {photo.caption && <p className="px-4 py-4 text-sm leading-relaxed text-stone-700"><span className="mr-2 font-semibold text-stone-900">{photo.guest.nickname}</span>{photo.caption}</p>}
    </article>
  );
}
