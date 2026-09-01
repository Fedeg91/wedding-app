import { EventGallery } from "@/components/event/event-gallery";

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  return <EventGallery eventSlug={eventSlug} />;
}
