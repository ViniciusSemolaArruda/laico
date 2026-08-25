"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ImagePlus,
  LoaderCircle,
  Plus,
  Star,
  Trash2,
  Upload,
} from "lucide-react";

import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useRef,
  useState,
} from "react";

const MAX_IMAGES = 8;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const clothingSizes = [
  "P",
  "M",
  "G",
  "GG",
  "XG",
] as const;

const productTypeOptions = [
  {
    value: "STANDARD",
    title: "Produto comum",
    description:
      "Livros, decoração e outros produtos.",
    category: "Produtos em geral",
  },
  {
    value: "ACCESSORY",
    title: "Acessório",
    description:
      "Pulseiras, brincos, colares e acessórios em geral.",
    category: "Acessórios",
  },
  {
    value: "RELIGIOUS_IMAGE",
    title: "Imagem ou escultura",
    description:
      "Imagens de santos, esculturas e peças religiosas.",
    category:
      "Imagens e Esculturas Religiosas",
  },
  {
    value: "CLOTHING_TOP",
    title: "Camisa ou blusa",
    description:
      "Camisas, camisetas, blusas e peças superiores.",
    category: "Vestuário",
  },
  {
    value: "CLOTHING_BOTTOM",
    title: "Calça ou bermuda",
    description:
      "Calças, shorts, bermudas e peças inferiores.",
    category: "Vestuário",
  },
] as const;

const religions = [
  {
    value: "Católicos e Protestantes",
    icon: "✝️",
  },
  {
    value: "Islamismo",
    icon: "☪️",
  },
  {
    value: "Judaísmo",
    icon: "✡️",
  },
  {
    value: "Hinduísmo",
    icon: "🕉️",
  },
  {
    value: "Budismo",
    icon: "☸️",
  },
  {
    value: "Espiritismo",
    icon: "🕯️",
  },
  {
    value: "Matriz Africana",
    icon: "🪘",
  },
  {
    value: "Povos Originários",
    icon: "🪶",
  },
  {
    value: "Quilombolas",
    icon: "🌍",
  },
  {
    value: "Ciganos",
    icon: "🎪",
  },
  {
    value: "Ortodoxos",
    icon: "⛪",
  },
  {
    value: "Anglicanismo",
    icon: "✝",
  },
] as const;

type ProductType =
  | "STANDARD"
  | "ACCESSORY"
  | "RELIGIOUS_IMAGE"
  | "CLOTHING_TOP"
  | "CLOTHING_BOTTOM";

type ClothingSize =
  (typeof clothingSizes)[number];

type ImageDraft = {
  id: string;
  file: File;
  preview: string;
  isPrimary: boolean;
};

type VariantDraft = {
  size: ClothingSize;
  stock: string;
  minimumStock: string;

  pieceLength: string;
  sleeveLength: string;
  shoulderWidth: string;
  chestCircumference: string;

  waistCircumference: string;
  hipCircumference: string;
  thighCircumference: string;
  inseamLength: string;

  bodyChestMinimum: string;
  bodyChestMaximum: string;
  bodyWaistMinimum: string;
  bodyWaistMaximum: string;
  bodyHipMinimum: string;
  bodyHipMaximum: string;
};

type UploadSignatureResponse = {
  success?: boolean;

  upload?: {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    folder: string;
    publicId: string;
    signature: string;
  };

  error?: string;
};

type CloudinaryResponse = {
  public_id?: string;
  secure_url?: string;
  format?: string;
};

type ProductResponse = {
  success?: boolean;

  product?: {
    id: string;
  };

  error?: string;
};

function createEmptyVariant(
  size: ClothingSize
): VariantDraft {
  return {
    size,
    stock: "0",
    minimumStock: "0",

    pieceLength: "",
    sleeveLength: "",
    shoulderWidth: "",
    chestCircumference: "",

    waistCircumference: "",
    hipCircumference: "",
    thighCircumference: "",
    inseamLength: "",

    bodyChestMinimum: "",
    bodyChestMaximum: "",
    bodyWaistMinimum: "",
    bodyWaistMaximum: "",
    bodyHipMinimum: "",
    bodyHipMaximum: "",
  };
}

function createSlug(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(0, 180);
}

export default function NewProductForm() {
  const inputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [name, setName] =
    useState("");

  const [
    productType,
    setProductType,
  ] =
    useState<ProductType>(
      "STANDARD"
    );

  const [
    category,
    setCategory,
  ] =
    useState(
      "Produtos em geral"
    );

  const [
    selectedReligions,
    setSelectedReligions,
  ] =
    useState<string[]>([]);

  const [variants, setVariants] =
    useState<VariantDraft[]>(
      []
    );

  const [images, setImages] =
    useState<ImageDraft[]>([]);

  const [dragging, setDragging] =
    useState(false);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const slug =
    createSlug(name);

  const isClothing =
    productType ===
      "CLOTHING_TOP" ||
    productType ===
      "CLOTHING_BOTTOM";

  const isClothingTop =
    productType ===
    "CLOTHING_TOP";

  const isClothingBottom =
    productType ===
    "CLOTHING_BOTTOM";

  const isReligiousImage =
    productType ===
    "RELIGIOUS_IMAGE";

  const totalVariantStock =
    variants.reduce(
      (
        total,
        variant
      ) => {
        const stock =
          Number(
            variant.stock
          );

        return (
          total +
          (Number.isSafeInteger(
            stock
          ) &&
          stock > 0
            ? stock
            : 0)
        );
      },
      0
    );

  function handleProductTypeChange(
    newType: ProductType
  ) {
    if (submitting) {
      return;
    }

    const option =
      productTypeOptions.find(
        (item) =>
          item.value ===
          newType
      );

    setProductType(
      newType
    );

    if (option) {
      setCategory(
        option.category
      );
    }

    if (
      newType ===
        "CLOTHING_TOP" ||
      newType ===
        "CLOTHING_BOTTOM"
    ) {
      setVariants(
        (current) =>
          current.length > 0
            ? current
            : [
                createEmptyVariant(
                  "P"
                ),
              ]
      );
    } else {
      setVariants([]);
    }

    setError(null);
  }

  function toggleSize(
    size: ClothingSize
  ) {
    if (submitting) {
      return;
    }

    setVariants(
      (current) => {
        const exists =
          current.some(
            (variant) =>
              variant.size ===
              size
          );

        if (exists) {
          return current.filter(
            (variant) =>
              variant.size !==
              size
          );
        }

        return clothingSizes
          .filter(
            (currentSize) =>
              current.some(
                (variant) =>
                  variant.size ===
                  currentSize
              ) ||
              currentSize ===
                size
          )
          .map(
            (currentSize) =>
              current.find(
                (variant) =>
                  variant.size ===
                  currentSize
              ) ??
              createEmptyVariant(
                currentSize
              )
          );
      }
    );
  }

  function updateVariant(
    size: ClothingSize,
    field:
      keyof Omit<
        VariantDraft,
        "size"
      >,
    value: string
  ) {
    setVariants(
      (current) =>
        current.map(
          (variant) =>
            variant.size ===
            size
              ? {
                  ...variant,
                  [field]:
                    value,
                }
              : variant
        )
    );
  }

  function addFiles(
    files: File[]
  ) {
    setError(null);

    const remaining =
      MAX_IMAGES -
      images.length;

    if (remaining <= 0) {
      setError(
        `Você pode adicionar no máximo ${MAX_IMAGES} imagens.`
      );

      return;
    }

    const accepted: File[] =
      [];

    for (
      const file of files
    ) {
      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(
          file.type
        )
      ) {
        setError(
          "Use somente imagens JPG, PNG ou WEBP."
        );

        continue;
      }

      if (
        file.size >
        MAX_IMAGE_SIZE
      ) {
        setError(
          "Cada imagem pode ter no máximo 8 MB."
        );

        continue;
      }

      accepted.push(file);
    }

    const selected =
      accepted.slice(
        0,
        remaining
      );

    if (
      accepted.length >
      remaining
    ) {
      setError(
        `Você pode adicionar no máximo ${MAX_IMAGES} imagens.`
      );
    }

    const drafts =
      selected.map(
        (
          file,
          index
        ): ImageDraft => ({
          id:
            crypto.randomUUID(),

          file,

          preview:
            URL.createObjectURL(
              file
            ),

          isPrimary:
            images.length ===
              0 &&
            index === 0,
        })
      );

    setImages(
      (current) => [
        ...current,
        ...drafts,
      ]
    );
  }

  function handleFileInput(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files =
      Array.from(
        event.target.files ??
          []
      );

    addFiles(files);

    event.target.value =
      "";
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    setDragging(false);

    if (submitting) {
      return;
    }

    addFiles(
      Array.from(
        event.dataTransfer
          .files
      )
    );
  }

  function removeImage(
    id: string
  ) {
    if (submitting) {
      return;
    }

    setImages(
      (current) => {
        const image =
          current.find(
            (item) =>
              item.id === id
          );

        if (image) {
          URL.revokeObjectURL(
            image.preview
          );
        }

        const remaining =
          current.filter(
            (item) =>
              item.id !== id
          );

        if (
          remaining.length >
            0 &&
          !remaining.some(
            (item) =>
              item.isPrimary
          )
        ) {
          remaining[0] = {
            ...remaining[0],
            isPrimary: true,
          };
        }

        return remaining;
      }
    );
  }

  function makePrimary(
    id: string
  ) {
    if (submitting) {
      return;
    }

    setImages(
      (current) =>
        current.map(
          (image) => ({
            ...image,

            isPrimary:
              image.id === id,
          })
        )
    );
  }

  function moveImage(
    index: number,
    direction: -1 | 1
  ) {
    if (submitting) {
      return;
    }

    setImages(
      (current) => {
        const next =
          [...current];

        const target =
          index +
          direction;

        if (
          target < 0 ||
          target >=
            next.length
        ) {
          return current;
        }

        [
          next[index],
          next[target],
        ] = [
          next[target],
          next[index],
        ];

        return next;
      }
    );
  }

  function toggleReligion(
    religion: string
  ) {
    if (submitting) {
      return;
    }

    setSelectedReligions(
      (current) =>
        current.includes(
          religion
        )
          ? current.filter(
              (item) =>
                item !==
                religion
            )
          : [
              ...current,
              religion,
            ]
    );
  }

  function validateVariants() {
    if (!isClothing) {
      return true;
    }

    if (
      variants.length === 0
    ) {
      setError(
        "Selecione pelo menos um tamanho."
      );

      return false;
    }

    for (
      const variant of
      variants
    ) {
      const stock =
        Number(
          variant.stock
        );

      const minimumStock =
        Number(
          variant.minimumStock
        );

      if (
        !Number.isSafeInteger(
          stock
        ) ||
        stock < 0
      ) {
        setError(
          `Informe um estoque válido para o tamanho ${variant.size}.`
        );

        return false;
      }

      if (
        !Number.isSafeInteger(
          minimumStock
        ) ||
        minimumStock < 0
      ) {
        setError(
          `Informe um estoque mínimo válido para o tamanho ${variant.size}.`
        );

        return false;
      }

      const requiredFields =
        isClothingTop
          ? [
              {
                value:
                  variant.pieceLength,
                label:
                  "comprimento da peça",
              },
              {
                value:
                  variant.sleeveLength,
                label:
                  "comprimento da manga",
              },
              {
                value:
                  variant.shoulderWidth,
                label:
                  "medida de ombro a ombro",
              },
              {
                value:
                  variant.chestCircumference,
                label:
                  "circunferência do tórax",
              },
              {
                value:
                  variant.bodyChestMinimum,
                label:
                  "tórax corporal mínimo",
              },
              {
                value:
                  variant.bodyChestMaximum,
                label:
                  "tórax corporal máximo",
              },
              {
                value:
                  variant.bodyWaistMinimum,
                label:
                  "cintura corporal mínima",
              },
              {
                value:
                  variant.bodyWaistMaximum,
                label:
                  "cintura corporal máxima",
              },
            ]
          : [
              {
                value:
                  variant.pieceLength,
                label:
                  "comprimento total",
              },
              {
                value:
                  variant.waistCircumference,
                label:
                  "circunferência da cintura",
              },
              {
                value:
                  variant.hipCircumference,
                label:
                  "circunferência do quadril",
              },
              {
                value:
                  variant.thighCircumference,
                label:
                  "circunferência da coxa",
              },
              {
                value:
                  variant.inseamLength,
                label:
                  "comprimento interno da perna",
              },
              {
                value:
                  variant.bodyWaistMinimum,
                label:
                  "cintura corporal mínima",
              },
              {
                value:
                  variant.bodyWaistMaximum,
                label:
                  "cintura corporal máxima",
              },
              {
                value:
                  variant.bodyHipMinimum,
                label:
                  "quadril corporal mínimo",
              },
              {
                value:
                  variant.bodyHipMaximum,
                label:
                  "quadril corporal máximo",
              },
            ];

      for (
        const field of
        requiredFields
      ) {
        const value =
          Number(
            String(
              field.value
            ).replace(
              ",",
              "."
            )
          );

        if (
          !Number.isFinite(
            value
          ) ||
          value <= 0
        ) {
          setError(
            `Informe ${field.label} do tamanho ${variant.size}.`
          );

          return false;
        }
      }

      const ranges =
        isClothingTop
          ? [
              {
                minimum:
                  variant.bodyChestMinimum,
                maximum:
                  variant.bodyChestMaximum,
                label:
                  "tórax corporal",
              },
              {
                minimum:
                  variant.bodyWaistMinimum,
                maximum:
                  variant.bodyWaistMaximum,
                label:
                  "cintura corporal",
              },
            ]
          : [
              {
                minimum:
                  variant.bodyWaistMinimum,
                maximum:
                  variant.bodyWaistMaximum,
                label:
                  "cintura corporal",
              },
              {
                minimum:
                  variant.bodyHipMinimum,
                maximum:
                  variant.bodyHipMaximum,
                label:
                  "quadril corporal",
              },
            ];

      for (const range of ranges) {
        const minimum =
          Number(
            range.minimum.replace(
              ",",
              "."
            )
          );

        const maximum =
          Number(
            range.maximum.replace(
              ",",
              "."
            )
          );

        if (maximum < minimum) {
          setError(
            `A medida máxima de ${range.label} do tamanho ${variant.size} não pode ser menor que a mínima.`
          );

          return false;
        }
      }
    }

    return true;
  }

  async function uploadImage(
    image: ImageDraft,
    position: number
  ) {
    const signatureResponse =
      await fetch(
        "/api/admin/products/upload-signature",
        {
          method: "POST",
          credentials:
            "same-origin",
          cache: "no-store",
        }
      );

    const signatureData =
      (await signatureResponse.json()) as UploadSignatureResponse;

    if (
      !signatureResponse.ok ||
      !signatureData.upload
    ) {
      throw new Error(
        signatureData.error ||
          "Não foi possível preparar o envio da imagem."
      );
    }

    const upload =
      signatureData.upload;

    const formData =
      new FormData();

    formData.append(
      "file",
      image.file
    );

    formData.append(
      "api_key",
      upload.apiKey
    );

    formData.append(
      "timestamp",
      String(
        upload.timestamp
      )
    );

    formData.append(
      "folder",
      upload.folder
    );

    formData.append(
      "public_id",
      upload.publicId
    );

    formData.append(
      "signature",
      upload.signature
    );

    const response =
      await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(
          upload.cloudName
        )}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

    const data =
      (await response.json()) as CloudinaryResponse;

    if (
      !response.ok ||
      !data.public_id ||
      !data.secure_url
    ) {
      throw new Error(
        "Não foi possível enviar uma das imagens."
      );
    }

    if (
      data.format &&
      ![
        "jpg",
        "jpeg",
        "png",
        "webp",
      ].includes(
        data.format.toLowerCase()
      )
    ) {
      throw new Error(
        "O formato de uma das imagens não é permitido."
      );
    }

    return {
      url:
        data.secure_url,

      publicId:
        data.public_id,

      position,

      isPrimary:
        image.isPrimary,

      alt:
        name.trim(),
    };
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError(null);

    if (
      name.trim().length < 2
    ) {
      setError(
        "Informe o nome do produto."
      );

      return;
    }

    if (!slug) {
      setError(
        "Não foi possível gerar o slug do produto."
      );

      return;
    }

    if (!category.trim()) {
      setError(
        "Informe a categoria."
      );

      return;
    }

    if (
      selectedReligions.length ===
      0
    ) {
      setError(
        "Selecione pelo menos uma religião."
      );

      return;
    }

    if (
      images.length === 0
    ) {
      setError(
        "Adicione pelo menos uma imagem do produto."
      );

      return;
    }

    if (
      !validateVariants()
    ) {
      return;
    }

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    setSubmitting(true);

    try {
      const uploadedImages =
        [];

      for (
        let index = 0;
        index <
        images.length;
        index += 1
      ) {
        uploadedImages.push(
          await uploadImage(
            images[index],
            index
          )
        );
      }

      const payload = {
        name:
          name.trim(),

        productType,

        category:
          category.trim(),

        materialComposition:
          isClothing
            ? String(
                formData.get(
                  "materialComposition"
                ) ?? ""
              ).trim()
            : "",

        shortDescription:
          String(
            formData.get(
              "shortDescription"
            ) ?? ""
          ).trim(),

        description:
          String(
            formData.get(
              "description"
            ) ?? ""
          ).trim(),

        price:
          String(
            formData.get(
              "price"
            ) ?? ""
          ),

        salePrice:
          String(
            formData.get(
              "salePrice"
            ) ?? ""
          ),

        cost:
          String(
            formData.get(
              "cost"
            ) ?? ""
          ),

        religions:
          selectedReligions,

        stock:
          isClothing
            ? String(
                totalVariantStock
              )
            : String(
                formData.get(
                  "stock"
                ) ?? ""
              ),

        minimumStock:
          isClothing
            ? "0"
            : String(
                formData.get(
                  "minimumStock"
                ) ?? ""
              ),

        weight:
          String(
            formData.get(
              "weight"
            ) ?? ""
          ),

        height:
          String(
            formData.get(
              "height"
            ) ?? ""
          ),

        width:
          String(
            formData.get(
              "width"
            ) ?? ""
          ),

        length:
          String(
            formData.get(
              "length"
            ) ?? ""
          ),

        variants:
          isClothing
            ? variants
            : [],

        featured:
          formData.has(
            "featured"
          ),

        active:
          formData.has(
            "active"
          ),

        seoTitle:
          String(
            formData.get(
              "seoTitle"
            ) ?? ""
          ).trim(),

        seoDescription:
          String(
            formData.get(
              "seoDescription"
            ) ?? ""
          ).trim(),

        images:
          uploadedImages,
      };

      const response =
        await fetch(
          "/api/admin/products",
          {
            method: "POST",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const data =
        (await response.json()) as ProductResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Não foi possível cadastrar o produto."
        );
      }

      images.forEach(
        (image) =>
          URL.revokeObjectURL(
            image.preview
          )
      );

      window.location.replace(
        "/admin/produtos?created=1"
      );
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : "Não foi possível cadastrar o produto."
      );

      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-7"
    >
      {/* TIPO DO PRODUTO */}

      <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#20170f]">
          Tipo do produto
        </h2>

        <p className="mt-1 text-sm text-neutral-500">
          Escolha o tipo para
          mostrar somente os campos
          necessários.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {productTypeOptions.map(
            (option) => {
              const selected =
                productType ===
                option.value;

              return (
                <button
                  key={
                    option.value
                  }
                  type="button"
                  disabled={
                    submitting
                  }
                  onClick={() =>
                    handleProductTypeChange(
                      option.value
                    )
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-[#b98218] bg-[#fff8e8] ring-2 ring-[#b98218]/15"
                      : "border-[#e8dcc2] bg-white hover:border-[#b98218]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-[#20170f]">
                      {
                        option.title
                      }
                    </strong>

                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        selected
                          ? "border-[#b98218] bg-[#b98218] text-white"
                          : "border-neutral-300"
                      }`}
                    >
                      {selected && (
                        <Check
                          size={12}
                        />
                      )}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-5 text-neutral-500">
                    {
                      option.description
                    }
                  </p>
                </button>
              );
            }
          )}
        </div>
      </section>

      {/* INFORMAÇÕES */}

      <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#20170f]">
          Informações do produto
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <label>
            <span className="text-sm font-bold">
              Nome *
            </span>

            <input
              value={name}
              onChange={(
                event
              ) =>
                setName(
                  event.target
                    .value
                )
              }
              required
              maxLength={200}
              disabled={
                submitting
              }
              placeholder="Nome do produto"
              className="mt-2 h-12 w-full rounded-xl border border-[#e8dcc2] px-4 outline-none focus:border-[#b98218]"
            />
          </label>

          <label>
            <span className="text-sm font-bold">
              Slug automático
            </span>

            <input
              value={slug}
              readOnly
              tabIndex={-1}
              placeholder="gerado-automaticamente"
              className="mt-2 h-12 w-full cursor-not-allowed rounded-xl border border-[#e8dcc2] bg-[#f7f4ee] px-4 text-neutral-500"
            />
          </label>

          <label>
            <span className="text-sm font-bold">
              SKU / Código interno
            </span>

            <input
              value="Gerado automaticamente ao salvar"
              readOnly
              tabIndex={-1}
              className="mt-2 h-12 w-full cursor-not-allowed rounded-xl border border-[#e8dcc2] bg-[#f7f4ee] px-4 text-neutral-500"
            />
          </label>

          <label>
            <span className="text-sm font-bold">
              Categoria *
            </span>

            <input
              value={category}
              onChange={(
                event
              ) =>
                setCategory(
                  event.target
                    .value
                )
              }
              required
              maxLength={120}
              disabled={
                submitting
              }
              className="mt-2 h-12 w-full rounded-xl border border-[#e8dcc2] px-4 outline-none focus:border-[#b98218]"
            />
          </label>
        </div>

        {/* RELIGIÕES */}

        <div className="mt-5">
          <span className="text-sm font-bold">
            Religião *
          </span>

          <details className="group relative mt-2">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-xl border border-[#e8dcc2] bg-white px-4">
              <span
                className={
                  selectedReligions.length
                    ? "text-sm text-[#20170f]"
                    : "text-sm text-neutral-400"
                }
              >
                {selectedReligions.length
                  ? `${selectedReligions.length} selecionada(s)`
                  : "Selecione as religiões"}
              </span>

              <ChevronDown
                size={18}
                className="text-[#b98218] transition group-open:rotate-180"
              />
            </summary>

            <div className="absolute left-0 top-[54px] z-30 w-full max-w-[430px] rounded-xl border border-[#e8dcc2] bg-white p-3 shadow-xl">
              <div className="max-h-[360px] overflow-y-auto">
                {religions.map(
                  (
                    religion
                  ) => {
                    const checked =
                      selectedReligions.includes(
                        religion.value
                      );

                    return (
                      <button
                        type="button"
                        key={
                          religion.value
                        }
                        disabled={
                          submitting
                        }
                        onClick={() =>
                          toggleReligion(
                            religion.value
                          )
                        }
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-[#faf9f6]"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            checked
                              ? "border-[#b98218] bg-[#b98218] text-white"
                              : "border-neutral-300"
                          }`}
                        >
                          {checked && (
                            <Check
                              size={11}
                            />
                          )}
                        </span>

                        <span className="w-6 text-center">
                          {
                            religion.icon
                          }
                        </span>

                        <span>
                          {
                            religion.value
                          }
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </details>

          {selectedReligions.length >
            0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedReligions.map(
                (religion) => (
                  <span
                    key={religion}
                    className="rounded-full bg-[#fff8e8] px-3 py-1 text-xs font-bold text-[#9f6f14]"
                  >
                    {religion}
                  </span>
                )
              )}
            </div>
          )}
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-bold">
            Descrição curta
          </span>

          <input
            name="shortDescription"
            maxLength={300}
            disabled={
              submitting
            }
            placeholder="Resumo exibido nos cards do produto"
            className="mt-2 h-12 w-full rounded-xl border border-[#e8dcc2] px-4 outline-none focus:border-[#b98218]"
          />
        </label>

        <label className="mt-5 block">
          <span className="text-sm font-bold">
            Descrição completa *
          </span>

          <textarea
            name="description"
            required
            maxLength={10000}
            rows={6}
            disabled={
              submitting
            }
            placeholder="Descrição completa do produto"
            className="mt-2 w-full resize-y rounded-xl border border-[#e8dcc2] px-4 py-3 outline-none focus:border-[#b98218]"
          />
        </label>
      </section>

      {/* IMAGENS */}

      <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <ImagePlus className="text-[#b98218]" />

          <div>
            <h2 className="text-xl font-extrabold text-[#20170f]">
              Imagens
            </h2>

            <p className="text-sm text-neutral-500">
              Até {MAX_IMAGES} imagens.
              JPG, PNG ou WEBP.
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={
            submitting
          }
          onChange={
            handleFileInput
          }
          className="hidden"
        />

        <div
          onDragOver={(
            event
          ) => {
            event.preventDefault();

            if (!submitting) {
              setDragging(true);
            }
          }}
          onDragLeave={() =>
            setDragging(false)
          }
          onDrop={handleDrop}
          onClick={() =>
            !submitting &&
            inputRef.current?.click()
          }
          className={`mt-6 flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 text-center transition ${
            dragging
              ? "border-[#b98218] bg-[#fff8e8]"
              : "border-[#dfd2b7] bg-[#faf9f6] hover:border-[#b98218]"
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff8e8] text-[#b98218]">
            <Upload size={25} />
          </div>

          <strong className="mt-4 text-[#20170f]">
            Arraste suas imagens
            para cá
          </strong>

          <p className="mt-1 text-sm text-neutral-500">
            ou clique para escolher
            do dispositivo
          </p>
        </div>

        {images.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {images.map(
              (
                image,
                index
              ) => (
                <div
                  key={image.id}
                  className={`relative overflow-hidden rounded-2xl border bg-white ${
                    image.isPrimary
                      ? "border-[#b98218] ring-2 ring-[#b98218]/20"
                      : "border-[#e8dcc2]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      image.preview
                    }
                    alt={`Imagem ${index + 1}`}
                    className="aspect-square w-full object-cover"
                  />

                  {image.isPrimary && (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-[#b98218] px-2 py-1 text-[10px] font-bold text-white">
                      <Star
                        size={11}
                        fill="currentColor"
                      />

                      Principal
                    </span>
                  )}

                  <div className="space-y-2 p-3">
                    {!image.isPrimary && (
                      <button
                        type="button"
                        disabled={
                          submitting
                        }
                        onClick={() =>
                          makePrimary(
                            image.id
                          )
                        }
                        className="w-full rounded-lg bg-[#fff8e8] px-2 py-2 text-xs font-bold text-[#9f6f14]"
                      >
                        Tornar principal
                      </button>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={
                          index === 0 ||
                          submitting
                        }
                        onClick={() =>
                          moveImage(
                            index,
                            -1
                          )
                        }
                        className="flex h-8 flex-1 items-center justify-center rounded-lg border disabled:opacity-30"
                      >
                        <ArrowLeft
                          size={14}
                        />
                      </button>

                      <button
                        type="button"
                        disabled={
                          index ===
                            images.length -
                              1 ||
                          submitting
                        }
                        onClick={() =>
                          moveImage(
                            index,
                            1
                          )
                        }
                        className="flex h-8 flex-1 items-center justify-center rounded-lg border disabled:opacity-30"
                      >
                        <ArrowRight
                          size={14}
                        />
                      </button>

                      <button
                        type="button"
                        disabled={
                          submitting
                        }
                        onClick={() =>
                          removeImage(
                            image.id
                          )
                        }
                        className="flex h-8 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2
                          size={14}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* PREÇOS */}

      <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#20170f]">
          Preços
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Preço normal *"
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="29.90"
            required
            disabled={
              submitting
            }
          />

          <Field
            label="Preço promocional"
            name="salePrice"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="24.90"
            disabled={
              submitting
            }
          />

          <Field
            label="Custo"
            name="cost"
            type="number"
            step="0.01"
            min="0"
            placeholder="12.00"
            disabled={
              submitting
            }
          />
        </div>
      </section>

      {/* ESTOQUE SEM VARIAÇÕES */}

      {!isClothing && (
        <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-[#20170f]">
            Estoque
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Estoque *"
              name="stock"
              type="number"
              step="1"
              min="0"
              placeholder="10"
              required
              disabled={
                submitting
              }
            />

            <Field
              label="Estoque mínimo"
              name="minimumStock"
              type="number"
              step="1"
              min="0"
              placeholder="2"
              disabled={
                submitting
              }
            />
          </div>
        </section>
      )}

      {/* VARIAÇÕES DE VESTUÁRIO */}

      {isClothing && (
        <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-xl font-extrabold text-[#20170f]">
                Tamanhos e medidas
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Selecione os tamanhos disponíveis e informe estoque e medidas em centímetros.
              </p>
            </div>

            <div className="rounded-xl bg-[#fff8e8] px-4 py-3 text-sm">
              <span className="text-neutral-600">
                Estoque total:
              </span>{" "}

              <strong className="text-[#9f6f14]">
                {totalVariantStock}
              </strong>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {clothingSizes.map(
              (size) => {
                const selected =
                  variants.some(
                    (variant) =>
                      variant.size ===
                      size
                  );

                return (
                  <button
                    key={size}
                    type="button"
                    disabled={
                      submitting
                    }
                    onClick={() =>
                      toggleSize(
                        size
                      )
                    }
                    className={`flex h-12 min-w-12 items-center justify-center rounded-full border px-4 font-extrabold transition ${
                      selected
                        ? "border-[#20170f] bg-[#20170f] text-white"
                        : "border-[#e8dcc2] bg-white text-[#20170f] hover:border-[#b98218]"
                    }`}
                  >
                    {selected ? (
                      <>
                        <Check
                          size={15}
                          className="mr-1"
                        />

                        {size}
                      </>
                    ) : (
                      <>
                        <Plus
                          size={15}
                          className="mr-1"
                        />

                        {size}
                      </>
                    )}
                  </button>
                );
              }
            )}
          </div>

          {variants.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-[#dfd2b7] bg-[#faf9f6] px-5 py-8 text-center text-sm text-neutral-500">
              Selecione pelo menos um tamanho.
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {variants.map(
                (variant) => (
                  <div
                    key={
                      variant.size
                    }
                    className="rounded-2xl border border-[#e8dcc2] bg-[#faf9f6] p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wide text-[#b98218]">
                          Tamanho
                        </span>

                        <h3 className="text-2xl font-black text-[#20170f]">
                          {
                            variant.size
                          }
                        </h3>
                      </div>

                      <button
                        type="button"
                        disabled={
                          submitting
                        }
                        onClick={() =>
                          toggleSize(
                            variant.size
                          )
                        }
                        className="flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-bold text-red-600 hover:bg-red-50"
                      >
                        <Trash2
                          size={15}
                        />

                        Remover
                      </button>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <VariantField
                        label="Estoque *"
                        value={
                          variant.stock
                        }
                        step="1"
                        min="0"
                        placeholder="10"
                        disabled={
                          submitting
                        }
                        onChange={(
                          value
                        ) =>
                          updateVariant(
                            variant.size,
                            "stock",
                            value
                          )
                        }
                      />

                      <VariantField
                        label="Estoque mínimo"
                        value={
                          variant.minimumStock
                        }
                        step="1"
                        min="0"
                        placeholder="2"
                        disabled={
                          submitting
                        }
                        onChange={(
                          value
                        ) =>
                          updateVariant(
                            variant.size,
                            "minimumStock",
                            value
                          )
                        }
                      />
                    </div>

                    <div className="my-5 h-px bg-[#e8dcc2]" />

                    {isClothingTop && (
                      <div>
                        <p className="mb-3 text-sm font-extrabold text-[#20170f]">
                          Medidas da peça
                        </p>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <VariantField
                          label="Comprimento da peça (cm) *"
                          value={
                            variant.pieceLength
                          }
                          onChange={(
                            value
                          ) =>
                            updateVariant(
                              variant.size,
                              "pieceLength",
                              value
                            )
                          }
                          disabled={
                            submitting
                          }
                        />

                        <VariantField
                          label="Comprimento da manga (cm) *"
                          value={
                            variant.sleeveLength
                          }
                          onChange={(
                            value
                          ) =>
                            updateVariant(
                              variant.size,
                              "sleeveLength",
                              value
                            )
                          }
                          disabled={
                            submitting
                          }
                        />

                        <VariantField
                          label="Ombro a ombro (cm) *"
                          value={
                            variant.shoulderWidth
                          }
                          onChange={(
                            value
                          ) =>
                            updateVariant(
                              variant.size,
                              "shoulderWidth",
                              value
                            )
                          }
                          disabled={
                            submitting
                          }
                        />

                        <VariantField
                          label="Circunferência do tórax (cm) *"
                          value={
                            variant.chestCircumference
                          }
                          onChange={(
                            value
                          ) =>
                            updateVariant(
                              variant.size,
                              "chestCircumference",
                              value
                            )
                          }
                          disabled={
                            submitting
                          }
                        />
                        </div>

                        <div className="my-5 h-px bg-[#e8dcc2]" />

                        <p className="mb-1 text-sm font-extrabold text-[#20170f]">
                          Medidas corporais recomendadas
                        </p>

                        <p className="mb-4 text-xs leading-5 text-neutral-500">
                          Informe a faixa de medidas do corpo que veste este tamanho. Essas informações aparecerão no guia de tamanhos do cliente.
                        </p>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <VariantField
                            label="Tórax mínimo (cm) *"
                            value={
                              variant.bodyChestMinimum
                            }
                            onChange={(value) =>
                              updateVariant(
                                variant.size,
                                "bodyChestMinimum",
                                value
                              )
                            }
                            disabled={submitting}
                          />

                          <VariantField
                            label="Tórax máximo (cm) *"
                            value={
                              variant.bodyChestMaximum
                            }
                            onChange={(value) =>
                              updateVariant(
                                variant.size,
                                "bodyChestMaximum",
                                value
                              )
                            }
                            disabled={submitting}
                          />

                          <VariantField
                            label="Cintura mínima (cm) *"
                            value={
                              variant.bodyWaistMinimum
                            }
                            onChange={(value) =>
                              updateVariant(
                                variant.size,
                                "bodyWaistMinimum",
                                value
                              )
                            }
                            disabled={submitting}
                          />

                          <VariantField
                            label="Cintura máxima (cm) *"
                            value={
                              variant.bodyWaistMaximum
                            }
                            onChange={(value) =>
                              updateVariant(
                                variant.size,
                                "bodyWaistMaximum",
                                value
                              )
                            }
                            disabled={submitting}
                          />
                        </div>
                      </div>
                    )}

                    {isClothingBottom && (
                      <div>
                        <p className="mb-3 text-sm font-extrabold text-[#20170f]">
                          Medidas da peça
                        </p>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <VariantField
                          label="Comprimento total (cm) *"
                          value={
                            variant.pieceLength
                          }
                          onChange={(
                            value
                          ) =>
                            updateVariant(
                              variant.size,
                              "pieceLength",
                              value
                            )
                          }
                          disabled={
                            submitting
                          }
                        />

                        <VariantField
                          label="Cintura (cm) *"
                          value={
                            variant.waistCircumference
                          }
                          onChange={(
                            value
                          ) =>
                            updateVariant(
                              variant.size,
                              "waistCircumference",
                              value
                            )
                          }
                          disabled={
                            submitting
                          }
                        />

                        <VariantField
                          label="Quadril (cm) *"
                          value={
                            variant.hipCircumference
                          }
                          onChange={(
                            value
                          ) =>
                            updateVariant(
                              variant.size,
                              "hipCircumference",
                              value
                            )
                          }
                          disabled={
                            submitting
                          }
                        />

                        <VariantField
                          label="Coxa (cm) *"
                          value={
                            variant.thighCircumference
                          }
                          onChange={(
                            value
                          ) =>
                            updateVariant(
                              variant.size,
                              "thighCircumference",
                              value
                            )
                          }
                          disabled={
                            submitting
                          }
                        />

                        <VariantField
                          label="Entreperna (cm) *"
                          value={
                            variant.inseamLength
                          }
                          onChange={(
                            value
                          ) =>
                            updateVariant(
                              variant.size,
                              "inseamLength",
                              value
                            )
                          }
                          disabled={
                            submitting
                          }
                        />
                        </div>

                        <div className="my-5 h-px bg-[#e8dcc2]" />

                        <p className="mb-1 text-sm font-extrabold text-[#20170f]">
                          Medidas corporais recomendadas
                        </p>

                        <p className="mb-4 text-xs leading-5 text-neutral-500">
                          Informe a faixa de medidas do corpo que veste este tamanho. Essas informações aparecerão no guia de tamanhos do cliente.
                        </p>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <VariantField
                            label="Cintura mínima (cm) *"
                            value={
                              variant.bodyWaistMinimum
                            }
                            onChange={(value) =>
                              updateVariant(
                                variant.size,
                                "bodyWaistMinimum",
                                value
                              )
                            }
                            disabled={submitting}
                          />

                          <VariantField
                            label="Cintura máxima (cm) *"
                            value={
                              variant.bodyWaistMaximum
                            }
                            onChange={(value) =>
                              updateVariant(
                                variant.size,
                                "bodyWaistMaximum",
                                value
                              )
                            }
                            disabled={submitting}
                          />

                          <VariantField
                            label="Quadril mínimo (cm) *"
                            value={
                              variant.bodyHipMinimum
                            }
                            onChange={(value) =>
                              updateVariant(
                                variant.size,
                                "bodyHipMinimum",
                                value
                              )
                            }
                            disabled={submitting}
                          />

                          <VariantField
                            label="Quadril máximo (cm) *"
                            value={
                              variant.bodyHipMaximum
                            }
                            onChange={(value) =>
                              updateVariant(
                                variant.size,
                                "bodyHipMaximum",
                                value
                              )
                            }
                            disabled={submitting}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          <label className="mt-6 block">
            <span className="text-sm font-bold">
              Composição do material
            </span>

            <input
              name="materialComposition"
              maxLength={500}
              disabled={
                submitting
              }
              defaultValue="Algodão"
              placeholder="Ex: 96% algodão e 4% elastano"
              className="mt-2 h-12 w-full rounded-xl border border-[#e8dcc2] bg-white px-4 outline-none focus:border-[#b98218]"
            />

            <span className="mt-2 block text-xs text-neutral-500">
              Exemplo: 96% algodão e 4% elastano.
            </span>
          </label>
        </section>
      )}

      {/* PESO E DIMENSÕES */}

      <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#20170f]">
          {isReligiousImage
            ? "Medidas da imagem ou escultura"
            : "Peso e dimensões da embalagem"}
        </h2>

        <p className="mt-1 text-sm text-neutral-500">
          {isReligiousImage
            ? "Informe as medidas reais da peça. Estes campos são obrigatórios para imagens e esculturas."
            : "Campos opcionais utilizados posteriormente para o cálculo do frete."}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label={`Peso (kg)${
              isReligiousImage
                ? " *"
                : ""
            }`}
            name="weight"
            type="number"
            step="0.001"
            min={
              isReligiousImage
                ? "0.001"
                : "0"
            }
            placeholder="0.300"
            required={
              isReligiousImage
            }
            disabled={
              submitting
            }
          />

          <Field
            label={`Altura (cm)${
              isReligiousImage
                ? " *"
                : ""
            }`}
            name="height"
            type="number"
            step="0.01"
            min={
              isReligiousImage
                ? "0.01"
                : "0"
            }
            placeholder="10"
            required={
              isReligiousImage
            }
            disabled={
              submitting
            }
          />

          <Field
            label={`Largura (cm)${
              isReligiousImage
                ? " *"
                : ""
            }`}
            name="width"
            type="number"
            step="0.01"
            min={
              isReligiousImage
                ? "0.01"
                : "0"
            }
            placeholder="15"
            required={
              isReligiousImage
            }
            disabled={
              submitting
            }
          />

          <Field
            label={`Comprimento (cm)${
              isReligiousImage
                ? " *"
                : ""
            }`}
            name="length"
            type="number"
            step="0.01"
            min={
              isReligiousImage
                ? "0.01"
                : "0"
            }
            placeholder="20"
            required={
              isReligiousImage
            }
            disabled={
              submitting
            }
          />
        </div>
      </section>

      {/* SEO */}

      <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#20170f]">
          SEO
        </h2>

        <div className="mt-5 space-y-5">
          <Field
            label="Título SEO"
            name="seoTitle"
            maxLength={70}
            placeholder="Título para buscadores"
            disabled={
              submitting
            }
          />

          <label className="block">
            <span className="text-sm font-bold">
              Descrição SEO
            </span>

            <textarea
              name="seoDescription"
              rows={3}
              maxLength={180}
              disabled={
                submitting
              }
              placeholder="Descrição para mecanismos de busca"
              className="mt-2 w-full rounded-xl border border-[#e8dcc2] px-4 py-3 outline-none focus:border-[#b98218]"
            />
          </label>
        </div>
      </section>

      {/* PUBLICAÇÃO */}

      <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#20170f]">
          Publicação
        </h2>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:gap-8">
          <label className="flex items-center gap-3 text-sm font-bold">
            <input
              type="checkbox"
              name="featured"
              disabled={
                submitting
              }
            />

            Produto em destaque
          </label>

          <label className="flex items-center gap-3 text-sm font-bold">
            <input
              type="checkbox"
              name="active"
              defaultChecked
              disabled={
                submitting
              }
            />

            Produto ativo
          </label>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={
          submitting
        }
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#b98218] px-8 font-extrabold text-white shadow-lg transition hover:bg-[#9f6f14] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <>
            <LoaderCircle
              size={19}
              className="animate-spin"
            />

            Enviando imagens e salvando...
          </>
        ) : (
          "Salvar produto"
        )}
      </button>

      {submitting && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 p-5 backdrop-blur-[2px]"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-2xl">
            <LoaderCircle
              size={42}
              className="mx-auto animate-spin text-[#b98218]"
            />

            <strong className="mt-4 block text-lg text-[#20170f]">
              Cadastrando produto
            </strong>

            <p className="mt-2 text-sm text-neutral-500">
              Aguarde enquanto as imagens são enviadas e os dados são salvos.
            </p>

            <p className="mt-3 text-xs font-bold text-[#9f6f14]">
              Não feche esta página.
            </p>
          </div>
        </div>
      )}
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  step?: string;
  min?: string;
  maxLength?: number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

function Field({
  label,
  name,
  type = "text",
  step,
  min,
  maxLength,
  placeholder,
  required,
  disabled,
}: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold">
        {label}
      </span>

      <input
        name={name}
        type={type}
        step={step}
        min={min}
        maxLength={
          maxLength
        }
        placeholder={
          placeholder
        }
        required={
          required
        }
        disabled={
          disabled
        }
        className="mt-2 h-12 w-full rounded-xl border border-[#e8dcc2] px-4 outline-none focus:border-[#b98218] disabled:cursor-not-allowed disabled:bg-neutral-100"
      />
    </label>
  );
}

type VariantFieldProps = {
  label: string;
  value: string;
  step?: string;
  min?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (
    value: string
  ) => void;
};

function VariantField({
  label,
  value,
  step = "0.01",
  min = "0.01",
  placeholder = "0.00",
  disabled,
  onChange,
}: VariantFieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#20170f]">
        {label}
      </span>

      <input
        type="number"
        value={value}
        step={step}
        min={min}
        placeholder={
          placeholder
        }
        disabled={
          disabled
        }
        required
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className="mt-2 h-11 w-full rounded-xl border border-[#e8dcc2] bg-white px-3 text-sm outline-none focus:border-[#b98218] disabled:cursor-not-allowed disabled:bg-neutral-100"
      />
    </label>
  );
}