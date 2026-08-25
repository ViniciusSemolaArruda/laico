/* eslint-disable react-hooks/set-state-in-effect */
"use client";

/* eslint-disable @next/next/no-img-element */

import {
  CheckCircle2,
  Edit3,
  ImagePlus,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  Save,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  ChangeEvent,
  DragEvent,
  FormEvent,
} from "react";

type Banner = {
  id: string;

  title: string;
  alt: string;

  desktopImageUrl: string;
  desktopImagePublicId:
    | string
    | null;

  mobileImageUrl: string;
  mobileImagePublicId:
    | string
    | null;

  href: string | null;

  active: boolean;
  sortOrder: number;

  createdAt: string;
  updatedAt: string;
};

type BannerImageVariant =
  | "desktop"
  | "mobile";

type BannerForm = {
  title: string;
  alt: string;
  href: string;
  sortOrder: string;
  active: boolean;
};

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  publicId: string;
  signature: string;
  variant:
    BannerImageVariant;
};

type CloudinaryUploadResponse = {
  public_id?: string;
  secure_url?: string;

  error?: {
    message?: string;
  };
};

const EMPTY_FORM: BannerForm = {
  title: "",
  alt: "",
  href: "",
  sortOrder: "",
  active: true,
};

const MAX_IMAGE_SIZE =
  8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

function getErrorMessage(
  error: unknown
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "Ocorreu um erro inesperado.";
}

async function readResponseError(
  response: Response
) {
  try {
    const data =
      (await response.json()) as {
        error?: string;
      };

    return (
      data.error ||
      "Não foi possível concluir a operação."
    );
  } catch {
    return "Não foi possível concluir a operação.";
  }
}

function validateImageDimensions(
  file: File,
  variant: BannerImageVariant
) {
  return new Promise<void>(
    (resolve, reject) => {
      if (
        !ALLOWED_IMAGE_TYPES.has(
          file.type
        )
      ) {
        reject(
          new Error(
            "Use uma imagem JPG, PNG ou WebP."
          )
        );

        return;
      }

      if (
        file.size >
        MAX_IMAGE_SIZE
      ) {
        reject(
          new Error(
            "A imagem não pode ultrapassar 8 MB."
          )
        );

        return;
      }

      const objectUrl =
        URL.createObjectURL(
          file
        );

      const image =
        new Image();

      image.onload = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        const expectedWidth =
          variant ===
          "desktop"
            ? 1738
            : 1254;

        const expectedHeight =
          variant ===
          "desktop"
            ? 905
            : 1254;

        if (
          image.naturalWidth !==
            expectedWidth ||
          image.naturalHeight !==
            expectedHeight
        ) {
          reject(
            new Error(
              variant ===
                "desktop"
                ? "A imagem desktop precisa ter exatamente 1738 × 905 px."
                : "A imagem mobile precisa ter exatamente 1254 × 1254 px."
            )
          );

          return;
        }

        resolve();
      };

      image.onerror = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        reject(
          new Error(
            "Não foi possível ler a imagem."
          )
        );
      };

      image.src =
        objectUrl;
    }
  );
}

export default function AdminBannerManager() {
  const desktopInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const mobileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    banners,
    setBanners,
  ] = useState<Banner[]>(
    []
  );

  const [
    form,
    setForm,
  ] = useState<BannerForm>(
    EMPTY_FORM
  );

  const [
    editingBanner,
    setEditingBanner,
  ] =
    useState<Banner | null>(
      null
    );

  const [
    desktopFile,
    setDesktopFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    mobileFile,
    setMobileFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    desktopPreview,
    setDesktopPreview,
  ] = useState("");

  const [
    mobilePreview,
    setMobilePreview,
  ] = useState("");

  const [
    draggingVariant,
    setDraggingVariant,
  ] =
    useState<BannerImageVariant | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<string | null>(
      null
    );

  const [
    changingStatusId,
    setChangingStatusId,
  ] =
    useState<string | null>(
      null
    );

  const [
    uploadMessage,
    setUploadMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  /*
   * =====================================================
   * PRÉ-VISUALIZAÇÕES
   * =====================================================
   */

  useEffect(() => {
    if (!desktopFile) {
      setDesktopPreview(
        editingBanner?.desktopImageUrl ??
          ""
      );

      return;
    }

    const objectUrl =
      URL.createObjectURL(
        desktopFile
      );

    setDesktopPreview(
      objectUrl
    );

    return () => {
      URL.revokeObjectURL(
        objectUrl
      );
    };
  }, [
    desktopFile,
    editingBanner,
  ]);

  useEffect(() => {
    if (!mobileFile) {
      setMobilePreview(
        editingBanner?.mobileImageUrl ??
          ""
      );

      return;
    }

    const objectUrl =
      URL.createObjectURL(
        mobileFile
      );

    setMobilePreview(
      objectUrl
    );

    return () => {
      URL.revokeObjectURL(
        objectUrl
      );
    };
  }, [
    mobileFile,
    editingBanner,
  ]);

  /*
   * =====================================================
   * CARREGAR BANNERS
   * =====================================================
   */

  const loadBanners =
    useCallback(
      async (
        showLoading = true
      ) => {
        if (showLoading) {
          setLoading(
            true
          );
        }

        setError("");

        try {
          const response =
            await fetch(
              "/api/admin/banners",
              {
                method:
                  "GET",

                cache:
                  "no-store",

                credentials:
                  "same-origin",
              }
            );

          if (!response.ok) {
            throw new Error(
              await readResponseError(
                response
              )
            );
          }

          const data =
            (await response.json()) as {
              banners?: Banner[];
            };

          setBanners(
            data.banners ??
              []
          );
        } catch (
          loadError
        ) {
          setError(
            getErrorMessage(
              loadError
            )
          );
        } finally {
          if (
            showLoading
          ) {
            setLoading(
              false
            );
          }
        }
      },
      []
    );

  useEffect(() => {
    void loadBanners();
  }, [loadBanners]);

  /*
   * =====================================================
   * FORMULÁRIO
   * =====================================================
   */

  function updateField<
    Key extends keyof BannerForm,
  >(
    field: Key,
    value: BannerForm[Key]
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function resetForm() {
    setForm(
      EMPTY_FORM
    );

    setEditingBanner(
      null
    );

    setDesktopFile(
      null
    );

    setMobileFile(
      null
    );

    setDesktopPreview(
      ""
    );

    setMobilePreview(
      ""
    );

    setUploadMessage(
      ""
    );

    setDraggingVariant(
      null
    );

    if (
      desktopInputRef.current
    ) {
      desktopInputRef.current.value =
        "";
    }

    if (
      mobileInputRef.current
    ) {
      mobileInputRef.current.value =
        "";
    }
  }

  function startEditing(
    banner: Banner
  ) {
    clearMessages();

    setEditingBanner(
      banner
    );

    setForm({
      title:
        banner.title,

      alt:
        banner.alt,

      href:
        banner.href ??
        "",

      sortOrder:
        String(
          banner.sortOrder
        ),

      active:
        banner.active,
    });

    setDesktopFile(
      null
    );

    setMobileFile(
      null
    );

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  async function processSelectedImage(
    file: File,
    variant: BannerImageVariant
  ) {
    clearMessages();

    try {
      await validateImageDimensions(
        file,
        variant
      );

      if (
        variant ===
        "desktop"
      ) {
        setDesktopFile(
          file
        );
      } else {
        setMobileFile(
          file
        );
      }
    } catch (
      imageError
    ) {
      const input =
        variant ===
        "desktop"
          ? desktopInputRef.current
          : mobileInputRef.current;

      if (input) {
        input.value =
          "";
      }

      setError(
        getErrorMessage(
          imageError
        )
      );
    }
  }

  async function handleImageChange(
    event: ChangeEvent<HTMLInputElement>,
    variant: BannerImageVariant
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    await processSelectedImage(
      file,
      variant
    );
  }

  function handleDragOver(
    event: DragEvent<HTMLButtonElement>,
    variant: BannerImageVariant
  ) {
    event.preventDefault();
    event.stopPropagation();

    event.dataTransfer.dropEffect =
      "copy";

    setDraggingVariant(
      variant
    );
  }

  function handleDragLeave(
    event: DragEvent<HTMLButtonElement>,
    variant: BannerImageVariant
  ) {
    event.preventDefault();
    event.stopPropagation();

    const nextTarget =
      event.relatedTarget;

    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(
        nextTarget
      )
    ) {
      return;
    }

    setDraggingVariant(
      (current) =>
        current === variant
          ? null
          : current
    );
  }

  async function handleImageDrop(
    event: DragEvent<HTMLButtonElement>,
    variant: BannerImageVariant
  ) {
    event.preventDefault();
    event.stopPropagation();

    setDraggingVariant(
      null
    );

    const file =
      event.dataTransfer.files?.[0];

    if (!file) {
      setError(
        "Solte um arquivo de imagem válido."
      );

      return;
    }

    await processSelectedImage(
      file,
      variant
    );
  }

  /*
   * =====================================================
   * CLOUDINARY
   * =====================================================
   */

  async function requestUploadSignature(
    variant: BannerImageVariant
  ) {
    const response =
      await fetch(
        "/api/admin/banners/upload-signature",
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
            JSON.stringify({
              variant,
            }),
        }
      );

    if (!response.ok) {
      throw new Error(
        await readResponseError(
          response
        )
      );
    }

    const data =
      (await response.json()) as {
        upload?: UploadSignature;
      };

    if (
      !data.upload
    ) {
      throw new Error(
        "Não foi possível preparar o upload."
      );
    }

    return data.upload;
  }

  async function uploadImage(
    file: File,
    variant: BannerImageVariant
  ) {
    const upload =
      await requestUploadSignature(
        variant
      );

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
      (await response.json()) as CloudinaryUploadResponse;

    if (
      !response.ok ||
      !data.public_id ||
      !data.secure_url
    ) {
      throw new Error(
        data.error?.message ||
          "Não foi possível enviar a imagem."
      );
    }

    return {
      publicId:
        data.public_id,

      url:
        data.secure_url,
    };
  }

  /*
   * =====================================================
   * SALVAR
   * =====================================================
   */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    clearMessages();

    const title =
      form.title.trim();

    const alt =
      form.alt.trim();

    const href =
      form.href.trim();

    if (
      title.length < 2
    ) {
      setError(
        "Informe um nome para identificar o banner."
      );

      return;
    }

    if (
      alt.length < 2
    ) {
      setError(
        "Informe a descrição da imagem."
      );

      return;
    }

    if (
      href &&
      (!href.startsWith(
        "/"
      ) ||
        href.startsWith(
          "//"
        ))
    ) {
      setError(
        "O link deve ser uma página interna iniciada por /."
      );

      return;
    }

    if (
      !editingBanner &&
      !desktopFile
    ) {
      setError(
        "Selecione a imagem desktop de 1738 × 905 px."
      );

      return;
    }

    if (
      !editingBanner &&
      !mobileFile
    ) {
      setError(
        "Selecione a imagem mobile de 1254 × 1254 px."
      );

      return;
    }

    setSaving(true);

    let desktopImagePublicId =
      "";

    let mobileImagePublicId =
      "";

    try {
      if (desktopFile) {
        setUploadMessage(
          "Enviando imagem desktop..."
        );

        const upload =
          await uploadImage(
            desktopFile,
            "desktop"
          );

        desktopImagePublicId =
          upload.publicId;
      }

      if (mobileFile) {
        setUploadMessage(
          "Enviando imagem mobile..."
        );

        const upload =
          await uploadImage(
            mobileFile,
            "mobile"
          );

        mobileImagePublicId =
          upload.publicId;
      }

      setUploadMessage(
        editingBanner
          ? "Atualizando banner..."
          : "Cadastrando banner..."
      );

      const endpoint =
        editingBanner
          ? `/api/admin/banners/${encodeURIComponent(
              editingBanner.id
            )}`
          : "/api/admin/banners";

      const response =
        await fetch(
          endpoint,
          {
            method:
              editingBanner
                ? "PATCH"
                : "POST",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                title,
                alt,

                href:
                  href ||
                  null,

                active:
                  form.active,

                sortOrder:
                  form.sortOrder,

                desktopImagePublicId,
                mobileImagePublicId,
              }),
          }
        );

      if (!response.ok) {
        throw new Error(
          await readResponseError(
            response
          )
        );
      }

      setSuccess(
        editingBanner
          ? "Banner atualizado com sucesso."
          : "Banner cadastrado com sucesso."
      );

      resetForm();

      await loadBanners(
        false
      );
    } catch (
      saveError
    ) {
      setError(
        getErrorMessage(
          saveError
        )
      );
    } finally {
      setSaving(
        false
      );

      setUploadMessage(
        ""
      );
    }
  }

  /*
   * =====================================================
   * ATIVAR / DESATIVAR
   * =====================================================
   */

  async function toggleBannerStatus(
    banner: Banner
  ) {
    if (
      changingStatusId
    ) {
      return;
    }

    clearMessages();

    setChangingStatusId(
      banner.id
    );

    try {
      const response =
        await fetch(
          `/api/admin/banners/${encodeURIComponent(
            banner.id
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
              JSON.stringify({
                title:
                  banner.title,

                alt:
                  banner.alt,

                href:
                  banner.href,

                active:
                  !banner.active,

                sortOrder:
                  banner.sortOrder,

                desktopImagePublicId:
                  "",

                mobileImagePublicId:
                  "",
              }),
          }
        );

      if (!response.ok) {
        throw new Error(
          await readResponseError(
            response
          )
        );
      }

      setSuccess(
        banner.active
          ? "Banner desativado."
          : "Banner ativado."
      );

      await loadBanners(
        false
      );
    } catch (
      statusError
    ) {
      setError(
        getErrorMessage(
          statusError
        )
      );
    } finally {
      setChangingStatusId(
        null
      );
    }
  }

  /*
   * =====================================================
   * EXCLUIR
   * =====================================================
   */

  async function deleteBanner(
    banner: Banner
  ) {
    if (
      deletingId
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Deseja realmente excluir o banner "${banner.title}"? Essa ação não poderá ser desfeita.`
      );

    if (!confirmed) {
      return;
    }

    clearMessages();

    setDeletingId(
      banner.id
    );

    try {
      const response =
        await fetch(
          `/api/admin/banners/${encodeURIComponent(
            banner.id
          )}`,
          {
            method:
              "DELETE",

            credentials:
              "same-origin",
          }
        );

      if (!response.ok) {
        throw new Error(
          await readResponseError(
            response
          )
        );
      }

      if (
        editingBanner?.id ===
        banner.id
      ) {
        resetForm();
      }

      setSuccess(
        "Banner excluído com sucesso."
      );

      await loadBanners(
        false
      );
    } catch (
      deleteError
    ) {
      setError(
        getErrorMessage(
          deleteError
        )
      );
    } finally {
      setDeletingId(
        null
      );
    }
  }

  return (
    <div className="space-y-8">
      {/* FORMULÁRIO */}

      <section className="overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-sm">
        <div className="border-b border-[#eee4d1] bg-[#faf8f3] px-5 py-5 sm:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b98218]">
                Gerenciamento
              </p>

              <h2 className="mt-1 text-2xl font-extrabold text-[#20170f] sm:text-[30px]">
                {editingBanner
                  ? "Editar banner"
                  : "Novo banner"}
              </h2>

              <p className="mt-2 text-sm text-neutral-600">
                Cadastre as versões desktop e mobile do destaque.
              </p>
            </div>

            {editingBanner && (
              <button
                type="button"
                onClick={
                  resetForm
                }
                disabled={
                  saving
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d8c9aa] bg-white px-4 text-sm font-bold text-[#5f4931] transition hover:bg-[#f7f1e7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={18} />

                Novo banner
              </button>
            )}
          </div>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-7 p-5 sm:p-8"
        >
          {(error ||
            success) && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                error
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-green-200 bg-green-50 text-green-700"
              }`}
            >
              {error ||
                success}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[#35281d]">
                Nome interno
              </span>

              <input
                type="text"
                value={
                  form.title
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "title",
                    event.target
                      .value
                  )
                }
                maxLength={
                  150
                }
                placeholder="Ex.: Banner Dia das Mães"
                className="h-12 w-full rounded-xl border border-[#ded4c0] bg-white px-4 text-[#20170f] outline-none transition placeholder:text-neutral-400 focus:border-[#b98218] focus:ring-4 focus:ring-[#b98218]/10"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[#35281d]">
                Link ao clicar
              </span>

              <input
                type="text"
                value={
                  form.href
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "href",
                    event.target
                      .value
                  )
                }
                maxLength={
                  500
                }
                placeholder="/catalogo"
                className="h-12 w-full rounded-xl border border-[#ded4c0] bg-white px-4 text-[#20170f] outline-none transition placeholder:text-neutral-400 focus:border-[#b98218] focus:ring-4 focus:ring-[#b98218]/10"
              />
            </label>

            <label className="block lg:col-span-2">
              <span className="mb-2 block text-sm font-bold text-[#35281d]">
                Descrição da imagem
              </span>

              <input
                type="text"
                value={
                  form.alt
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "alt",
                    event.target
                      .value
                  )
                }
                maxLength={
                  250
                }
                placeholder="Ex.: Um presente de fé para quem sempre cuidou de você"
                className="h-12 w-full rounded-xl border border-[#ded4c0] bg-white px-4 text-[#20170f] outline-none transition placeholder:text-neutral-400 focus:border-[#b98218] focus:ring-4 focus:ring-[#b98218]/10"
              />
            </label>
          </div>

          {/* IMAGENS */}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-[#e5dac5] bg-[#fcfaf6] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#20170f] text-white">
                  <Monitor size={20} />
                </span>

                <div>
                  <h3 className="font-extrabold text-[#20170f]">
                    Imagem desktop
                  </h3>

                  <p className="text-xs text-neutral-500">
                    Exatamente 1738 × 905 px
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  desktopInputRef.current?.click()
                }
                onDragEnter={(
                  event
                ) =>
                  handleDragOver(
                    event,
                    "desktop"
                  )
                }
                onDragOver={(
                  event
                ) =>
                  handleDragOver(
                    event,
                    "desktop"
                  )
                }
                onDragLeave={(
                  event
                ) =>
                  handleDragLeave(
                    event,
                    "desktop"
                  )
                }
                onDrop={(
                  event
                ) =>
                  void handleImageDrop(
                    event,
                    "desktop"
                  )
                }
                aria-label="Selecionar ou soltar a imagem desktop"
                className={`relative flex aspect-[1738/905] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-white transition-all duration-200 ${
                  draggingVariant ===
                  "desktop"
                    ? "scale-[1.01] border-[#b98218] bg-[#fff8e8] shadow-[0_0_0_5px_rgba(185,130,24,0.14)]"
                    : "border-[#cfa853] hover:border-[#b98218]"
                }`}
              >
                {draggingVariant ===
                  "desktop" && (
                  <span className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#fff8e8]/95 px-4 text-center text-[#8d6212] backdrop-blur-sm">
                    <ImagePlus
                      size={38}
                    />

                    <strong className="text-base">
                      Solte a imagem desktop aqui
                    </strong>

                    <small>
                      1738 × 905 px
                    </small>
                  </span>
                )}

                {desktopPreview ? (
                  <>
                    <img
                      src={
                        desktopPreview
                      }
                      alt="Pré-visualização desktop"
                      className="h-full w-full object-cover"
                    />

                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-bold text-white opacity-0 transition hover:bg-black/45 hover:opacity-100">
                      Trocar imagem
                    </span>
                  </>
                ) : (
                  <span className="flex flex-col items-center gap-2 px-4 text-center text-[#9b6d15]">
                    <ImagePlus size={30} />

                    <strong>
                      Arraste e solte ou clique para selecionar
                    </strong>

                    <small>
                      JPG, PNG ou WebP • até 8 MB
                    </small>
                  </span>
                )}
              </button>

              <input
                ref={
                  desktopInputRef
                }
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(
                  event
                ) =>
                  void handleImageChange(
                    event,
                    "desktop"
                  )
                }
              />
            </div>

            <div className="rounded-2xl border border-[#e5dac5] bg-[#fcfaf6] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b98218] text-white">
                  <Smartphone size={20} />
                </span>

                <div>
                  <h3 className="font-extrabold text-[#20170f]">
                    Imagem mobile
                  </h3>

                  <p className="text-xs text-neutral-500">
                    Exatamente 1254 × 1254 px
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  mobileInputRef.current?.click()
                }
                onDragEnter={(
                  event
                ) =>
                  handleDragOver(
                    event,
                    "mobile"
                  )
                }
                onDragOver={(
                  event
                ) =>
                  handleDragOver(
                    event,
                    "mobile"
                  )
                }
                onDragLeave={(
                  event
                ) =>
                  handleDragLeave(
                    event,
                    "mobile"
                  )
                }
                onDrop={(
                  event
                ) =>
                  void handleImageDrop(
                    event,
                    "mobile"
                  )
                }
                aria-label="Selecionar ou soltar a imagem mobile"
                className={`relative mx-auto flex aspect-square w-full max-w-[340px] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-white transition-all duration-200 ${
                  draggingVariant ===
                  "mobile"
                    ? "scale-[1.01] border-[#b98218] bg-[#fff8e8] shadow-[0_0_0_5px_rgba(185,130,24,0.14)]"
                    : "border-[#cfa853] hover:border-[#b98218]"
                }`}
              >
                {draggingVariant ===
                  "mobile" && (
                  <span className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#fff8e8]/95 px-4 text-center text-[#8d6212] backdrop-blur-sm">
                    <ImagePlus
                      size={38}
                    />

                    <strong className="text-base">
                      Solte a imagem mobile aqui
                    </strong>

                    <small>
                      1254 × 1254 px
                    </small>
                  </span>
                )}

                {mobilePreview ? (
                  <>
                    <img
                      src={
                        mobilePreview
                      }
                      alt="Pré-visualização mobile"
                      className="h-full w-full object-cover"
                    />

                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-bold text-white opacity-0 transition hover:bg-black/45 hover:opacity-100">
                      Trocar imagem
                    </span>
                  </>
                ) : (
                  <span className="flex flex-col items-center gap-2 px-4 text-center text-[#9b6d15]">
                    <ImagePlus size={30} />

                    <strong>
                      Arraste e solte ou clique para selecionar
                    </strong>

                    <small>
                      JPG, PNG ou WebP • até 8 MB
                    </small>
                  </span>
                )}
              </button>

              <input
                ref={
                  mobileInputRef
                }
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(
                  event
                ) =>
                  void handleImageChange(
                    event,
                    "mobile"
                  )
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[#35281d]">
                Posição
              </span>

              <input
                type="number"
                min={0}
                max={10000}
                value={
                  form.sortOrder
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "sortOrder",
                    event.target
                      .value
                  )
                }
                placeholder="Automática"
                className="h-12 w-full rounded-xl border border-[#ded4c0] bg-white px-4 text-[#20170f] outline-none transition focus:border-[#b98218] focus:ring-4 focus:ring-[#b98218]/10"
              />
            </label>

            <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#ded4c0] bg-[#faf8f3] px-4 py-3 sm:self-end">
              <span>
                <strong className="block text-sm text-[#35281d]">
                  Banner ativo
                </strong>

                <small className="text-neutral-500">
                  Exibir na página inicial
                </small>
              </span>

              <input
                type="checkbox"
                checked={
                  form.active
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "active",
                    event.target
                      .checked
                  )
                }
                className="h-5 w-5 accent-[#b98218]"
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[#eee4d1] pt-6 sm:flex-row sm:justify-end">
            {editingBanner && (
              <button
                type="button"
                onClick={
                  resetForm
                }
                disabled={
                  saving
                }
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#d8c9aa] px-5 font-bold text-[#5f4931] transition hover:bg-[#f8f3ea] disabled:opacity-50"
              >
                <X size={18} />

                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={
                saving
              }
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#20170f] px-6 font-extrabold text-white transition hover:bg-[#3a2a1c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2
                  size={19}
                  className="animate-spin"
                />
              ) : (
                <Save size={19} />
              )}

              {saving
                ? uploadMessage ||
                  "Salvando..."
                : editingBanner
                  ? "Salvar alterações"
                  : "Cadastrar banner"}
            </button>
          </div>
        </form>
      </section>

      {/* LISTAGEM */}

      <section className="overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-[#eee4d1] bg-[#faf8f3] px-5 py-5 sm:flex-row sm:items-center sm:px-8">
          <div>
            <h2 className="text-2xl font-extrabold text-[#20170f]">
              Banners cadastrados
            </h2>

            <p className="mt-1 text-sm text-neutral-600">
              {banners.length}{" "}
              {banners.length ===
              1
                ? "banner cadastrado"
                : "banners cadastrados"}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadBanners()
            }
            disabled={
              loading
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d8c9aa] bg-white px-4 text-sm font-bold text-[#5f4931] transition hover:bg-[#f7f1e7] disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Atualizar
          </button>
        </div>

        <div className="p-5 sm:p-8">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2
                size={34}
                className="animate-spin text-[#b98218]"
              />
            </div>
          ) : banners.length ===
            0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#decfae] bg-[#fcfaf6] px-5 text-center">
              <ImagePlus
                size={42}
                className="text-[#b98218]"
              />

              <h3 className="mt-4 text-lg font-extrabold text-[#20170f]">
                Nenhum banner cadastrado
              </h3>

              <p className="mt-1 text-sm text-neutral-500">
                Preencha o formulário acima para criar o primeiro banner.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {banners.map(
                (banner) => (
                  <article
                    key={
                      banner.id
                    }
                    className="overflow-hidden rounded-2xl border border-[#e5dac5] bg-white"
                  >
                    <div className="relative aspect-[1738/905] overflow-hidden bg-[#eee7da]">
                      <img
                        src={
                          banner.desktopImageUrl
                        }
                        alt={
                          banner.alt
                        }
                        className="h-full w-full object-cover"
                      />

                      <span
                        className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold shadow ${
                          banner.active
                            ? "bg-green-600 text-white"
                            : "bg-neutral-700 text-white"
                        }`}
                      >
                        {banner.active && (
                          <CheckCircle2
                            size={14}
                          />
                        )}

                        {banner.active
                          ? "Ativo"
                          : "Inativo"}
                      </span>

                      <span className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                        Posição{" "}
                        {
                          banner.sortOrder
                        }
                      </span>
                    </div>

                    <div className="p-5">
                      <div className="flex gap-4">
                        <img
                          src={
                            banner.mobileImageUrl
                          }
                          alt=""
                          aria-hidden="true"
                          className="h-20 w-20 shrink-0 rounded-xl border border-[#e5dac5] object-cover"
                        />

                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-extrabold text-[#20170f]">
                            {
                              banner.title
                            }
                          </h3>

                          <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
                            {
                              banner.alt
                            }
                          </p>

                          <p className="mt-2 truncate text-xs font-bold text-[#9b6d15]">
                            {banner.href ||
                              "Sem link"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() =>
                            startEditing(
                              banner
                            )
                          }
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d8c9aa] font-bold text-[#5f4931] transition hover:bg-[#f8f3ea]"
                        >
                          <Edit3
                            size={17}
                          />

                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void toggleBannerStatus(
                              banner
                            )
                          }
                          disabled={
                            changingStatusId ===
                            banner.id
                          }
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d8c9aa] font-bold text-[#5f4931] transition hover:bg-[#f8f3ea] disabled:opacity-50"
                        >
                          {changingStatusId ===
                          banner.id ? (
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                          ) : banner.active ? (
                            <X
                              size={17}
                            />
                          ) : (
                            <CheckCircle2
                              size={17}
                            />
                          )}

                          {banner.active
                            ? "Desativar"
                            : "Ativar"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void deleteBanner(
                              banner
                            )
                          }
                          disabled={
                            deletingId ===
                            banner.id
                          }
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId ===
                          banner.id ? (
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2
                              size={17}
                            />
                          )}

                          Excluir
                        </button>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}