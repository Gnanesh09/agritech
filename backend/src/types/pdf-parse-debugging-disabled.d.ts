declare module "pdf-parse-debugging-disabled" {
  type PdfParseResult = {
    text: string;
    numpages: number;
    numrender?: number;
    info?: Record<string, unknown>;
    metadata?: unknown;
    version?: string;
  };

  function pdfParse(data: Buffer, options?: Record<string, unknown>): Promise<PdfParseResult>;
  export default pdfParse;
}
