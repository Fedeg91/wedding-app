"use client";

import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { PhotoFeedItem } from "@/types";

const formatter = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export function PhotoLightbox({ photo, onClose }: { photo: PhotoFeedItem | null; onClose: () => void }) {
  return <Dialog open={Boolean(photo)} onOpenChange={(open) => !open && onClose()}>{photo && <DialogContent className="flex max-h-dvh flex-col bg-stone-950 p-0 text-white sm:max-w-4xl sm:bg-stone-950"><DialogTitle className="sr-only">Foto di {photo.guest.nickname}</DialogTitle><DialogDescription className="sr-only">{photo.caption || "Foto del matrimonio"}</DialogDescription><div className="relative min-h-0 flex-1 bg-black" style={{ aspectRatio: `${photo.width ?? 1}/${photo.height ?? 1}` }}><Image src={photo.fullscreenUrl} alt={photo.caption || `Foto condivisa da ${photo.guest.nickname}`} fill sizes="(max-width: 768px) 100vw, 1600px" className="object-contain" priority /></div><div className="shrink-0 px-5 pb-5 pt-4"><p className="font-semibold">{photo.guest.nickname}</p><time className="text-xs text-stone-400" dateTime={photo.createdAt}>{formatter.format(new Date(photo.createdAt))}</time>{photo.caption && <p className="mt-2 max-h-24 overflow-y-auto text-sm leading-relaxed text-stone-200">{photo.caption}</p>}</div></DialogContent>}</Dialog>;
}
