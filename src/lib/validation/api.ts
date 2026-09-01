import { z } from "zod";
import { AVATAR_IDS } from "@/features/guests/avatars";

export const eventSlugSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const uuidSchema = z.uuid();
const plainText = (value: string) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value) && !/<\s*\/?\s*(script|iframe|object|embed|svg|img|style)\b/i.test(value);
export const nicknameSchema = z.string().trim().min(1, "Nickname is required").max(40, "Nickname must be at most 40 characters").refine(plainText, "Nickname must be plain text");
export const avatarSchema = z.enum(AVATAR_IDS);
export const createGuestSchema = z.object({ nickname: nicknameSchema, avatarKey: avatarSchema }).strict();
export const updateGuestSchema = z.object({ nickname: nicknameSchema, avatarKey: avatarSchema }).strict();
export const adminLoginSchema = z.object({ eventSlug: eventSlugSchema, password: z.string().min(1).max(200) }).strict();
export const adminEventUpdateSchema = z.object({ uploadEnabled: z.boolean().optional(), publicGalleryEnabled: z.boolean().optional() }).strict().refine((value) => value.uploadEnabled !== undefined || value.publicGalleryEnabled !== undefined, "At least one setting is required");
export const adminPhotoStatusSchema = z.object({ status: z.enum(["published", "hidden"]) }).strict();
export const adminPhotoQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(50).default(30), cursor: z.string().min(1).optional(), status: z.enum(["published", "hidden", "all"]).default("all"), sort: z.enum(["newest", "oldest", "most_liked"]).default("newest") }).strict();
export const photoLikeSchema = z.object({ guestId: uuidSchema }).strict();
export const adminAwardSchema = z.object({ guestId: uuidSchema, message: z.string().trim().min(1).max(160).refine(plainText, "Message must be plain text").default("Hai vinto un premio!") }).strict();
export const awardReadSchema = z.object({ awardId: uuidSchema, action: z.enum(["dismiss", "claim"]) }).strict();
export const adminAwardDeliverySchema = z.object({ awardId: uuidSchema, action: z.enum(["deliver", "resend"]) }).strict();
export const uploadSignatureSchema = z.object({ guestId: uuidSchema }).strict();
export const photoMetadataSchema = z.object({
  guestId: uuidSchema,
  clientUploadId: uuidSchema,
  uploadGroupId: uuidSchema,
  uploadGroupCreatedAt: z.iso.datetime({ offset: true }),
  uploadGroupPosition: z.number().int().min(0).max(3),
  cloudinaryPublicId: z.string().min(1).max(255),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: z.string().trim().max(300).refine(plainText, "Caption must be plain text").nullable().optional(),
  format: z.enum(["jpg", "jpeg", "png", "webp"]),
  bytes: z.number().int().positive().max(20 * 1024 * 1024),
  originalFilename: z.string().trim().max(255).optional(),
}).strict();
export const photoFeedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
  guestId: uuidSchema.optional(),
  currentGuestId: uuidSchema.optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
}).strict();
