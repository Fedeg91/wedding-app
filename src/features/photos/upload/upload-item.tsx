"use client";

import Image from "next/image";
import { Check, LoaderCircle, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UploadQueueItem } from "@/components/event/upload-sheet";

export function UploadItem({ item, onRemove, onRetry }: { item: UploadQueueItem; onRemove: () => void; onRetry: () => void }) {
  const busy = item.status === "queued" || item.status === "signing" || item.status === "uploading" || item.status === "saving";
  return (
    <div className="flex gap-3 rounded-2xl border border-stone-200 p-2.5">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-stone-100"><Image src={item.previewUrl} alt={item.file.name} fill unoptimized className="object-cover" /></div>
      <div className="min-w-0 flex-1 py-1">
        <p className="truncate text-sm font-semibold text-stone-800">{item.file.name}</p>
        <p className="mt-0.5 text-xs text-stone-400">{(item.file.size / 1024 / 1024).toFixed(1)} MB</p>
        {busy && <div className="mt-3"><div className="mb-1.5 flex justify-between text-[11px] font-medium text-stone-500"><span>{item.status === "queued" ? "In attesa…" : item.status === "signing" ? "Preparazione…" : item.status === "saving" ? "Salvataggio…" : "Caricamento…"}</span><span>{item.progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full bg-rose-500 transition-all" style={{ width: `${item.progress}%` }} /></div></div>}
        {item.status === "success" && <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><Check className="size-4" />Foto pubblicata</p>}
        {item.status === "failed" && <div className="mt-2"><p className="flex items-start gap-1.5 text-xs leading-snug text-red-600"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" />{item.error}</p><Button type="button" variant="ghost" className="mt-1 min-h-8 px-2 text-xs" onClick={onRetry}><RefreshCw className="size-3.5" />Riprova</Button></div>}
      </div>
      {item.status === "selected" ? <button type="button" onClick={onRemove} className="flex size-10 shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100" aria-label={`Rimuovi ${item.file.name}`}><Trash2 className="size-4" /></button> : busy ? <LoaderCircle className="m-2 size-4 animate-spin text-rose-500" /> : null}
    </div>
  );
}
