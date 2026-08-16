export type ImageVariant = "thumbnail" | "feed" | "fullscreen" | "original";

const transformations: Record<Exclude<ImageVariant, "original">, string> = {
  thumbnail: "c_limit,w_400/f_auto,q_auto",
  feed: "c_limit,w_1000/f_auto,q_auto",
  fullscreen: "c_limit,w_1600/f_auto,q_auto",
};

export function buildCloudinaryImageUrl(cloudName: string, publicId: string, variant: ImageVariant = "feed") {
  const safeCloudName = encodeURIComponent(cloudName);
  const safePublicId = publicId.split("/").map(encodeURIComponent).join("/");
  const transform = variant === "original" ? "" : `${transformations[variant]}/`;
  return `https://res.cloudinary.com/${safeCloudName}/image/upload/${transform}${safePublicId}`;
}
