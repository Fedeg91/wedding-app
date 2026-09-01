"use client";

import Image from "next/image";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  Heart,
  ImageIcon,
  LogOut,
  RefreshCw,
  Upload,
  Users,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  adminLogout,
  getAdminEvent,
  getAdminPhotos,
  patchAdminEvent,
  patchAdminPhoto,
  sendGuestAward,
  resendGuestAward,
  getAdminAwards,
  deliverGuestAward,
} from "@/features/admin/api";
import { getGuests } from "@/features/guests/api";

type StatusFilter = "all" | "published" | "hidden";
type SortOrder = "newest" | "oldest" | "most_liked";
const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function AdminDashboard({ eventSlug }: { eventSlug: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [adminTab, setAdminTab] = useState<"photos" | "awards">("photos");
  const [awardGuestId, setAwardGuestId] = useState("");
  const [awardMessage, setAwardMessage] = useState("Hai vinto un premio!");
  const moreRef = useRef<HTMLDivElement>(null);
  const eventQuery = useQuery({
    queryKey: ["admin-event", eventSlug],
    queryFn: () => getAdminEvent(eventSlug),
    staleTime: 0,
  });
  const photosQuery = useInfiniteQuery({
    queryKey: ["admin-photos", eventSlug, status, sort],
    queryFn: ({ pageParam }) =>
      getAdminPhotos(eventSlug, status, sort, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 10_000,
    enabled: adminTab === "photos",
  });
  const guestsQuery = useQuery({ queryKey: ["guests", eventSlug], queryFn: () => getGuests(eventSlug), staleTime: 60_000 });
  const awardsQuery = useQuery({ queryKey: ["admin-awards", eventSlug], queryFn: () => getAdminAwards(eventSlug), enabled: adminTab === "awards", refetchInterval: 30_000, refetchOnWindowFocus: true });
  const award = useMutation({
    mutationFn: () => sendGuestAward(eventSlug, awardGuestId, awardMessage),
    onSuccess: async () => { setAwardMessage("Hai vinto un premio!"); await queryClient.invalidateQueries({ queryKey: ["admin-awards", eventSlug] }); },
  });
  const delivery = useMutation({ mutationFn: (awardId: string) => deliverGuestAward(eventSlug, awardId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["admin-awards", eventSlug] }); } });
  const resendAward = useMutation({ mutationFn: (awardId: string) => resendGuestAward(eventSlug, awardId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["admin-awards", eventSlug] }); } });
  const controls = useMutation({
    mutationFn: (updates: {
      uploadEnabled?: boolean;
      publicGalleryEnabled?: boolean;
    }) => patchAdminEvent(eventSlug, updates),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-event", eventSlug],
      });
      await queryClient.invalidateQueries({ queryKey: ["event", eventSlug] });
    },
  });
  const moderation = useMutation({
    mutationFn: ({
      photoId,
      nextStatus,
    }: {
      photoId: string;
      nextStatus: "published" | "hidden";
    }) => patchAdminPhoto(eventSlug, photoId, nextStatus),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-photos", eventSlug],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin-event", eventSlug] }),
        queryClient.invalidateQueries({ queryKey: ["photos", eventSlug] }),
      ]);
    },
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = photosQuery;
  useEffect(() => {
    const node = moreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage)
          void fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  async function logout() {
    await adminLogout();
    queryClient.clear();
    router.refresh();
  }
  if (eventQuery.isPending) return <AdminLoading />;
  if (eventQuery.isError)
    return (
      <main className="p-8 text-center">
        <p>Impossibile caricare il pannello.</p>
        <Button className="mt-4" onClick={() => void eventQuery.refetch()}>
          <RefreshCw className="size-4" />
          Riprova
        </Button>
      </main>
    );
  const { event, stats } = eventQuery.data;
  const photos = Array.from(
    new Map(
      (photosQuery.data?.pages.flatMap((page) => page.items) ?? []).map(
        (photo) => [photo.id, photo],
      ),
    ).values(),
  );
  function toggleGallery() {
    const next = !event.publicGalleryEnabled;
    if (
      !next &&
      !window.confirm(
        "Disabilitare la gallery pubblica? Gli invitati non potranno più vedere le foto finché non verrà riattivata.",
      )
    )
      return;
    controls.mutate({ publicGalleryEnabled: next });
  }

  return (
    <div className="min-h-dvh bg-stone-100 pb-12">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-rose-500">
              Amministrazione
            </p>
            <h1 className="font-serif text-2xl">{event.title}</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void logout()}
            aria-label="Esci dall’area amministrativa">
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat
            icon={<ImageIcon />}
            label="Pubblicate"
            value={stats.publishedPhotos}
          />
          <Stat icon={<EyeOff />} label="Nascoste" value={stats.hiddenPhotos} />
          <Stat icon={<Users />} label="Invitati" value={stats.guests} />
          <Stat icon={<Heart />} label="Like totali" value={stats.totalLikes} />
          <Stat
            icon={<Heart />}
            label="Foto top"
            value={stats.mostLikedPhotoLikes}
          />
        </section>
        <section className="grid gap-3 md:grid-cols-2">
          <Control
            title="Caricamenti"
            enabled={event.uploadEnabled}
            description="Gli invitati vedono ancora la gallery, ma non possono aggiungere nuove foto."
            onToggle={() =>
              controls.mutate({ uploadEnabled: !event.uploadEnabled })
            }
            pending={controls.isPending}
          />
          <Control
            title="Gallery pubblica"
            enabled={event.publicGalleryEnabled}
            description="Se disattivata, nessuna foto sarà accessibile agli invitati."
            onToggle={toggleGallery}
            pending={controls.isPending}
            dangerous
          />
        </section>
        <nav className="grid grid-cols-2 rounded-2xl bg-white p-1.5 shadow-sm" aria-label="Sezioni amministrazione"><button type="button" onClick={() => setAdminTab("photos")} className={`min-h-11 rounded-xl px-4 text-sm font-bold transition-colors ${adminTab === "photos" ? "bg-rose-500 text-white" : "text-stone-500 hover:bg-stone-50"}`} aria-current={adminTab === "photos" ? "page" : undefined}><ImageIcon className="mr-2 inline size-4" />Moderazione foto</button><button type="button" onClick={() => setAdminTab("awards")} className={`min-h-11 rounded-xl px-4 text-sm font-bold transition-colors ${adminTab === "awards" ? "bg-amber-500 text-white" : "text-stone-500 hover:bg-stone-50"}`} aria-current={adminTab === "awards" ? "page" : undefined}><Trophy className="mr-2 inline size-4" />Premi</button></nav>
        {adminTab === "awards" && <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Trophy className="size-5" /></div><div><h2 className="font-serif text-xl">Premio invitato</h2><p className="text-sm text-stone-500">Invia un messaggio privato a un singolo invitato.</p></div></div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr_auto]">
            <select value={awardGuestId} onChange={(event) => setAwardGuestId(event.target.value)} className="min-h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm" aria-label="Invitato destinatario"><option value="">Scegli invitato</option>{(guestsQuery.data?.items ?? []).map((item) => <option value={item.id} key={item.id}>{item.nickname}</option>)}</select>
            <input value={awardMessage} onChange={(event) => setAwardMessage(event.target.value)} maxLength={160} className="min-h-11 rounded-xl border border-stone-200 px-3 text-sm" aria-label="Messaggio premio" />
            <Button disabled={!awardGuestId || !awardMessage.trim() || award.isPending} onClick={() => award.mutate()}><Trophy className="size-4" />{award.isPending ? "Invio…" : "Invia premio"}</Button>
          </div>
          <p className={`mt-3 text-sm ${award.isError ? "text-red-600" : "text-emerald-700"}`} role="status">{award.isSuccess ? "Premio inviato: apparirà nell’app dell’invitato." : award.isError ? "Invio non riuscito. Riprova." : "Il messaggio sarà mostrato una sola volta e poi segnato come letto."}</p>
          {(awardsQuery.data?.items.length ?? 0) > 0 && <div className="mt-5 space-y-2 border-t border-stone-100 pt-4"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-stone-700">Ultimi premi</h3><button type="button" className="text-xs font-semibold text-rose-600" onClick={() => void awardsQuery.refetch()}>Aggiorna</button></div>{awardsQuery.data!.items.map((item) => { const status = item.deliveredAt ? "Consegnato" : item.claimedAt ? "Sta arrivando!" : item.readAt ? "Visualizzato" : "Inviato"; return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-3" key={item.id}><div><p className="text-sm font-semibold">{item.guest.nickname}</p><p className="text-xs text-stone-500">{item.message}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.claimedAt && !item.deliveredAt ? "animate-pulse bg-amber-100 text-amber-800" : item.deliveredAt ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-600"}`}>{status}</span>{!item.deliveredAt && <Button size="sm" variant="outline" disabled={resendAward.isPending} onClick={() => resendAward.mutate(item.id)}>Rinvia</Button>}{item.claimedAt && !item.deliveredAt && <Button size="sm" disabled={delivery.isPending} onClick={() => delivery.mutate(item.id)}>Consegnato</Button>}</div></div>; })}</div>}
        </section>}
        {adminTab === "photos" && <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl">Moderazione foto</h2>
            <div className="flex flex-wrap gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="min-h-11 rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold">
                <option value="all">Tutte</option>
                <option value="published">Pubblicate</option>
                <option value="hidden">Nascoste</option>
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOrder)}
                className="min-h-11 rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold">
                <option value="newest">Più recenti</option>
                <option value="oldest">Meno recenti</option>
                <option value="most_liked">Più apprezzate</option>
              </select>
            </div>
          </div>
          {photosQuery.isPending ? (
            <AdminLoading />
          ) : photosQuery.isError ? (
            <p className="rounded-2xl bg-white p-8 text-center text-stone-500">
              Impossibile caricare le foto.
            </p>
          ) : photos.length === 0 ? (
            <p className="rounded-2xl bg-white p-8 text-center text-stone-500">
              Nessuna foto in questa sezione.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo) => (
                <article
                  key={photo.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <div className="relative aspect-square bg-stone-200">
                    <Image
                      src={photo.thumbnailUrl}
                      alt={photo.caption || `Foto di ${photo.guest.nickname}`}
                      fill
                      sizes="(max-width: 640px) 100vw, 400px"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {photo.guest.nickname}
                        </p>
                        <time className="text-xs text-stone-400">
                          {dateFormatter.format(new Date(photo.createdAt))}
                        </time>
                        <p className="mt-1 text-sm text-stone-600">
                          Mi piace: {photo.likeCount}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-bold ${photo.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-stone-200 text-stone-600"}`}>
                        {photo.status === "published"
                          ? "Pubblicata"
                          : "Nascosta"}
                      </span>
                    </div>
                    {photo.caption && (
                      <p className="mt-3 line-clamp-3 text-sm text-stone-600">
                        {photo.caption}
                      </p>
                    )}
                    <Button
                      className="mt-4 w-full"
                      variant="outline"
                      disabled={moderation.isPending}
                      onClick={() =>
                        moderation.mutate({
                          photoId: photo.id,
                          nextStatus:
                            photo.status === "published"
                              ? "hidden"
                              : "published",
                        })
                      }>
                      {photo.status === "published" ? (
                        <>
                          <EyeOff className="size-4" />
                          Nascondi
                        </>
                      ) : (
                        <>
                          <Eye className="size-4" />
                          Ripristina
                        </>
                      )}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div ref={moreRef} className="h-1" />
          {photosQuery.isFetchingNextPage && (
            <p className="py-4 text-center text-sm text-stone-500">
              Caricamento altre foto…
            </p>
          )}
        </section>}
      </main>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm [&_svg]:mx-auto [&_svg]:mb-2 [&_svg]:size-5 [&_svg]:text-rose-500">
      <div>{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="truncate text-xs text-stone-500">{label}</p>
    </div>
  );
}
function Control({
  title,
  enabled,
  description,
  onToggle,
  pending,
  dangerous,
}: {
  title: string;
  enabled: boolean;
  description: string;
  onToggle: () => void;
  pending: boolean;
  dangerous?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p
            className={`mt-1 text-sm font-bold ${enabled ? "text-emerald-600" : "text-red-600"}`}>
            {enabled ? "ON" : "OFF"}
          </p>
        </div>
        <Button
          variant={enabled && dangerous ? "outline" : "default"}
          onClick={onToggle}
          disabled={pending}>
          {enabled ? "Disattiva" : "Attiva"}
        </Button>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-stone-500">
        {description}
      </p>
    </div>
  );
}
function AdminLoading() {
  return (
    <main className="flex min-h-64 items-center justify-center">
      <Upload className="size-6 animate-pulse text-rose-500" />
      <span className="sr-only">Caricamento</span>
    </main>
  );
}
