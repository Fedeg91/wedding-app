export type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  uploadUrl: string;
  allowedFormats: string;
  overwrite: false;
  expiresAt: number;
  uploadPreset: string;
};

export type CloudinaryUploadResult = { public_id: string; width: number; height: number; format: string; bytes: number; original_filename: string; resource_type: "image" };
