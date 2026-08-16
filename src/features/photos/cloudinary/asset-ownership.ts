export function isEventCloudinaryAsset(eventId: string, publicId: string) {
  const prefix = `weddings/${eventId}/originals/`;
  const assetId = publicId.slice(prefix.length);
  return publicId.startsWith(prefix) && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId);
}
