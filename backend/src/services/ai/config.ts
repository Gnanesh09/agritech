import { Pinecone } from "@pinecone-database/pinecone";

type CropIndex = ReturnType<Pinecone["index"]>;

let pineconeClient: Pinecone | undefined;
let cropIndexPromise: Promise<CropIndex> | undefined;

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getPineconeClient(): Pinecone {
  pineconeClient ??= new Pinecone({ apiKey: requiredEnv("PINECONE_API_KEY") });
  return pineconeClient;
}

export function getEmbeddingModel(): string {
  return process.env.PINECONE_EMBEDDING_MODEL?.trim() || "multilingual-e5-large";
}

export function getCropIndexName(): string {
  return process.env.PINECONE_INDEX_NAME?.trim() || "agri-crop-docs-e5";
}

export function getCropNamespace(): string {
  return process.env.PINECONE_NAMESPACE?.trim() || "crop-documents";
}

/**
 * Ensure that the conventional dense-vector index matches the selected
 * Pinecone-hosted embedding model. Unlike an integrated-inference index, this
 * stores explicit vectors returned by pc.inference.embed(), just like the
 * accompanying Python ingestion script.
 */
export async function ensureCropDocsIndex(): Promise<CropIndex> {
  if (cropIndexPromise) return cropIndexPromise;

  cropIndexPromise = (async () => {
    const pc = getPineconeClient();
    const indexName = getCropIndexName();
    const modelName = getEmbeddingModel();
    const cloud = process.env.PINECONE_CLOUD?.trim() || "aws";
    const region = process.env.PINECONE_REGION?.trim() || "us-east-1";

    const modelInfo = await pc.inference.getModel(modelName);
    if (modelInfo.vectorType !== "dense") {
      throw new Error(`Expected a dense embedding model, got ${modelInfo.vectorType}`);
    }
    const dimension = modelInfo.defaultDimension;

    let indexDescription;
    try {
      indexDescription = await pc.indexes.describe(indexName);
    } catch (describeError) {
      try {
        console.log(
          `[crop-ai] Creating Pinecone index '${indexName}' using ${modelName} (${dimension} dimensions)...`,
        );
        indexDescription = await pc.indexes.create({
          name: indexName,
          schema: {
            fields: {
              _values: {
                type: "dense_vector",
                dimension,
                metric: "cosine",
              },
            },
          },
          deployment: { deploymentType: "managed", cloud, region },
          waitUntilReady: true,
        });
      } catch (createError) {
        // Another process may have created it between describe and create.
        try {
          indexDescription = await pc.indexes.describe(indexName);
        } catch {
          throw new Error(
            `Could not find or create Pinecone index '${indexName}'. ` +
              `Check PINECONE_API_KEY, PINECONE_CLOUD and PINECONE_REGION. ` +
              `Original error: ${createError instanceof Error ? createError.message : String(createError)}. ` +
              `Describe error: ${describeError instanceof Error ? describeError.message : String(describeError)}`,
          );
        }
      }
    }

    if (indexDescription.dimension !== dimension) {
      throw new Error(
        `Pinecone index '${indexName}' has dimension ${indexDescription.dimension}, ` +
          `but model '${modelName}' requires ${dimension}. ` +
          `Create/use a separate index (recommended: agri-crop-docs-e5) and re-ingest the PDFs.`,
      );
    }

    return pc.index({ host: indexDescription.host, namespace: getCropNamespace() });
  })();

  try {
    return await cropIndexPromise;
  } catch (error) {
    cropIndexPromise = undefined;
    throw error;
  }
}
