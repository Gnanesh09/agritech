import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { ingestPdfBuffer } from "../src/services/ai/ingestion.service";

async function findPdfFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await findPdfFiles(fullPath)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
      found.push(fullPath);
  }
  return found;
}

async function main() {
  const sourceDirectory = path.resolve(process.argv[2] || "crop-docs");
  const files = await findPdfFiles(sourceDirectory).catch((error: unknown) => {
    throw new Error(
      `Unable to read PDF directory '${sourceDirectory}': ${String(error)}`,
    );
  });

  if (!files.length) {
    console.log(
      `No PDFs found in ${sourceDirectory}. Place PDFs there or pass a directory path.`,
    );
    return;
  }

  console.log(
    `Found ${files.length} PDF(s). Ingestion runs sequentially to limit API load.`,
  );
  for (const filePath of files) {
    const relativePath = path.relative(sourceDirectory, filePath);
    const firstFolder = relativePath.split(path.sep)[0];
    const cropName =
      path.dirname(relativePath) === "." ? undefined : firstFolder;
    try {
      const result = await ingestPdfBuffer({
        buffer: await readFile(filePath),
        filename: path.basename(filePath),
        title: relativePath.replaceAll(path.sep, " / "),
        cropName,
      });
      console.log(
        `✓ ${relativePath}: ${result.chunkCount} chunks (documentId ${result.documentId})`,
      );
    } catch (error) {
      console.error(
        `✗ ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
