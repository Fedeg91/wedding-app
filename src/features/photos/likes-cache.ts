import type { InfiniteData } from "@tanstack/react-query";
import type { PaginatedResponse, PhotoPost } from "@/types";

export function updatePhotoLikeInPages(data: InfiniteData<PaginatedResponse<PhotoPost>> | undefined, photoId: string, liked: boolean) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((post) => ({ ...post, photos: post.photos.map((photo) => photo.id === photoId && photo.likedByCurrentGuest !== liked ? { ...photo, likedByCurrentGuest: liked, likeCount: Math.max(0, photo.likeCount + (liked ? 1 : -1)) } : photo) })),
    })),
  };
}
