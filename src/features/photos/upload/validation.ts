import { ALLOWED_IMAGE_TYPES, MAX_BATCH_SIZE, MAX_FILE_SIZE } from "./constants";

export type FileValidationError = { fileName?: string; message: string };

export function validateUploadFiles(files: File[]): FileValidationError[] {
  const errors: FileValidationError[] = [];
  if (files.length > MAX_BATCH_SIZE) errors.push({ message: `Puoi caricare al massimo ${MAX_BATCH_SIZE} foto alla volta.` });
  for (const file of files.slice(0, MAX_BATCH_SIZE)) {
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) errors.push({ fileName: file.name, message: "Formato non supportato. Usa JPEG, PNG o WebP." });
    if (file.size > MAX_FILE_SIZE) errors.push({ fileName: file.name, message: "La foto supera il limite di 20 MB." });
    if (file.size === 0) errors.push({ fileName: file.name, message: "Il file è vuoto." });
  }
  return errors;
}
