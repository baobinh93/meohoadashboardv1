const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as
  | string
  | undefined;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as
  | string
  | undefined;

export async function uploadImage(file: File): Promise<string> {
  if (!cloudName || !uploadPreset) {
    throw new Error("Thiếu cấu hình Cloudinary trong apps/admin/.env.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Vui lòng chọn tệp hình ảnh.");
  }
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("Ảnh vượt quá 10 MB.");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body,
    },
  );
  const result = await response.json();
  if (!response.ok || !result.secure_url) {
    throw new Error(result?.error?.message ?? "Upload Cloudinary thất bại.");
  }
  return result.secure_url as string;
}
