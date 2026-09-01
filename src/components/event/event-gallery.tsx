"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Images, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEvent } from "@/features/events/api";
import { changeGuestNickname, getGuests, registerGuest } from "@/features/guests/api";
import { getPhotoPage, setPhotoLike } from "@/features/photos/api";
import { updatePhotoLikeInPages } from "@/features/photos/likes-cache";
import type { InfiniteData } from "@tanstack/react-query";
import type { PaginatedResponse } from "@/types";
import { EventHeader } from "./event-header";
import { GalleryFilters, type SortOrder } from "./gallery-filters";
import { GallerySkeleton } from "./gallery-skeleton";
import { GuestOnboarding } from "./guest-onboarding";
import { PhotoCard } from "./photo-card";
import type { Guest, PhotoFeedItem, PhotoPost } from "@/types";

const UploadSheet = dynamic(() => import("./upload-sheet").then((module) => module.UploadSheet), { ssr: false });
const ProfileSheet = dynamic(() => import("./profile-sheet").then((module) => module.ProfileSheet), { ssr: false });
const PhotoLightbox = dynamic(() => import("./photo-lightbox").then((module) => module.PhotoLightbox), { ssr: false });

type StoredGuestIdentity = { guestId: string; nickname: string };

export function EventGallery({ eventSlug }: { eventSlug: string }) {
  const queryClient = useQueryClient();
  const storageKey = `wedding-photo-app:guest:${eventSlug}`;
  const [guest, setGuest] = useState<Guest | null>(null);
  const [identityReady, setIdentityReady] = useState(false);
  const [guestId, setGuestId] = useState("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoFeedItem | null>(null);
  const [online, setOnline] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const eventQuery = useQuery({ queryKey: ["event", eventSlug], queryFn: () => getEvent(eventSlug), staleTime: 5_000, gcTime: 10 * 60_000, refetchOnWindowFocus: true, refetchInterval: 30_000 });
  const guestsQuery = useQuery({ queryKey: ["guests", eventSlug], queryFn: () => getGuests(eventSlug), enabled: eventQuery.isSuccess, staleTime: 60_000, gcTime: 10 * 60_000 });
  useEffect(() => { const update = () => setOnline(navigator.onLine); update(); window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }, []);

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as StoredGuestIdentity;
          if (parsed.guestId && parsed.nickname) setGuest({ id: parsed.guestId, nickname: parsed.nickname });
        }
      } catch { localStorage.removeItem(storageKey); }
      setIdentityReady(true);
    }, 0);
    return () => window.clearTimeout(hydrate);
  }, [storageKey]);

  useEffect(() => {
    if (!identityReady || !guest || !guestsQuery.data) return;
    if (!guestsQuery.data.items.some((item) => item.id === guest.id)) {
      localStorage.removeItem(storageKey);
      const clearStaleGuest = window.setTimeout(() => setGuest(null), 0);
      return () => window.clearTimeout(clearStaleGuest);
    }
  }, [guest, guestsQuery.data, identityReady, storageKey]);

  const registration = useMutation({
    mutationFn: (nickname: string) => registerGuest(eventSlug, nickname),
    onSuccess: (createdGuest) => {
      queryClient.setQueryData<{ items: Guest[] }>(["guests", eventSlug], (current) => ({ items: current?.items.some((item) => item.id === createdGuest.id) ? current.items : [...(current?.items ?? []), createdGuest] }));
      localStorage.setItem(storageKey, JSON.stringify({ guestId: createdGuest.id, nickname: createdGuest.nickname } satisfies StoredGuestIdentity));
      setGuest(createdGuest);
    },
  });

  const photosQuery = useInfiniteQuery({
    queryKey: ["photos", eventSlug, guestId, sortOrder],
    queryFn: ({ pageParam }) => getPhotoPage(eventSlug, { guestId: guestId === "all" ? undefined : guestId, currentGuestId: guest?.id, sort: sortOrder }, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(guest && eventQuery.data?.publicGalleryEnabled),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnMount: false,
  });
  const likes = useMutation({
    mutationFn: ({ photoId, liked }: { photoId: string; liked: boolean }) => setPhotoLike(eventSlug, photoId, guest!.id, liked),
    onMutate: async ({ photoId, liked }) => {
      await queryClient.cancelQueries({ queryKey: ["photos", eventSlug] });
      const snapshots = queryClient.getQueriesData<InfiniteData<PaginatedResponse<PhotoPost>>>({ queryKey: ["photos", eventSlug] });
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<PhotoPost>>>({ queryKey: ["photos", eventSlug] }, (data) => updatePhotoLikeInPages(data, photoId, liked));
      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshots ?? []) queryClient.setQueryData(key, data);
    },
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = photosQuery;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    }, { rootMargin: "400px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (eventQuery.isPending || !identityReady) return <GallerySkeleton />;
  if (eventQuery.isError) return <FullPageMessage icon={<WifiOff className="size-10" />} title="Evento non disponibile" message="Non riusciamo a caricare questo evento. Controlla il link o riprova tra poco." onRetry={() => void eventQuery.refetch()} />;

  const event = eventQuery.data;
  if (!event.publicGalleryEnabled) return <FullPageMessage icon={<Images className="size-10" />} title={event.title} message="La gallery di questo evento non è più disponibile." />;
  if (!guest) return <GuestOnboarding event={event} onComplete={(nickname) => registration.mutate(nickname)} pending={registration.isPending} error={registration.isError ? "Non è stato possibile registrarti. Riprova." : null} />;

  const posts = Array.from(new Map((photosQuery.data?.pages.flatMap((page) => page.items) ?? []).map((post) => [post.id, post])).values());
  const guests = guestsQuery.data?.items ?? [];

  async function saveNickname(nickname: string) {
    if (!guest) throw new Error("Guest identity unavailable");
    const updated = await changeGuestNickname(eventSlug, guest.id, nickname);
    localStorage.setItem(storageKey, JSON.stringify({ guestId: updated.id, nickname: updated.nickname } satisfies StoredGuestIdentity));
    setGuest(updated);
    queryClient.setQueryData<{ items: Guest[] }>(["guests", eventSlug], (current) => ({ items: (current?.items ?? []).map((item) => item.id === updated.id ? updated : item) }));
    await queryClient.invalidateQueries({ queryKey: ["photos", eventSlug] });
  }

  return (
    <div className="min-h-dvh pb-28">
      <EventHeader event={event} guest={guest} onProfile={() => setProfileOpen(true)} />
      {!online && <div className="sticky top-16 z-30 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900" role="status">Sei offline. Puoi vedere le foto già caricate, ma serve internet per aggiornare o pubblicare.</div>}
      <GalleryFilters guests={guests} guestId={guestId} sortOrder={sortOrder} onGuestChange={setGuestId} onSortChange={setSortOrder} />
      <main className="mx-auto max-w-2xl space-y-4 py-4 sm:px-4">
        {photosQuery.isPending ? <GallerySkeleton /> : photosQuery.isError ? <InlineError offline={!online} onRetry={() => void photosQuery.refetch()} /> : posts.length ? posts.map((post) => <PhotoCard post={post} onOpen={setSelectedPhoto} onLike={(photo) => likes.mutate({ photoId: photo.id, liked: !photo.likedByCurrentGuest })} pendingPhotoId={likes.isPending ? likes.variables?.photoId : undefined} key={post.id} />) : <div className="px-6 py-24 text-center"><Images className="mx-auto mb-3 size-9 text-stone-300" /><p className="font-semibold text-stone-700">Nessuna foto da mostrare</p><p className="mt-1 text-sm text-stone-400">{guestId === "all" ? "Sii il primo a condividere una foto di oggi." : "Prova a cambiare il filtro."}</p>{guestId === "all" && event.uploadEnabled && <Button className="mt-5" onClick={() => setUploadOpen(true)}><Camera className="size-4" />Condividi la prima foto</Button>}</div>}
        {photosQuery.isFetchingNextPage && <GallerySkeleton />}
        {photosQuery.isFetchNextPageError && <div className="px-4 py-5 text-center"><p className="text-sm text-stone-500">Non siamo riusciti a caricare altre foto.</p><Button className="mt-3" variant="outline" onClick={() => void photosQuery.fetchNextPage()}><RefreshCw className="size-4" />Riprova</Button></div>}
        <div ref={loadMoreRef} className="h-1" aria-hidden="true" />
      </main>
      {event.uploadEnabled ? <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center bg-linear-to-t from-[#faf9f7] via-[#faf9f7]/95 to-transparent px-4 pb-4 pt-8"><Button className="pointer-events-auto min-h-14 w-full max-w-sm text-base shadow-[0_10px_30px_rgba(244,63,94,0.28)]" onClick={() => setUploadOpen(true)}><Camera className="size-5" />Aggiungi foto</Button></div> : <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 bg-[#faf9f7]/95 px-4 pb-4 pt-3 text-center text-sm text-stone-500 backdrop-blur">Gli sposi hanno disattivato nuovi caricamenti.</div>}
      <UploadSheet open={uploadOpen} onOpenChange={setUploadOpen} eventSlug={eventSlug} guestId={guest.id} />
      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} guest={guest} onSave={saveNickname} />
      <PhotoLightbox photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
    </div>
  );
}

function InlineError({ onRetry, offline }: { onRetry: () => void; offline: boolean }) {
  return <div className="px-6 py-24 text-center"><WifiOff className="mx-auto mb-3 size-9 text-stone-300" /><p className="font-semibold text-stone-700">{offline ? "Sei offline" : "Impossibile caricare le foto"}</p><p className="mt-1 text-sm text-stone-400">{offline ? "Riconnettiti a internet per aggiornare la gallery." : "La connessione sembra instabile. Riprova tra poco."}</p><Button className="mt-4" variant="outline" onClick={onRetry} disabled={offline}><RefreshCw className="size-4" />Riprova</Button></div>;
}

function FullPageMessage({ icon, title, message, onRetry }: { icon: React.ReactNode; title: string; message: string; onRetry?: () => void }) {
  return <main className="flex min-h-dvh items-center justify-center px-6 text-center"><section className="max-w-sm"><div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-rose-50 text-rose-400">{icon}</div><h1 className="font-serif text-3xl text-stone-800">{title}</h1><p className="mt-3 leading-relaxed text-stone-500">{message}</p>{onRetry && <Button className="mt-6" onClick={onRetry}><RefreshCw className="size-4" />Riprova</Button>}</section></main>;
}
