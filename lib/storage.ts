import "server-only";

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { DomainError } from "@/lib/football";

const BUCKET = "images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new DomainError("Supabase Storage is not configured", "INVALID_INPUT");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function uploadPublicImage(
  file: File,
  folder: "teams" | "competitions",
  entityId: string,
) {
  if (!file.size) return null;
  const extension = allowedTypes.get(file.type);
  if (!extension) {
    throw new DomainError("Upload a JPEG, PNG, WebP, or GIF image", "INVALID_INPUT");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new DomainError("Images must be 5 MB or smaller", "INVALID_INPUT");
  }

  const supabase = getStorageClient();
  const path = `${folder}/${entityId}/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Image upload failed: ${error.message}`);

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
