import "server-only";

import { mkdir, readdir, readFile, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { R2Bucket, R2Object } from "@cloudflare/workers-types";
import { getCloudflareEnv } from "@/lib/cloudflare/context";
import { env } from "@/lib/env";

export type StorageCategory = "backups" | "downloads";

export interface StoredFile {
  name: string;
  modified: Date;
  size?: number;
}

function localCategoryDir(category: StorageCategory): string {
  return path.join(env.DOSSIER_DATA_DIR, category);
}

async function getR2Bucket(): Promise<R2Bucket | null> {
  const cf = await getCloudflareEnv();
  return cf?.DOSSIER_BUCKET ?? null;
}

/**
 * Stores a file in Cloudflare R2 (when running on Cloudflare) or local filesystem.
 */
export async function writeStorageFile(
  category: StorageCategory,
  filename: string,
  content: Uint8Array | string,
  contentType?: string,
): Promise<void> {
  const bucket = await getR2Bucket();
  const key = `${category}/${filename}`;

  if (bucket) {
    await bucket.put(key, content, {
      httpMetadata: contentType ? { contentType } : undefined,
    });
    return;
  }

  const dir = localCategoryDir(category);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), content);
}

/**
 * Retrieves a file from Cloudflare R2 or local filesystem.
 */
export async function readStorageFile(
  category: StorageCategory,
  filename: string,
): Promise<Uint8Array | null> {
  const bucket = await getR2Bucket();
  const key = `${category}/${filename}`;

  if (bucket) {
    const object = await bucket.get(key);
    if (!object) return null;
    const arrayBuffer = await object.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  const filePath = path.join(localCategoryDir(category), filename);
  try {
    const buf = await readFile(filePath);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  } catch {
    return null;
  }
}

/**
 * Lists files under the given category, newest first.
 */
export async function listStorageFiles(category: StorageCategory): Promise<StoredFile[]> {
  const bucket = await getR2Bucket();

  if (bucket) {
    const prefix = `${category}/`;
    const listed = await bucket.list({ prefix });
    return listed.objects
      .map((obj: R2Object) => ({
        name: obj.key.replace(prefix, ""),
        modified: new Date(obj.uploaded),
        size: obj.size,
      }))
      .sort((a, b) => b.modified.getTime() - a.modified.getTime());
  }

  const dir = localCategoryDir(category);
  const names = (await readdir(dir).catch(() => [])).filter((name) => !name.startsWith("."));
  const files: StoredFile[] = [];
  for (const name of names) {
    try {
      const s = await stat(path.join(dir, name));
      files.push({ name, modified: s.mtime, size: s.size });
    } catch {
      // Ignore missing or inaccessible files
    }
  }

  return files.sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

/**
 * Deletes a single file from storage.
 */
export async function deleteStorageFile(category: StorageCategory, filename: string): Promise<void> {
  const bucket = await getR2Bucket();
  const key = `${category}/${filename}`;

  if (bucket) {
    await bucket.delete(key);
    return;
  }

  const filePath = path.join(localCategoryDir(category), filename);
  await unlink(filePath).catch(() => {});
}

/**
 * Deletes all files in the given category.
 */
export async function deleteAllStorageFiles(category: StorageCategory): Promise<void> {
  const bucket = await getR2Bucket();

  if (bucket) {
    const prefix = `${category}/`;
    const listed = await bucket.list({ prefix });
    const keys = listed.objects.map((obj) => obj.key);
    if (keys.length > 0) {
      await bucket.delete(keys);
    }
    return;
  }

  const dir = localCategoryDir(category);
  await rm(dir, { recursive: true, force: true });
}
