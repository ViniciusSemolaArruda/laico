import "server-only";

import {
  createHash,
  randomUUID,
} from "node:crypto";

const CLOUDINARY_PRODUCT_FOLDER =
  "laico/products";

const CLOUDINARY_BANNER_FOLDER =
  "laico/banners";

const MAX_BANNER_BYTES =
  8 * 1024 * 1024;

export type BannerImageVariant =
  | "desktop"
  | "mobile";

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

type CloudinaryResourceResponse = {
  public_id?: string;
  secure_url?: string;
  resource_type?: string;
  type?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
};

function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME?.trim();

  const apiKey =
    process.env.CLOUDINARY_API_KEY?.trim();

  const apiSecret =
    process.env.CLOUDINARY_API_SECRET?.trim();

  if (
    !cloudName ||
    !apiKey ||
    !apiSecret
  ) {
    throw new Error(
      "CLOUDINARY_NOT_CONFIGURED"
    );
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
  };
}

function createSignature(
  parameters: Record<
    string,
    string | number
  >,
  apiSecret: string
) {
  const serialized =
    Object.entries(parameters)
      .sort(
        ([keyA], [keyB]) =>
          keyA.localeCompare(
            keyB
          )
      )
      .map(
        ([key, value]) =>
          `${key}=${value}`
      )
      .join("&");

  return createHash("sha1")
    .update(
      `${serialized}${apiSecret}`
    )
    .digest("hex");
}

function isAllowedImageFormat(
  format: string | undefined
) {
  if (!format) {
    return false;
  }

  return [
    "jpg",
    "jpeg",
    "png",
    "webp",
  ].includes(
    format.toLowerCase()
  );
}

async function getCloudinaryImageResource(
  publicId: string
) {
  const {
    cloudName,
    apiKey,
    apiSecret,
  } = getCloudinaryConfig();

  const credentials =
    Buffer.from(
      `${apiKey}:${apiSecret}`
    ).toString("base64");

  const response =
    await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(
        cloudName
      )}/resources/image/upload/${encodeURIComponent(
        publicId
      )}`,
      {
        method: "GET",

        headers: {
          Authorization:
            `Basic ${credentials}`,
        },

        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      "CLOUDINARY_RESOURCE_NOT_FOUND"
    );
  }

  const data =
    (await response.json()) as CloudinaryResourceResponse;

  if (
    data.public_id !==
      publicId ||
    data.resource_type !==
      "image" ||
    data.type !==
      "upload" ||
    !data.secure_url
  ) {
    throw new Error(
      "INVALID_CLOUDINARY_RESOURCE"
    );
  }

  if (
    !isAllowedImageFormat(
      data.format
    )
  ) {
    throw new Error(
      "INVALID_IMAGE_FORMAT"
    );
  }

  return {
    publicId,

    url:
      data.secure_url,

    format:
      data.format!.toLowerCase(),

    bytes:
      data.bytes ?? null,

    width:
      data.width ?? null,

    height:
      data.height ?? null,
  };
}

async function deleteCloudinaryImage(
  publicId: string
) {
  const {
    cloudName,
    apiKey,
    apiSecret,
  } = getCloudinaryConfig();

  const timestamp =
    Math.floor(
      Date.now() / 1000
    );

  const parameters = {
    public_id:
      publicId,
    timestamp,
  };

  const signature =
    createSignature(
      parameters,
      apiSecret
    );

  const formData =
    new FormData();

  formData.append(
    "public_id",
    publicId
  );

  formData.append(
    "timestamp",
    String(timestamp)
  );

  formData.append(
    "api_key",
    apiKey
  );

  formData.append(
    "signature",
    signature
  );

  const response =
    await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(
        cloudName
      )}/image/destroy`,
      {
        method: "POST",
        body: formData,
        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      "CLOUDINARY_DELETE_FAILED"
    );
  }
}

/*
 * =========================================================
 * PRODUTOS
 * =========================================================
 */

export function createProductImageUploadSignature() {
  const {
    cloudName,
    apiKey,
    apiSecret,
  } = getCloudinaryConfig();

  const timestamp =
    Math.floor(
      Date.now() / 1000
    );

  const folder =
    CLOUDINARY_PRODUCT_FOLDER;

  const publicId =
    `product-${randomUUID()}`;

  const parameters = {
    folder,
    public_id:
      publicId,
    timestamp,
  };

  const signature =
    createSignature(
      parameters,
      apiSecret
    );

  return {
    cloudName,
    apiKey,
    timestamp,
    folder,
    publicId,
    signature,
  };
}

export function isProductImagePublicId(
  publicId: string
) {
  return publicId.startsWith(
    `${CLOUDINARY_PRODUCT_FOLDER}/product-`
  );
}

export async function getProductImageResource(
  publicId: string
) {
  const normalized =
    publicId.trim();

  if (
    !isProductImagePublicId(
      normalized
    )
  ) {
    throw new Error(
      "INVALID_CLOUDINARY_PUBLIC_ID"
    );
  }

  return getCloudinaryImageResource(
    normalized
  );
}

export async function deleteProductImage(
  publicId: string
) {
  const normalized =
    publicId.trim();

  if (
    !normalized ||
    !isProductImagePublicId(
      normalized
    )
  ) {
    throw new Error(
      "INVALID_CLOUDINARY_PUBLIC_ID"
    );
  }

  await deleteCloudinaryImage(
    normalized
  );
}

/*
 * =========================================================
 * BANNERS
 * =========================================================
 */

export function createBannerImageUploadSignature(
  variant: BannerImageVariant
) {
  const {
    cloudName,
    apiKey,
    apiSecret,
  } = getCloudinaryConfig();

  if (
    variant !==
      "desktop" &&
    variant !==
      "mobile"
  ) {
    throw new Error(
      "INVALID_BANNER_VARIANT"
    );
  }

  const timestamp =
    Math.floor(
      Date.now() / 1000
    );

  const folder =
    CLOUDINARY_BANNER_FOLDER;

  const publicId =
    `banner-${variant}-${randomUUID()}`;

  const parameters = {
    folder,
    public_id:
      publicId,
    timestamp,
  };

  const signature =
    createSignature(
      parameters,
      apiSecret
    );

  return {
    cloudName,
    apiKey,
    timestamp,
    folder,
    publicId,
    signature,
    variant,
  };
}

export function isBannerImagePublicId(
  publicId: string,
  variant?: BannerImageVariant
) {
  const prefix =
    variant
      ? `${CLOUDINARY_BANNER_FOLDER}/banner-${variant}-`
      : `${CLOUDINARY_BANNER_FOLDER}/banner-`;

  return publicId.startsWith(
    prefix
  );
}

export async function getBannerImageResource(
  publicId: string,
  variant: BannerImageVariant
) {
  const normalized =
    publicId.trim();

  if (
    !isBannerImagePublicId(
      normalized,
      variant
    )
  ) {
    throw new Error(
      "INVALID_CLOUDINARY_PUBLIC_ID"
    );
  }

  const resource =
    await getCloudinaryImageResource(
      normalized
    );

  if (
    resource.bytes !== null &&
    resource.bytes >
      MAX_BANNER_BYTES
  ) {
    throw new Error(
      "BANNER_IMAGE_TOO_LARGE"
    );
  }

  if (
    variant ===
    "desktop"
  ) {
    if (
      resource.width !==
        1738 ||
      resource.height !==
        905
    ) {
      throw new Error(
        "INVALID_DESKTOP_BANNER_DIMENSIONS"
      );
    }
  }

  if (
    variant ===
    "mobile"
  ) {
    if (
      resource.width !==
        1254 ||
      resource.height !==
        1254
    ) {
      throw new Error(
        "INVALID_MOBILE_BANNER_DIMENSIONS"
      );
    }
  }

  return resource;
}

export async function deleteBannerImage(
  publicId: string
) {
  const normalized =
    publicId.trim();

  if (
    !normalized ||
    !isBannerImagePublicId(
      normalized
    )
  ) {
    throw new Error(
      "INVALID_CLOUDINARY_PUBLIC_ID"
    );
  }

  await deleteCloudinaryImage(
    normalized
  );
}