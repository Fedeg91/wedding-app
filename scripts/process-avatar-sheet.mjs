import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const sourceDirectory = new URL("../design/avatars-v2/", import.meta.url);
const output = new URL("../public/avatars/", import.meta.url);
const avatars = ["fox", "rabbit", "bear", "cat", "dog", "panda", "koala", "penguin", "alpaca", "hedgehog", "otter", "raccoon", "golden", "cavalier", "pug", "monkey", "eagle", "lizard"];

await mkdir(output, { recursive: true });
await Promise.all(avatars.map((name) => sharp(fileURLToPath(new URL(`${name}.png`, sourceDirectory)))
  .resize(192, 192, { fit: "cover" })
  .webp({ quality: 86, effort: 6 })
  .toFile(fileURLToPath(new URL(`${name}.webp`, output)))));

console.log(`Generated ${avatars.length} optimized avatars.`);
