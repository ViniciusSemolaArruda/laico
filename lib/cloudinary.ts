import "server-only";

import {
  createHash,
  randomUUID,
} from "node:crypto";

const CLOUDINARY_PRODUCT_FOLDER =
  "laico/products";

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
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

/*
 * =========================================================
 * ASSINATURA PARA UPLOAD
 * =========================================================
 *
 * O navegador recebe apenas:
 *
 * - cloudName;
 * - apiKey;
 * - assinatura temporária;
 * - timestamp;
 * - pasta;
 * - publicId gerado pelo servidor.
 *
 * API Secret nunca é enviado.
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

/*
 * =========================================================
 * PUBLIC ID
 * =========================================================
 */

export function isProductImagePublicId(
  publicId: string
) {
  return publicId.startsWith(
    `${CLOUDINARY_PRODUCT_FOLDER}/product-`
  );
}

/*
 * =========================================================
 * EXCLUSÃO
 * =========================================================
 *
 * Usaremos quando:
 *
 * - funcionário remover uma imagem;
 * - cadastro do produto falhar depois do upload;
 * - produto tiver sua galeria alterada.
 */
type CloudinaryResourceResponse = {
  public_id?: string;
  secure_url?: string;
  resource_type?: string;
  type?: string;
  format?: string;
  bytes?: number;
};

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
        normalized
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
      normalized ||
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

  const format =
    data.format
      ?.toLowerCase();

  if (
    !format ||
    ![
      "jpg",
      "jpeg",
      "png",
      "webp",
    ].includes(format)
  ) {
    throw new Error(
      "INVALID_IMAGE_FORMAT"
    );
  }

  return {
    publicId:
      normalized,

    url:
      data.secure_url,

    format,

    bytes:
      data.bytes ?? null,
  };
}

export async function deleteProductImage(
  publicId: string
) {
  const normalizedPublicId =
    publicId.trim();

  if (
    !normalizedPublicId ||
    !isProductImagePublicId(
      normalizedPublicId
    )
  ) {
    throw new Error(
      "INVALID_CLOUDINARY_PUBLIC_ID"
    );
  }

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
      normalizedPublicId,
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
    normalizedPublicId
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
        method:
          "POST",

        body:
          formData,

        cache:
          "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      "CLOUDINARY_DELETE_FAILED"
    );
  }
}