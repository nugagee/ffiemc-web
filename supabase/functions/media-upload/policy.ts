// Pure checks for media signed-upload paths. No Deno or network calls.

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export const DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
  "text/markdown": "md",
};

const EXT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
};

const LIMITS: Record<string, number> = {
  image: 8 * 1024 * 1024,
  daily_growth: 8 * 1024 * 1024,
  document: 25 * 1024 * 1024,
  receipt: 8 * 1024 * 1024,
};

export type MediaPurpose = "image" | "document" | "daily_growth" | "receipt";

export type SignedUploadPlan = {
  purpose: MediaPurpose;
  path: string;
  contentType: string;
  upsert: false;
};

function extensionOf(fileName: string): string {
  const base = String(fileName || "").split(/[/\\]/).pop() || "";
  const match = base.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function typesFor(purpose: MediaPurpose): Record<string, string> {
  if (purpose === "document") return DOCUMENT_TYPES;
  if (purpose === "receipt") {
    return {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/avif": "avif",
      "application/pdf": "pdf",
    };
  }
  return IMAGE_TYPES;
}

export function planMediaUpload(input: {
  purpose: string;
  contentType?: string;
  fileName?: string;
  size?: number;
  imageDate?: string;
  nowMs?: number;
  nonce?: string;
}): SignedUploadPlan {
  const purpose = String(input.purpose || "").trim().toLowerCase() as MediaPurpose;
  if (!["image", "document", "daily_growth", "receipt"].includes(purpose)) {
    throw new Error("Invalid upload purpose");
  }
  const size = Number(input.size || 0);
  const limit = LIMITS[purpose];
  if (!Number.isFinite(size) || size <= 0) throw new Error("Choose a file to upload");
  if (size > limit) throw new Error(`File must be under ${Math.round(limit / (1024 * 1024))}MB`);

  const fileName = String(input.fileName || "");
  if (/[\0]/.test(fileName) || /\.(svg|html?|xhtml)(\.|$)/i.test(fileName)) {
    throw new Error("SVG and HTML files are not allowed");
  }

  const ext = extensionOf(fileName);
  let contentType = String(input.contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (contentType === "image/jpg") contentType = "image/jpeg";
  if (!contentType || contentType === "application/octet-stream") {
    contentType = EXT_TYPES[ext] || "";
  }
  if (contentType === "image/svg+xml" || contentType === "text/html" || contentType === "application/xhtml+xml") {
    throw new Error("SVG and HTML files are not allowed");
  }

  const allowed = typesFor(purpose);
  const canonicalExt = allowed[contentType];
  if (!canonicalExt) throw new Error("This file type is not allowed");
  if (ext && EXT_TYPES[ext] && EXT_TYPES[ext] !== contentType) {
    throw new Error("File extension does not match its type");
  }
  const storedExt = ext === "jpeg" ? "jpg" : canonicalExt;

  const nonce = String(input.nonce || "file").replace(/[^a-z0-9]/gi, "").slice(0, 16) || "file";
  const stamp = Number.isFinite(input.nowMs) ? Math.trunc(input.nowMs as number) : Date.now();
  const leaf = `${stamp}-${nonce}.${storedExt}`;

  let folder = "blog";
  if (purpose === "document") folder = "documents";
  if (purpose === "receipt") folder = "contributions";
  if (purpose === "daily_growth") {
    const imageDate = String(input.imageDate || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(imageDate)) throw new Error("Image date is required");
    folder = `daily-growth/${imageDate}`;
  }

  return {
    purpose,
    path: `${folder}/${leaf}`,
    contentType,
    upsert: false,
  };
}

const DELETE_PREFIXES = ["blog/", "documents/", "contributions/", "daily-growth/", "banners/", "announcements/"];

export function assertDeletableMediaPath(value: string): string {
  const path = String(value || "").trim().replace(/^\/+/, "");
  if (!path || path.includes("..") || path.includes("\\") || path.includes("\0")) {
    throw new Error("Invalid storage path");
  }
  if (!DELETE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    throw new Error("This file cannot be removed from here");
  }
  if (/\.(svg|html?|xhtml)($|\?)/i.test(path)) {
    throw new Error("Invalid storage path");
  }
  return path;
}
