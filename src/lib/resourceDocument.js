import { DOCUMENT_FORMATS, downloadDocument } from "./downloadDocument";

export async function readTextFile(file) {
  if (!file) return "";
  const name = String(file.name || "").toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".html") || name.endsWith(".htm")) {
    return file.text();
  }
  throw new Error("Upload .txt or .md for automatic import. For PDF/Word, upload the file and paste or edit the content below.");
}

export function resourceToDocument(resource = {}) {
  return {
    title: resource.title || "Church resource",
    meta: resource.week_of || resource.study_date || resource.kind || "",
    body: resource.content || resource.excerpt || "",
  };
}

export function downloadResource(resource, formatId = "txt") {
  return downloadDocument(resourceToDocument(resource), formatId);
}

export { DOCUMENT_FORMATS };
