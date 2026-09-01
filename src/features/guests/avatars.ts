export const AVATAR_IDS = ["fox", "rabbit", "bear", "cat", "dog", "panda", "koala", "penguin", "alpaca", "hedgehog", "otter", "raccoon", "golden", "cavalier", "pug", "monkey", "eagle", "lizard"] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export const AVATARS: Array<{ id: AvatarId; label: string }> = [
  { id: "fox", label: "Volpe" }, { id: "rabbit", label: "Coniglio" }, { id: "bear", label: "Orso" },
  { id: "cat", label: "Gatto" }, { id: "dog", label: "Cagnolino" }, { id: "panda", label: "Panda" },
  { id: "koala", label: "Koala" }, { id: "penguin", label: "Pinguino" }, { id: "alpaca", label: "Alpaca" },
  { id: "hedgehog", label: "Riccio" }, { id: "otter", label: "Lontra" }, { id: "raccoon", label: "Procione" },
  { id: "golden", label: "Golden retriever" }, { id: "cavalier", label: "Cavalier King" }, { id: "pug", label: "Carlino" },
  { id: "monkey", label: "Scimmietta" }, { id: "eagle", label: "Aquila" }, { id: "lizard", label: "Lucertola" },
];

export function avatarUrl(avatarId: AvatarId) { return `/avatars/${avatarId}.webp`; }
