import "server-only";

import { UTApi } from "uploadthing/server";

interface UploadImagesResponse {
  files: { id: string; url: string }[];
}

const utapi = new UTApi();

export async function uploadImages(
  formData: FormData
): Promise<UploadImagesResponse> {
  console.log("uploadImages", formData.entries().next().value);
  const files = Array.from(formData.getAll("files")) as File[];
  if (files.length === 0) {
    throw new Error("No files were uploaded");
  }
  if (files.length > 4) {
    throw new Error("Maximum 4 files are allowed");
  }
  if (files.some((file) => file.size > 4 * 1024 * 1024)) {
    throw new Error("File size must be less than 4MB");
  }
  if (files.length < 2) {
    throw new Error("At least 2 files is required");
  }
  const response = (
    await utapi.uploadFiles(files).then((res) => res.map((r) => r.data))
  ).filter((r) => r !== null);

  if (response.length === 0) {
    throw new Error("No files were uploaded");
  }

  return {
    files: response.map((file) => ({
      id: file.key,
      url: file.url,
    })),
  };
}

export async function deleteImages(ids: string[]) {
  return await utapi.deleteFiles(ids);
}
