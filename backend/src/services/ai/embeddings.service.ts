import { getEmbeddingModel, getPineconeClient } from "./config";

export type EmbeddingInputType = "passage" | "query";
const MAX_BATCH_SIZE = 48;

async function embedBatch(
  texts: string[],
  inputType: EmbeddingInputType,
): Promise<number[][]> {
  if (!texts.length) return [];

  const response = await getPineconeClient().inference.embed({
    model: getEmbeddingModel(),
    inputs: texts,
    parameters: {
      inputType,
      truncate: "END",
    },
  });

  const embeddings = response.data.map((embedding) => {
    if (embedding.vectorType !== "dense") {
      throw new Error(
        `Expected a dense embedding, received '${embedding.vectorType}'`,
      );
    }
    if (!Array.isArray(embedding.values) || embedding.values.length === 0) {
      throw new Error("Pinecone Inference returned an empty embedding");
    }
    return embedding.values;
  });

  if (embeddings.length !== texts.length) {
    throw new Error(
      `Embedding count mismatch: expected ${texts.length}, received ${embeddings.length}`,
    );
  }

  return embeddings;
}

async function requestEmbeddings(
  texts: string[],
  inputType: EmbeddingInputType,
): Promise<number[][]> {
  const output: number[][] = [];
  for (let start = 0; start < texts.length; start += MAX_BATCH_SIZE) {
    const batch = texts.slice(start, start + MAX_BATCH_SIZE);
    output.push(...(await embedBatch(batch, inputType)));
  }
  return output;
}

/** Embed chunks being stored in Pinecone. E5 requires inputType='passage'. */
export async function embedPassages(texts: string[]): Promise<number[][]> {
  return requestEmbeddings(texts, "passage");
}

/** Embed a user's search question. E5 requires inputType='query'. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await requestEmbeddings([text], "query");
  if (!vector)
    throw new Error("Pinecone Inference returned no query embedding");
  return vector;
}
