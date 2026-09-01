export type Event = {
  id: string;
  title: string;
  slug: string;
  eventDate: string | null;
  uploadEnabled: boolean;
  publicGalleryEnabled: boolean;
};

export type Guest = {
  id: string;
  nickname: string;
  avatarKey: import("@/features/guests/avatars").AvatarId;
};

export type PhotoFeedItem = {
  id: string;
  imageUrl: string;
  fullscreenUrl: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  createdAt: string;
  likeCount: number;
  likedByCurrentGuest: boolean;
  guest: Guest;
};

export type PhotoPost = {
  id: string;
  createdAt: string;
  caption: string | null;
  guest: Guest;
  photos: PhotoFeedItem[];
};

export type Photo = PhotoFeedItem;

export type PaginatedResponse<T> = { items: T[]; nextCursor: string | null };

export type ApiErrorResponse = { error: { code: string; message: string; details?: unknown } };
