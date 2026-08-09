"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ImagePlus,
  Save,
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

const MAX_IMAGE_SIZE =
  8 * 1024 * 1024;

const religions = [
  "Católicos e Protestantes",
  "Islamismo",
  "Judaísmo",
  "Hinduísmo",
  "Budismo",
  "Espiritismo",
  "Matriz Africana",
  "Povos Originários",
  "Quilombolas",
  "Ciganos",
  "Ortodoxos",
  "Anglicanismo",
];

type InitialProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;

  shortDescription:
    | string
    | null;

  description: string;

  price: string;
  salePrice: string;
  cost: string;

  category: string;

  religions: string[];

  stock: string;

  minimumStock: string;

  weight: string;
  height: string;
  width: string;
  length: string;

  featured: boolean;
  active: boolean;

  seoTitle:
    | string
    | null;

  seoDescription:
    | string
    | null;

  legacyImage: string;

  images: Array<{
    id: string;
    url: string;
    publicId: string;
    isPrimary: boolean;
  }>;
};

type Props = {
  initialProduct:
    InitialProduct;
};

type EditableImage = {
  id: string;

  preview: string;

  publicId:
    | string
    | null;

  file:
    | File
    | null;

  isPrimary: boolean;
};

type SignatureResponse = {
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

type UpdateResponse = {
  success?: boolean;
  error?: string;
};

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
    .slice(
      0,
      180
    );
}

export default function EditProductForm({
  initialProduct,
}: Props) {
  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    name,
    setName,
  ] =
    useState(
      initialProduct.name
    );

  const [
    selectedReligions,
    setSelectedReligions,
  ] =
    useState<string[]>(
      initialProduct.religions
    );

  const [
    images,
    setImages,
  ] =
    useState<EditableImage[]>(
      initialProduct.images.map(
        (image) => ({
          id:
            image.id,

          preview:
            image.url,

          publicId:
            image.publicId,

          file:
            null,

          isPrimary:
            image.isPrimary,
        })
      )
    );

  const [
    dragging,
    setDragging,
  ] =
    useState(false);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const slug =
    createSlug(name);

  function toggleReligion(
    religion: string
  ) {
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

  function addFiles(
    files: File[]
  ) {
    setError(null);

    const remaining =
      MAX_IMAGES -
      images.length;

    if (
      remaining <= 0
    ) {
      setError(
        `Você pode utilizar no máximo ${MAX_IMAGES} imagens.`
      );

      return;
    }

    const valid: File[] =
      [];

    for (
      const file of
      files
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

      valid.push(
        file
      );
    }

    const selected =
      valid.slice(
        0,
        remaining
      );

    const drafts =
      selected.map(
        (
          file,
          index
        ): EditableImage => ({
          id:
            crypto.randomUUID(),

          preview:
            URL.createObjectURL(
              file
            ),

          publicId:
            null,

          file,

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

  function handleFiles(
    event: ChangeEvent<HTMLInputElement>
  ) {
    addFiles(
      Array.from(
        event.target.files ??
          []
      )
    );

    event.target.value =
      "";
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    setDragging(
      false
    );

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
    setImages(
      (current) => {
        const removed =
          current.find(
            (image) =>
              image.id === id
          );

        if (
          removed?.file
        ) {
          URL.revokeObjectURL(
            removed.preview
          );
        }

        const remaining =
          current.filter(
            (image) =>
              image.id !== id
          );

        if (
          remaining.length &&
          !remaining.some(
            (image) =>
              image.isPrimary
          )
        ) {
          remaining[0] = {
            ...remaining[0],
            isPrimary:
              true,
          };
        }

        return remaining;
      }
    );
  }

  function makePrimary(
    id: string
  ) {
    setImages(
      (current) =>
        current.map(
          (image) => ({
            ...image,

            isPrimary:
              image.id ===
              id,
          })
        )
    );
  }

  function moveImage(
    index: number,
    direction:
      | -1
      | 1
  ) {
    setImages(
      (current) => {
        const target =
          index +
          direction;

        if (
          target < 0 ||
          target >=
            current.length
        ) {
          return current;
        }

        const next =
          [...current];

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

  async function uploadImage(
    file: File
  ) {
    /*
     * Assinatura temporária.
     */

    const signatureResponse =
      await fetch(
        "/api/admin/products/upload-signature",
        {
          method:
            "POST",

          credentials:
            "same-origin",

          cache:
            "no-store",
        }
      );

    const signatureData =
      (await signatureResponse.json()) as SignatureResponse;

    if (
      !signatureResponse.ok ||
      !signatureData.upload
    ) {
      throw new Error(
        signatureData.error ||
          "Não foi possível preparar a imagem."
      );
    }

    const upload =
      signatureData.upload;

    const formData =
      new FormData();

    formData.append(
      "file",
      file
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
          method:
            "POST",

          body:
            formData,
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
        "Formato de imagem inválido."
      );
    }

    return {
      publicId:
        data.public_id,

      url:
        data.secure_url,
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
      name.trim().length <
      2
    ) {
      setError(
        "Informe o nome do produto."
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
      images.length ===
      0
    ) {
      setError(
        "O produto precisa possuir pelo menos uma imagem."
      );

      return;
    }

    const formData =
      new FormData(
        event.currentTarget
      );

    setSubmitting(
      true
    );

    try {
      /*
       * Mantém imagens antigas e envia
       * somente os arquivos novos.
       */

      const preparedImages =
        [];

      for (
        const image of
        images
      ) {
        if (
          image.publicId &&
          !image.file
        ) {
          preparedImages.push({
            publicId:
              image.publicId,

            isPrimary:
              image.isPrimary,
          });

          continue;
        }

        if (!image.file) {
          throw new Error(
            "Imagem inválida."
          );
        }

        const uploaded =
          await uploadImage(
            image.file
          );

        preparedImages.push({
          publicId:
            uploaded.publicId,

          isPrimary:
            image.isPrimary,
        });
      }

      const payload = {
        name:
          name.trim(),

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

        category:
          String(
            formData.get(
              "category"
            ) ?? ""
          ).trim(),

        religions:
          selectedReligions,

        minimumStock:
          String(
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
          preparedImages,
      };

      const response =
        await fetch(
          `/api/admin/products/${encodeURIComponent(
            initialProduct.id
          )}`,
          {
            method:
              "PATCH",

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
        (await response.json()) as UpdateResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Não foi possível atualizar o produto."
        );
      }

      images.forEach(
        (image) => {
          if (
            image.file
          ) {
            URL.revokeObjectURL(
              image.preview
            );
          }
        }
      );

      window.location.replace(
        "/admin/produtos?updated=1"
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o produto."
      );

      setSubmitting(
        false
      );
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-7"
    >
      {/* PRINCIPAL */}

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
              value={
                name
              }
              onChange={(
                event
              ) =>
                setName(
                  event.target
                    .value
                )
              }
              required
              maxLength={
                200
              }
              className="mt-2 h-12 w-full rounded-xl border border-[#e8dcc2] px-4 outline-none focus:border-[#b98218]"
            />
          </label>

          <ReadOnlyField
            label="Slug automático"
            value={
              slug
            }
          />

          <ReadOnlyField
            label="SKU / Código interno"
            value={
              initialProduct.sku ??
              "-"
            }
          />

          <Field
            label="Categoria *"
            name="category"
            required
            defaultValue={
              initialProduct.category
            }
          />
        </div>

        {/* RELIGIÕES */}

        <div className="mt-5">
          <span className="text-sm font-bold">
            Religião *
          </span>

          <details className="group relative mt-2">
            <summary className="flex h-12 cursor-pointer list-none items-center justify-between rounded-xl border border-[#e8dcc2] px-4">
              <span className="text-sm">
                {selectedReligions.length} selecionada(s)
              </span>

              <ChevronDown
                size={18}
                className="text-[#b98218] transition group-open:rotate-180"
              />
            </summary>

            <div className="absolute left-0 top-[54px] z-30 w-full max-w-[420px] rounded-xl border border-[#e8dcc2] bg-white p-3 shadow-xl">
              {religions.map(
                (religion) => {
                  const selected =
                    selectedReligions.includes(
                      religion
                    );

                  return (
                    <button
                      key={
                        religion
                      }
                      type="button"
                      onClick={() =>
                        toggleReligion(
                          religion
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#faf9f6]"
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          selected
                            ? "border-[#b98218] bg-[#b98218] text-white"
                            : "border-neutral-300"
                        }`}
                      >
                        {selected && (
                          <Check
                            size={
                              11
                            }
                          />
                        )}
                      </span>

                      {
                        religion
                      }
                    </button>
                  );
                }
              )}
            </div>
          </details>
        </div>

        <div className="mt-5">
          <Field
            label="Descrição curta"
            name="shortDescription"
            defaultValue={
              initialProduct.shortDescription ??
              ""
            }
          />
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-bold">
            Descrição completa *
          </span>

          <textarea
            name="description"
            defaultValue={
              initialProduct.description
            }
            required
            rows={6}
            maxLength={
              10000
            }
            className="mt-2 w-full rounded-xl border border-[#e8dcc2] px-4 py-3 outline-none focus:border-[#b98218]"
          />
        </label>
      </section>

      {/* GALERIA */}

      <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <ImagePlus className="text-[#b98218]" />

          <div>
            <h2 className="text-xl font-extrabold">
              Galeria
            </h2>

            <p className="text-sm text-neutral-500">
              Adicione, remova,
              ordene e escolha a
              imagem principal.
            </p>
          </div>
        </div>

        <input
          ref={
            fileInputRef
          }
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={
            handleFiles
          }
          className="hidden"
        />

        <div
          onDragOver={(
            event
          ) => {
            event.preventDefault();

            setDragging(
              true
            );
          }}
          onDragLeave={() =>
            setDragging(
              false
            )
          }
          onDrop={
            handleDrop
          }
          onClick={() =>
            fileInputRef.current?.click()
          }
          className={`mt-6 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center ${
            dragging
              ? "border-[#b98218] bg-[#fff8e8]"
              : "border-[#e8dcc2] bg-[#faf9f6]"
          }`}
        >
          <Upload
            className="mx-auto text-[#b98218]"
          />

          <strong className="mt-3 block">
            Arraste novas imagens
            aqui
          </strong>

          <p className="mt-1 text-sm text-neutral-500">
            ou clique para selecionar
          </p>
        </div>

        {images.length >
          0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {images.map(
              (
                image,
                index
              ) => (
                <div
                  key={
                    image.id
                  }
                  className={`overflow-hidden rounded-xl border ${
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
                    alt=""
                    className="aspect-square w-full object-cover"
                  />

                  <div className="space-y-2 p-3">
                    {image.isPrimary ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-[#b98218]">
                        <Star
                          size={
                            13
                          }
                        />

                        Principal
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          makePrimary(
                            image.id
                          )
                        }
                        className="text-xs font-bold text-[#b98218]"
                      >
                        Tornar principal
                      </button>
                    )}

                    <div className="flex gap-2">
                      <IconButton
                        disabled={
                          index ===
                          0
                        }
                        onClick={() =>
                          moveImage(
                            index,
                            -1
                          )
                        }
                      >
                        <ArrowLeft
                          size={
                            14
                          }
                        />
                      </IconButton>

                      <IconButton
                        disabled={
                          index ===
                          images.length -
                            1
                        }
                        onClick={() =>
                          moveImage(
                            index,
                            1
                          )
                        }
                      >
                        <ArrowRight
                          size={
                            14
                          }
                        />
                      </IconButton>

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(
                            image.id
                          )
                        }
                        className="flex h-8 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2
                          size={
                            14
                          }
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

      <Section title="Preços e estoque">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Preço normal *"
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={
              initialProduct.price
            }
          />

          <Field
            label="Preço promocional"
            name="salePrice"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={
              initialProduct.salePrice
            }
          />

          <Field
            label="Custo"
            name="cost"
            type="number"
            step="0.01"
            min="0"
            defaultValue={
              initialProduct.cost
            }
          />

          <div>
            <ReadOnlyField
              label="Estoque atual"
              value={
                initialProduct.stock
              }
            />

            <p className="mt-2 text-xs leading-5 text-neutral-500">
              Para alterar a quantidade,
              utilize o botão Estoque na
              listagem de produtos. Assim,
              a movimentação fica registrada
              no histórico.
            </p>
          </div>

          <Field
            label="Estoque mínimo"
            name="minimumStock"
            type="number"
            min="0"
            step="1"
            defaultValue={
              initialProduct.minimumStock
            }
          />
        </div>
      </Section>

      {/* FRETE */}

      <Section title="Peso e dimensões">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Peso (kg)"
            name="weight"
            type="number"
            min="0"
            step="0.001"
            defaultValue={
              initialProduct.weight
            }
          />

          <Field
            label="Altura (cm)"
            name="height"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              initialProduct.height
            }
          />

          <Field
            label="Largura (cm)"
            name="width"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              initialProduct.width
            }
          />

          <Field
            label="Comprimento (cm)"
            name="length"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              initialProduct.length
            }
          />
        </div>
      </Section>

      {/* SEO */}

      <Section title="SEO">
        <div className="space-y-5">
          <Field
            label="Título SEO"
            name="seoTitle"
            defaultValue={
              initialProduct.seoTitle ??
              ""
            }
          />

          <label className="block">
            <span className="text-sm font-bold">
              Descrição SEO
            </span>

            <textarea
              name="seoDescription"
              rows={3}
              maxLength={
                180
              }
              defaultValue={
                initialProduct.seoDescription ??
                ""
              }
              className="mt-2 w-full rounded-xl border border-[#e8dcc2] px-4 py-3 outline-none focus:border-[#b98218]"
            />
          </label>
        </div>
      </Section>

      {/* PUBLICAÇÃO */}

      <Section title="Publicação">
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={
                initialProduct.featured
              }
            />

            Produto em destaque
          </label>

          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              name="active"
              defaultChecked={
                initialProduct.active
              }
            />

            Produto ativo
          </label>
        </div>
      </Section>

      {/*
       * Produto antigo ainda sem ProductImage/publicId.
       */}

      {initialProduct.images.length ===
        0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Este produto utiliza uma
          imagem do formato antigo.
          Adicione pelo menos uma nova
          imagem antes de salvar a
          edição.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={
            submitting
          }
          className="flex h-12 items-center gap-2 rounded-xl bg-[#b98218] px-7 font-extrabold text-white shadow-lg transition hover:bg-[#9f6f14] disabled:opacity-60"
        >
          <Save
            size={
              18
            }
          />

          {submitting
            ? "Salvando..."
            : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  step?: string;
  min?: string;
  required?: boolean;
  defaultValue?:
    | string
    | number;
};

function Field({
  label,
  name,
  type = "text",
  step,
  min,
  required,
  defaultValue,
}: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold">
        {label}
      </span>

      <input
        name={
          name
        }
        type={
          type
        }
        step={
          step
        }
        min={
          min
        }
        required={
          required
        }
        defaultValue={
          defaultValue
        }
        className="mt-2 h-12 w-full rounded-xl border border-[#e8dcc2] px-4 outline-none focus:border-[#b98218]"
      />
    </label>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <label>
      <span className="text-sm font-bold">
        {label}
      </span>

      <input
        value={
          value
        }
        readOnly
        tabIndex={
          -1
        }
        className="mt-2 h-12 w-full cursor-not-allowed rounded-xl border border-[#e8dcc2] bg-[#f7f4ee] px-4 text-neutral-500 outline-none"
      />
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-extrabold text-[#20170f]">
        {title}
      </h2>

      {
        children
      }
    </section>
  );
}

function IconButton({
  children,
  disabled,
  onClick,
}: {
  children:
    React.ReactNode;

  disabled?: boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      className="flex h-8 flex-1 items-center justify-center rounded-lg border border-[#e8dcc2] disabled:opacity-30"
    >
      {
        children
      }
    </button>
  );
}