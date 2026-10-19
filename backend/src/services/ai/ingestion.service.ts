import crypto from "node:crypto";
import path from "node:path";
import pdfParse from "pdf-parse-debugging-disabled";
import { ensureCropDocsIndex } from "./config";
import { embedPassages } from "./embeddings.service";

const CHUNK_SIZE = 1_200;
const CHUNK_OVERLAP = 180;
const UPSERT_BATCH_SIZE = 64;

export type IngestPdfOptions = {
  buffer: Buffer;
  filename: string;
  title?: string;
  cropName?: string;
  documentId?: string;
};

export type IngestPdfResult = {
  documentId: string;
  documentName: string;
  cropTag: string;
  pageCount: number | null;
  chunkCount: number;
};

function normalizeCropTag(value: string | undefined): string {
  const normalized = (value || "general")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return normalized || "general";
}

function splitIntoChunks(rawText: string): string[] {
  const text = rawText.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);

    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf("\n\n", end);
      const lineBreak = text.lastIndexOf("\n", end);
      const spaceBreak = text.lastIndexOf(" ", end);
      const preferredBreak = Math.max(paragraphBreak, lineBreak, spaceBreak);
      if (preferredBreak > start + Math.floor(CHUNK_SIZE * 0.6)) end = preferredBreak;
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length >= 30) chunks.push(chunk);
    if (end >= text.length) break;
    start = Math.max(start + 1, end - CHUNK_OVERLAP);
  }
  return chunks;
}

export async function ingestPdfBuffer(options: IngestPdfOptions): Promise<IngestPdfResult> {
  const { buffer } = options;
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) throw new Error("Uploaded PDF is empty or invalid");
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("The uploaded file is not a valid PDF");
  }

  const documentName = (options.title?.trim() || path.basename(options.filename)).slice(0, 240);
  const cropTag = normalizeCropTag(options.cropName);
  const documentId = options.documentId?.trim() || crypto.randomUUID();

  const parsed = await pdfParse(buffer);
  const rawText = typeof parsed.text === "string" ? parsed.text : "";
  const chunks = splitIntoChunks(rawText);
  if (chunks.length === 0) {
    throw new Error(
      "No extractable text found in the PDF. If it is a scanned document, OCR it before uploading.",
    );
  }

  const vectors = await embedPassages(chunks);
  if (vectors.length !== chunks.length) {
    throw new Error(`Embedding count mismatch: expected ${chunks.length}, received ${vectors.length}`);
  }

  const index = await ensureCropDocsIndex();
  const uploadedAt = new Date().toISOString();
  let upserted = 0;

  for (let start = 0; start < chunks.length; start += UPSERT_BATCH_SIZE) {
    const batch = chunks.slice(start, start + UPSERT_BATCH_SIZE).map((text, offset) => {
      const chunkIndex = start + offset;
      return {
        id: `${documentId}-chunk-${chunkIndex}`,
        values: vectors[chunkIndex]!,
        metadata: {
          documentId,
          documentName,
          source: documentName,
          cropTag,
          chunkIndex,
          text,
          uploadedAt,
        },
      };
    });

    await index.upsert({ records: batch });
    upserted += batch.length;
  }

  return {
    documentId,
    documentName,
    cropTag,
    pageCount: Number.isInteger(parsed.numpages) ? parsed.numpages : null,
    chunkCount: upserted,
  };
}
