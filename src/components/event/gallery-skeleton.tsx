import { Skeleton } from "@/components/ui/skeleton";

export function GallerySkeleton() {
  return <div className="mx-auto max-w-2xl space-y-4 py-4 sm:px-4">{[1, 2].map((item) => <div className="bg-white p-4 sm:rounded-2xl" key={item}><div className="mb-3 flex gap-3"><Skeleton className="size-9 rounded-full" /><div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-2.5 w-16" /></div></div><Skeleton className="aspect-[4/5] w-full rounded-none sm:rounded-xl" /><Skeleton className="mt-4 h-3 w-2/3" /></div>)}</div>;
}
