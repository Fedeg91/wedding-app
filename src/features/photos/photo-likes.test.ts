import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { InfiniteData } from "@tanstack/react-query";
import { photoFeedQuerySchema, photoLikeSchema } from "@/lib/validation/api";
import type { PaginatedResponse, PhotoFeedItem } from "@/types";
import { updatePhotoLikeInPages } from "./likes-cache";

const photo = (id: string, likeCount = 0, likedByCurrentGuest = false): PhotoFeedItem => ({
  id, imageUrl: "/image.jpg", fullscreenUrl: "/image.jpg", width: 1, height: 1,
  caption: null, createdAt: "2026-08-31T12:00:00Z", likeCount, likedByCurrentGuest,
  guest: { id: "00000000-0000-4000-8000-000000000001", nickname: "Marco" },
});

describe("photo likes", () => {
  it("validates UUID guest identity for mutations and feed personalization", () => {
    const guestId = "00000000-0000-4000-8000-000000000001";
    expect(photoLikeSchema.parse({ guestId })).toEqual({ guestId });
    expect(photoLikeSchema.safeParse({ guestId: "Marco" }).success).toBe(false);
    expect(photoFeedQuerySchema.parse({ currentGuestId: guestId }).currentGuestId).toBe(guestId);
  });

  it("updates every cached page optimistically without changing pagination", () => {
    const data: InfiniteData<PaginatedResponse<PhotoFeedItem>> = { pageParams: [undefined, "next"], pages: [{ items: [photo("a", 12)], nextCursor: "next" }, { items: [photo("a", 12), photo("b")], nextCursor: null }] };
    const result = updatePhotoLikeInPages(data, "a", true)!;
    expect(result.pages.flatMap((page) => page.items).filter((item) => item.id === "a")).toEqual([photo("a", 13, true), photo("a", 13, true)]);
    expect(result.pageParams).toBe(data.pageParams);
    expect(result.pages.map((page) => page.nextCursor)).toEqual(["next", null]);
  });

  it("supports rollback to the exact pre-mutation snapshot", () => {
    const before: InfiniteData<PaginatedResponse<PhotoFeedItem>> = { pageParams: [undefined], pages: [{ items: [photo("a", 4)], nextCursor: null }] };
    const optimistic = updatePhotoLikeInPages(before, "a", true)!;
    expect(optimistic.pages[0].items[0]).toMatchObject({ likeCount: 5, likedByCurrentGuest: true });
    expect(before.pages[0].items[0]).toMatchObject({ likeCount: 4, likedByCurrentGuest: false });
  });

  it("does not double-increment an already optimistic like", () => {
    const data: InfiniteData<PaginatedResponse<PhotoFeedItem>> = { pageParams: [undefined], pages: [{ items: [photo("a", 13, true)], nextCursor: null }] };
    expect(updatePhotoLikeInPages(data, "a", true)!.pages[0].items[0].likeCount).toBe(13);
  });

  it("migration enforces uniqueness, cascades, indexes, and database-side most-liked sorting", () => {
    const sql = readFileSync("supabase/migrations/20260831120000_photo_likes.sql", "utf8");
    expect(sql).toMatch(/unique \(photo_id, guest_id\)/i);
    expect(sql.match(/on delete cascade/gi)).toHaveLength(2);
    expect(sql).toMatch(/photo_likes_photo_id_idx/i);
    expect(sql).toMatch(/count\(pl\.id\)[\s\S]*desc/i);
    expect(sql).toMatch(/limit page_limit/i);
  });
});
