import ImageKit from "@imagekit/nodejs";

export type ImageKitUploadAuth = {
  token: string;
  expire: number;
  signature: string;
};

export function generateImageKitUploadAuth(): ImageKitUploadAuth {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      "IMAGEKIT_PRIVATE_KEY is missing from backend environment variables.",
    );
  }

  const imagekit = new ImageKit({ privateKey });

  const auth = imagekit.helper.getAuthenticationParameters();

  if (!auth.token || !auth.expire || !auth.signature) {
    throw new Error("ImageKit returned incomplete upload credentials.");
  }

  return {
    token: auth.token,
    expire: auth.expire,
    signature: auth.signature,
  };
}
