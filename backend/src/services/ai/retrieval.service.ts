import { ensureCropDocsIndex } from "./config";
import { embedQuery } from "./embeddings.service";

export type CropDocSource = {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  score: number | null;
};

export type CropDocHit = CropDocSource & {
  text: string;
};

export async function searchCropDocuments(
  question: string,
  cropName?: string,
  topK = 6,
): Promise<CropDocHit[]> {
  const query = `${cropName ? `Crop: ${cropName}\n` : ""}${question}`.slice(0, 3_000);
  const vector = await embedQuery(query);
  const index = await ensureCropDocsIndex();
  const response = await index.query({
    vector,
    topK: Math.min(Math.max(topK, 1), 10),
    includeMetadata: true,
  });

  return (response.matches ?? [])
    .map((match) => {
      const metadata = (match.metadata ?? {}) as Record<string, unknown>;
      const text = typeof metadata.text === "string" ? metadata.text : "";
      const documentId = typeof metadata.documentId === "string" ? metadata.documentId : match.id;
      const documentName =
        typeof metadata.documentName === "string"
          ? metadata.documentName
          : typeof metadata.source === "string"
            ? metadata.source
            : "Crop document";
      const chunkIndex = Number(metadata.chunkIndex ?? 0);
      return {
        documentId,
        documentName,
        chunkIndex: Number.isFinite(chunkIndex) ? chunkIndex : 0,
        score: typeof match.score === "number" ? match.score : null,
        text,
      };
    })
    .filter((hit) => hit.text.trim().length > 0);
}
