import type { Event } from "@/types";

export function canUploadToEvent(event: Pick<Event, "uploadEnabled">) { return event.uploadEnabled; }
export function canViewPublicGallery(event: Pick<Event, "publicGalleryEnabled">) { return event.publicGalleryEnabled; }
export function isPublicPhotoStatus(status: string) { return status === "published"; }
