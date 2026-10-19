import type { NextFunction, Request, Response } from "express";
import multer from "multer";

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1,
  },
});

export function parseCropPdfUpload(req: Request, res: Response, next: NextFunction) {
  uploader.single("file")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(status).json({
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "PDF must be 20 MB or smaller"
            : `PDF upload rejected: ${error.message}`,
      });
    }
    if (error) {
      return res.status(400).json({ message: "Could not read the uploaded PDF" });
    }
    return next();
  });
}
