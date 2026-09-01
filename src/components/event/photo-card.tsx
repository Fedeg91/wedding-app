"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PhotoFeedItem, PhotoPost } from "@/types";

const formatter = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function PhotoCard({ post, onOpen, onLike, pendingPhotoId }: { post: PhotoPost; onOpen: (photo: PhotoFeedItem) => void; onLike: (photo: PhotoFeedItem) => void; pendingPhotoId?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loaded, setLoaded] = useState(() => new Set<string>());
  const scrollerRef = useRef<HTMLDivElement>(null);
  const active = post.photos[activeIndex] ?? post.photos[0];
  const frame = post.photos[0];
  const carousel = post.photos.length > 1;
  function goTo(index: number) { const next = Math.max(0, Math.min(post.photos.length - 1, index)); scrollerRef.current?.children[next]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" }); setActiveIndex(next); }
  return <article className="overflow-hidden bg-white sm:rounded-2xl sm:shadow-sm sm:ring-1 sm:ring-stone-200/70">
    <div className="flex items-center gap-3 px-4 py-3"><div className="flex size-9 items-center justify-center rounded-full bg-rose-100 text-sm font-bold uppercase text-rose-600">{post.guest.nickname.slice(0, 1)}</div><div><p className="text-sm font-semibold text-stone-800">{post.guest.nickname}</p><time className="text-xs text-stone-400" dateTime={post.createdAt}>{formatter.format(new Date(post.createdAt))}</time></div></div>
    <div className="relative overflow-hidden bg-stone-100" style={{ aspectRatio: `${frame.width ?? 1200}/${frame.height ?? 1200}` }}>
      <div ref={scrollerRef} onScroll={(event) => { const element = event.currentTarget; if (element.clientWidth) setActiveIndex(Math.round(element.scrollLeft / element.clientWidth)); }} className="flex size-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
        {post.photos.map((photo, index) => <button type="button" onClick={() => onOpen(photo)} className="relative h-full w-full shrink-0 snap-start" aria-label={`Apri foto ${index + 1} di ${post.photos.length} di ${post.guest.nickname}`} key={photo.id}>{!loaded.has(photo.id) && <Skeleton className="absolute inset-0 rounded-none" />}<Image src={photo.imageUrl} alt={photo.caption || `Foto di ${post.guest.nickname}`} fill sizes="(max-width: 672px) 100vw, 640px" className={cn("object-cover transition-opacity duration-500", loaded.has(photo.id) ? "opacity-100" : "opacity-0")} onLoad={() => setLoaded((current) => new Set(current).add(photo.id))} loading="lazy" /></button>)}
      </div>
      {carousel && <><span className="absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white">{activeIndex + 1}/{post.photos.length}</span>{activeIndex > 0 && <button type="button" onClick={() => goTo(activeIndex - 1)} className="absolute left-2 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white sm:flex" aria-label="Foto precedente"><ChevronLeft /></button>}{activeIndex < post.photos.length - 1 && <button type="button" onClick={() => goTo(activeIndex + 1)} className="absolute right-2 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white sm:flex" aria-label="Foto successiva"><ChevronRight /></button>}<div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">{post.photos.map((photo, index) => <span className={cn("size-1.5 rounded-full shadow", index === activeIndex ? "bg-white" : "bg-white/50")} key={photo.id} />)}</div></>}
    </div>
    <div className="px-3 pt-2"><button type="button" onClick={() => onLike(active)} disabled={pendingPhotoId === active.id} aria-pressed={active.likedByCurrentGuest} aria-label={active.likedByCurrentGuest ? "Rimuovi Mi piace" : "Metti Mi piace"} className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full px-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-rose-50 disabled:opacity-60"><Heart className={cn("size-6", active.likedByCurrentGuest && "fill-rose-500 text-rose-500")} /><span>{active.likeCount}</span></button></div>
    {post.caption && <p className="px-4 py-4 text-sm leading-relaxed text-stone-700"><span className="mr-2 font-semibold text-stone-900">{post.guest.nickname}</span>{post.caption}</p>}
  </article>;
}
