"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ImagePlus,
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
  {
    value:
      "Católicos e Protestantes",
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

type ImageDraft = {
  id: string;
  file: File;
  preview: string;
  isPrimary: boolean;
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

  const [
    name,
    setName,
  ] =
    useState("");

  const [
    selectedReligions,
    setSelectedReligions,
  ] =
    useState<string[]>([]);

  const [
    images,
    setImages,
  ] =
    useState<ImageDraft[]>([]);

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
        ].includes(file.type)
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

      accepted.push(
        file
      );
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

    /*
     * Permite selecionar novamente
     * o mesmo arquivo posteriormente.
     */
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

        /*
         * Se a principal foi removida,
         * a primeira passa a ser principal.
         */
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
    if (submitting) {
      return;
    }

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

  async function uploadImage(
    image: ImageDraft,
    position: number
  ) {
    /*
     * Primeiro pedimos ao nosso servidor
     * uma assinatura temporária.
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

    /*
     * A imagem vai diretamente do navegador
     * para o Cloudinary.
     *
     * CLOUDINARY_API_SECRET não participa
     * desta requisição.
     */

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
      name.trim().length <
      2
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
        "Adicione pelo menos uma imagem do produto."
      );

      return;
    }

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    setSubmitting(true);

    try {
      /*
       * Upload sequencial facilita identificar
       * corretamente posição e imagem principal.
       */

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

      /*
       * O servidor NÃO confiará no slug,
       * preço, permissões ou outros dados
       * somente porque vieram daqui.
       *
       * Tudo será validado novamente na API.
       */

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

        stock:
          String(
            formData.get(
              "stock"
            ) ?? ""
          ),

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
          uploadedImages,
      };

      const response =
        await fetch(
          "/api/admin/products",
          {
            method:
              "POST",

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

      /*
       * Libera previews locais.
       */
      images.forEach(
        (image) =>
          URL.revokeObjectURL(
            image.preview
          )
      );

      window.location.replace(
        "/admin/produtos?created=1"
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o produto."
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
      {/* INFORMAÇÕES PRINCIPAIS */}

      <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#20170f]">
          Informações do produto
        </h2>

        <p className="mt-1 text-sm text-neutral-500">
          Dados principais para
          identificação e exibição
          na loja.
        </p>

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
              disabled={
                submitting
              }
              placeholder="Ex: Terço Cristal Rosa"
              className="mt-2 h-12 w-full rounded-xl border border-[#e8dcc2] px-4 outline-none focus:border-[#b98218]"
            />
          </label>

          <label>
            <span className="text-sm font-bold">
              Slug automático
            </span>

            <input
              value={
                slug
              }
              readOnly
              tabIndex={
                -1
              }
              placeholder="gerado-automaticamente"
              className="mt-2 h-12 w-full cursor-not-allowed rounded-xl border border-[#e8dcc2] bg-[#f7f4ee] px-4 text-neutral-500 outline-none"
            />
          </label>

          <label>
            <span className="text-sm font-bold">
              SKU / Código interno
            </span>

            <input
              value="Gerado automaticamente ao salvar"
              readOnly
              tabIndex={
                -1
              }
              aria-label="SKU gerado automaticamente"
              className="mt-2 h-12 w-full cursor-not-allowed rounded-xl border border-[#e8dcc2] bg-[#f7f4ee] px-4 text-neutral-500 outline-none"
            />
          </label>

          <label>
            <span className="text-sm font-bold">
              Categoria *
            </span>

            <input
              name="category"
              required
              maxLength={
                120
              }
              disabled={
                submitting
              }
              placeholder="Artigos Religiosos"
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

            <div className="absolute left-0 top-[54px] z-30 w-full max-w-[420px] rounded-xl border border-[#e8dcc2] bg-white p-3 shadow-xl">
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
                              size={
                                11
                              }
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
                    key={
                      religion
                    }
                    className="rounded-full bg-[#fff8e8] px-3 py-1 text-xs font-bold text-[#9f6f14]"
                  >
                    {
                      religion
                    }
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
            maxLength={
              300
            }
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
            maxLength={
              10000
            }
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
          ref={
            inputRef
          }
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

            if (
              !submitting
            ) {
              setDragging(
                true
              );
            }
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
            <Upload
              size={25}
            />
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
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-[#b98218] px-2 py-1 text-[10px] font-bold text-white shadow">
                      <Star
                        size={
                          11
                        }
                        fill="currentColor"
                      />
                      Principal
                    </span>
                  )}

                  <div className="space-y-2 p-3">
                    {!image.isPrimary && (
                      <button
                        type="button"
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
                          index ===
                            0 ||
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
                          size={
                            14
                          }
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
                          size={
                            14
                          }
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

      {/* PREÇOS E ESTOQUE */}

      <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#20170f]">
          Preços e estoque
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
          />

          <Field
            label="Preço promocional"
            name="salePrice"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="24.90"
          />

          <Field
            label="Custo"
            name="cost"
            type="number"
            step="0.01"
            min="0"
            placeholder="12.00"
          />

          <Field
            label="Estoque *"
            name="stock"
            type="number"
            step="1"
            min="0"
            placeholder="10"
            required
          />

          <Field
            label="Estoque mínimo"
            name="minimumStock"
            type="number"
            step="1"
            min="0"
            placeholder="2"
          />
        </div>
      </section>

      {/* FRETE */}

      <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#20170f]">
          Peso e dimensões
        </h2>

        <p className="mt-1 text-sm text-neutral-500">
          Utilizados posteriormente
          para cálculo de frete.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Peso (kg)"
            name="weight"
            type="number"
            step="0.001"
            min="0"
            placeholder="0.300"
          />

          <Field
            label="Altura (cm)"
            name="height"
            type="number"
            step="0.01"
            min="0"
            placeholder="10"
          />

          <Field
            label="Largura (cm)"
            name="width"
            type="number"
            step="0.01"
            min="0"
            placeholder="15"
          />

          <Field
            label="Comprimento (cm)"
            name="length"
            type="number"
            step="0.01"
            min="0"
            placeholder="20"
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
            maxLength={
              70
            }
            placeholder="Título para buscadores"
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
              placeholder="Descrição para mecanismos de busca"
              className="mt-2 w-full rounded-xl border border-[#e8dcc2] px-4 py-3 outline-none focus:border-[#b98218]"
            />
          </label>
        </div>
      </section>

      {/* CONFIGURAÇÕES */}

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
        className="h-12 rounded-xl bg-[#b98218] px-8 font-extrabold text-white shadow-lg transition hover:bg-[#9f6f14] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? "Salvando produto..."
          : "Salvar produto"}
      </button>
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
        maxLength={
          maxLength
        }
        placeholder={
          placeholder
        }
        required={
          required
        }
        className="mt-2 h-12 w-full rounded-xl border border-[#e8dcc2] px-4 outline-none focus:border-[#b98218]"
      />
    </label>
  );
}