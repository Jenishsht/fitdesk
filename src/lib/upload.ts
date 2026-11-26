import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 4 * 1024 * 1024; // must stay under bodySizeLimit (5mb)

export async function saveMemberPhoto(
  file: FormDataEntryValue | null
): Promise<{ url?: string; error?: string }> {
  if (!(file instanceof File) || file.size === 0) return {};
  const ext = TYPES[file.type];
  if (!ext) return { error: "Photo must be a JPG, PNG or WebP image." };
  if (file.size > MAX_BYTES) return { error: "Photo must be under 4 MB." };

  const dir = path.join(process.cwd(), "public", "uploads", "members");
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return { url: `/uploads/members/${name}` };
}