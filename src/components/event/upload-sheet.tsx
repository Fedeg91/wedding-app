"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { CloudinaryUploadResult } from "@/features/photos/cloudinary/types";
import { MAX_BATCH_SIZE } from "@/features/photos/upload/constants";
import { persistUploadedPhoto, requestUploadSignature, uploadDirectToCloudinary } from "@/features/photos/upload/upload-service";
import { UploadItem } from "@/features/photos/upload/upload-item";
import { validateUploadFiles } from "@/features/photos/upload/validation";
import { nextQueuedIds, type QueueStatus } from "@/features/photos/upload/queue";

export type UploadQueueItem = { id: string; clientUploadId: string; uploadGroupId: string; uploadGroupCreatedAt: string; uploadGroupPosition: number; file: File; previewUrl: string; status: QueueStatus; progress: number; error?: string; cloudinaryResult?: CloudinaryUploadResult };

export function UploadSheet({ open, onOpenChange, eventSlug, guestId }: { open: boolean; onOpenChange: (open: boolean) => void; eventSlug: string; guestId: string }) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const [caption, setCaption] = useState("");
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const previewUrlsRef = useRef(new Set<string>());
  const uploadGroupRef = useRef<{ id: string; createdAt: string } | null>(null);
  const busy = items.some((item) => ["signing", "uploading", "saving"].includes(item.status));

  useEffect(() => () => previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);
  useEffect(() => { const update = () => setOnline(navigator.onLine); update(); window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }, []);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (items.some((item) => item.status !== "success")) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [items]);

  function selectImages(event: ChangeEvent<HTMLInputElement>) {
    const available = Math.max(0, MAX_BATCH_SIZE - items.length);
    const files = Array.from(event.target.files ?? []);
    const errors = files.length > available ? [{ message: `Puoi selezionare al massimo ${MAX_BATCH_SIZE} foto.` }, ...validateUploadFiles(files.slice(0, available))] : validateUploadFiles(files);
    setSelectionError(errors.map((error) => error.fileName ? `${error.fileName}: ${error.message}` : error.message).join(" ") || null);
    const invalidNames = new Set(errors.filter((error) => error.fileName).map((error) => error.fileName));
    const group = uploadGroupRef.current ?? { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    uploadGroupRef.current = group;
    const usedPositions = new Set(items.map((item) => item.uploadGroupPosition));
    const freePositions = Array.from({ length: MAX_BATCH_SIZE }, (_, index) => index).filter((position) => !usedPositions.has(position));
    const selected = files.slice(0, available).filter((file) => !invalidNames.has(file.name)).map((file, index): UploadQueueItem => ({ id: crypto.randomUUID(), clientUploadId: crypto.randomUUID(), uploadGroupId: group.id, uploadGroupCreatedAt: group.createdAt, uploadGroupPosition: freePositions[index], file, previewUrl: URL.createObjectURL(file), status: "selected", progress: 0 }));
    selected.forEach((item) => previewUrlsRef.current.add(item.previewUrl));
    setItems((current) => [...current, ...selected]);
    event.target.value = "";
  }

  function removeItem(id: string) {
    setItems((current) => { const removed = current.find((item) => item.id === id); if (removed) { URL.revokeObjectURL(removed.previewUrl); previewUrlsRef.current.delete(removed.previewUrl); } return current.filter((item) => item.id !== id); });
  }

  function patchItem(id: string, patch: Partial<UploadQueueItem>) { setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item)); }

  const uploadItem = useCallback(async (id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (!item || item.status !== "queued" || !navigator.onLine) return;
    try {
      let result = item.cloudinaryResult;
      if (!result) {
        patchItem(id, { status: "signing", progress: 0, error: undefined });
        const signature = await requestUploadSignature(eventSlug, guestId);
        patchItem(id, { status: "uploading", progress: 0 });
        result = await uploadDirectToCloudinary(item.file, signature, (progress) => patchItem(id, { progress }));
        patchItem(id, { cloudinaryResult: result, status: "saving", progress: 100 });
      } else {
        patchItem(id, { status: "saving", progress: 100, error: undefined });
      }
      await persistUploadedPhoto(eventSlug, guestId, item.clientUploadId, item.uploadGroupId, item.uploadGroupCreatedAt, item.uploadGroupPosition, result, caption);
      patchItem(id, { status: "success", progress: 100, error: undefined, cloudinaryResult: result });
      await queryClient.invalidateQueries({ queryKey: ["photos", eventSlug] });
    } catch (error) {
      patchItem(id, { status: "failed", error: error instanceof Error ? error.message : "Caricamento non riuscito. Riprova." });
    }
  }, [caption, eventSlug, guestId, items, queryClient]);

  useEffect(() => {
    if (!online) return;
    nextQueuedIds(items).forEach((id) => void uploadItem(id));
  }, [items, online, uploadItem]);

  async function uploadPending() {
    if (!online) { setSelectionError("Sei offline. Le foto restano selezionate e potrai caricarle quando torni online."); return; }
    setItems((current) => current.map((item) => item.status === "selected" || item.status === "failed" ? { ...item, status: "queued", error: undefined } : item));
  }

  function close(nextOpen: boolean) {
    if (busy) return;
    if (!nextOpen && items.every((item) => item.status === "success")) {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
      setItems([]);
      setCaption("");
      setSelectionError(null);
      uploadGroupRef.current = null;
    }
    onOpenChange(nextOpen);
  }

  const canUpload = items.some((item) => item.status === "selected" || item.status === "failed");
  const successful = items.filter((item) => item.status === "success").length;
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogTitle className="pr-12 font-serif text-2xl text-stone-900">Aggiungi le tue foto</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-stone-500">Fino a {MAX_BATCH_SIZE} immagini, massimo 20 MB ciascuna. La didascalia verrà applicata a tutte.</DialogDescription>
        {items.length > 0 && <p className="mt-3 text-sm font-semibold text-stone-700" aria-live="polite">{successful} di {items.length} caricate{busy ? " · caricamento in corso" : ""}</p>}
        {!online && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">Sei offline. Le foto rimangono qui finché non torna la connessione.</p>}
        <div className="mt-5 max-h-[46dvh] space-y-2 overflow-y-auto">
          {items.length === 0 ? <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/60 p-6 text-center transition hover:bg-rose-50"><ImagePlus className="mb-3 size-8 text-rose-500" /><span className="font-semibold text-stone-800">Scegli dalla galleria</span><span className="mt-1 text-xs text-stone-500">JPEG, PNG o WebP</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectImages} /></label> : <>{items.map((item) => <UploadItem key={item.id} item={item} onRemove={() => removeItem(item.id)} onRetry={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "queued", error: undefined } : entry))} />)}{items.length < MAX_BATCH_SIZE && !busy && <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-stone-300 text-sm font-semibold text-stone-600 hover:bg-stone-50"><Plus className="size-4" />Aggiungi altre foto<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectImages} /></label>}</>}
        </div>
        {selectionError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700" role="alert">{selectionError}</p>}
        <label className="mt-4 block"><span className="mb-2 block text-sm font-semibold text-stone-700">Didascalia <span className="font-normal text-stone-400">(opzionale)</span></span><textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Racconta questo momento…" maxLength={240} rows={2} className="w-full resize-none rounded-xl border border-stone-200 px-4 py-3 text-base outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" disabled={busy || items.some((item) => item.status === "success")} /></label>
        <Button className="mt-4 w-full" disabled={!canUpload || busy || !online} onClick={() => void uploadPending()}><Upload className="size-4" />{busy ? "Caricamento in corso…" : items.some((item) => item.status === "failed") ? "Riprova foto non riuscite" : `Condividi ${items.length} ${items.length === 1 ? "foto" : "foto"}`}</Button>
      </DialogContent>
    </Dialog>
  );
}
