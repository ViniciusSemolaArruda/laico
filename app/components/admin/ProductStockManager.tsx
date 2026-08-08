"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  History,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  SlidersHorizontal,
  X,
} from "lucide-react";

import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  useRouter,
} from "next/navigation";

type MovementType =
  | "ENTRY"
  | "EXIT"
  | "ADJUSTMENT";

type Movement = {
  id: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  note: string | null;
  createdAt: string;

  actor: {
    id: string;
    name: string;
  };
};

type HistoryResponse = {
  success?: boolean;

  product?: {
    id: string;
    name: string;
    sku: string | null;
    stock: number;
    minimumStock: number;
  };

  movements?: Movement[];

  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };

  error?: string;
};

type MovementResponse = {
  success?: boolean;
  message?: string;
  error?: string;

  product?: {
    id: string;
    name: string;
    sku: string | null;
    stock: number;
    minimumStock: number;
  };
};

type Props = {
  productId: string;
  productName: string;
  sku: string | null;
  initialStock: number;
  minimumStock: number;
  canEdit: boolean;
};

function formatDate(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle:
        "short",

      timeStyle:
        "short",

      timeZone:
        "America/Sao_Paulo",
    }
  ).format(date);
}

function getMovementLabel(
  type: MovementType
) {
  switch (type) {
    case "ENTRY":
      return "Entrada";

    case "EXIT":
      return "Saída";

    case "ADJUSTMENT":
      return "Correção";
  }
}

function getMovementStyle(
  type: MovementType
) {
  switch (type) {
    case "ENTRY":
      return "border-green-200 bg-green-50 text-green-700";

    case "EXIT":
      return "border-red-200 bg-red-50 text-red-700";

    case "ADJUSTMENT":
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

export default function ProductStockManager({
  productId,
  productName,
  sku,
  initialStock,
  minimumStock,
  canEdit,
}: Props) {
  const router =
    useRouter();

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    currentStock,
    setCurrentStock,
  ] =
    useState(
      initialStock
    );

  const [
    movementType,
    setMovementType,
  ] =
    useState<MovementType>(
      "ENTRY"
    );

  const [
    quantity,
    setQuantity,
  ] =
    useState("");

  const [
    newStock,
    setNewStock,
  ] =
    useState("");

  const [
    reason,
    setReason,
  ] =
    useState("");

  const [
    note,
    setNote,
  ] =
    useState("");

  const [
    movements,
    setMovements,
  ] =
    useState<
      Movement[]
    >([]);

  const [
    historyPage,
    setHistoryPage,
  ] =
    useState(1);

  const [
    totalPages,
    setTotalPages,
  ] =
    useState(1);

  const [
    totalMovements,
    setTotalMovements,
  ] =
    useState(0);

  const [
    loadingHistory,
    setLoadingHistory,
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
    useState<
      string | null
    >(null);

  const [
    success,
    setSuccess,
  ] =
    useState<
      string | null
    >(null);

  /*
   * =======================================================
   * CONTROLE DO MODAL
   * =======================================================
   */

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    open,
  ]);

  /*
   * ESC fecha o modal.
   */

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
          "Escape" &&
        !submitting
      ) {
        setOpen(
          false
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    open,
    submitting,
  ]);

  /*
   * =======================================================
   * HISTÓRICO
   * =======================================================
   */

  async function loadHistory(
    page = 1
  ) {
    setLoadingHistory(
      true
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          `/api/admin/products/${productId}/stock?page=${page}`,
          {
            method:
              "GET",

            credentials:
              "same-origin",

            cache:
              "no-store",
          }
        );

      const data =
        (await response.json()) as HistoryResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Não foi possível carregar o histórico."
        );
      }

      setMovements(
        data.movements ??
          []
      );

      setHistoryPage(
        data.pagination
          ?.page ??
          1
      );

      setTotalPages(
        data.pagination
          ?.totalPages ??
          1
      );

      setTotalMovements(
        data.pagination
          ?.total ??
          0
      );

      if (
        data.product
      ) {
        setCurrentStock(
          data.product
            .stock
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o histórico."
      );
    } finally {
      setLoadingHistory(
        false
      );
    }
  }

  async function openManager() {
    setError(
      null
    );

    setSuccess(
      null
    );

    setOpen(
      true
    );

    await loadHistory(
      1
    );
  }

  function closeManager() {
    if (
      submitting
    ) {
      return;
    }

    setOpen(
      false
    );

    setError(
      null
    );

    setSuccess(
      null
    );

    setQuantity(
      ""
    );

    setNewStock(
      ""
    );

    setReason(
      ""
    );

    setNote(
      ""
    );
  }

  /*
   * =======================================================
   * TIPO DE MOVIMENTAÇÃO
   * =======================================================
   */

  function selectMovementType(
    type: MovementType
  ) {
    if (
      submitting
    ) {
      return;
    }

    setMovementType(
      type
    );

    setQuantity(
      ""
    );

    setNewStock(
      ""
    );

    setError(
      null
    );

    setSuccess(
      null
    );
  }

  /*
   * =======================================================
   * SALVAR
   * =======================================================
   */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      submitting ||
      !canEdit
    ) {
      return;
    }

    setError(
      null
    );

    setSuccess(
      null
    );

    const normalizedReason =
      reason.trim();

    if (
      normalizedReason.length <
      3
    ) {
      setError(
        "Informe o motivo da movimentação."
      );

      return;
    }

    /*
     * CORREÇÃO
     */

    if (
      movementType ===
      "ADJUSTMENT"
    ) {
      const parsed =
        Number(
          newStock
        );

      if (
        !Number.isInteger(
          parsed
        ) ||
        parsed < 0
      ) {
        setError(
          "Informe o novo estoque corretamente."
        );

        return;
      }

      if (
        parsed ===
        currentStock
      ) {
        setError(
          "O novo estoque precisa ser diferente do estoque atual."
        );

        return;
      }
    } else {
      /*
       * ENTRADA / SAÍDA
       */

      const parsed =
        Number(
          quantity
        );

      if (
        !Number.isInteger(
          parsed
        ) ||
        parsed <= 0
      ) {
        setError(
          "Informe uma quantidade válida."
        );

        return;
      }

      if (
        movementType ===
          "EXIT" &&
        parsed >
          currentStock
      ) {
        setError(
          "A saída não pode ser maior que o estoque atual."
        );

        return;
      }
    }

    setSubmitting(
      true
    );

    try {
      const body =
        movementType ===
        "ADJUSTMENT"
          ? {
              type:
                movementType,

              newStock:
                Number(
                  newStock
                ),

              reason:
                normalizedReason,

              note:
                note.trim(),
            }
          : {
              type:
                movementType,

              quantity:
                Number(
                  quantity
                ),

              reason:
                normalizedReason,

              note:
                note.trim(),
            };

      const response =
        await fetch(
          `/api/admin/products/${productId}/stock`,
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
                body
              ),
          }
        );

      const data =
        (await response.json()) as MovementResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Não foi possível atualizar o estoque."
        );
      }

      if (
        data.product
      ) {
        setCurrentStock(
          data.product
            .stock
        );
      }

      setQuantity(
        ""
      );

      setNewStock(
        ""
      );

      setReason(
        ""
      );

      setNote(
        ""
      );

      setSuccess(
        data.message ||
          "Estoque atualizado com sucesso."
      );

      await loadHistory(
        1
      );

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o estoque."
      );
    } finally {
      setSubmitting(
        false
      );
    }
  }

  const lowStock =
    currentStock >
      0 &&
    currentStock <=
      minimumStock;

  /*
   * =======================================================
   * MODAL
   * =======================================================
   */

  const modal =
    open ? (
      <div
        onMouseDown={(
          event
        ) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            closeManager();
          }
        }}
        style={{
          position:
            "fixed",

          top:
            0,

          right:
            0,

          bottom:
            0,

          left:
            0,

          zIndex:
            2147483000,

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          width:
            "100vw",

          height:
            "100dvh",

          padding:
            "16px",

          overflow:
            "hidden",

          background:
            "rgba(0, 0, 0, 0.58)",
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={`stock-title-${productId}`}
          className="flex flex-col rounded-2xl border border-[#e8dcc2] bg-white shadow-2xl"
          style={{
            position:
              "relative",

            width:
              "min(960px, calc(100vw - 32px))",

            maxWidth:
              "960px",

            height:
              "auto",

            maxHeight:
              "calc(100dvh - 32px)",

            margin:
              0,

            overflow:
              "hidden",
          }}
        >
          {/* =============================================
              CABEÇALHO
          ============================================= */}

          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#eee2cc] bg-white px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#b98218]">
                Controle de estoque
              </p>

              <h2
                id={`stock-title-${productId}`}
                className="mt-1 truncate text-xl font-extrabold text-[#20170f]"
              >
                {
                  productName
                }
              </h2>

              {sku && (
                <p className="mt-1 font-mono text-[11px] text-neutral-500">
                  {
                    sku
                  }
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={
                closeManager
              }
              disabled={
                submitting
              }
              aria-label="Fechar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#eee2cc] text-neutral-500 transition hover:bg-neutral-100 disabled:opacity-50"
            >
              <X
                size={18}
              />
            </button>
          </header>

          {/* =============================================
              CONTEÚDO
          ============================================= */}

          <div
            className="overflow-y-auto"
            style={{
              minHeight:
                0,

              overflowY:
                "auto",

              overflowX:
                "hidden",
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {/* =========================================
                  MOVIMENTAÇÃO
              ========================================= */}

              <div className="p-5 sm:p-6 lg:col-span-1 lg:border-r lg:border-[#eee2cc]">
                {/* RESUMO */}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#e8dcc2] bg-[#faf9f6] p-4">
                    <p className="text-[11px] font-bold text-neutral-500">
                      Estoque atual
                    </p>

                    <strong
                      className={`mt-1 block text-2xl ${
                        currentStock <=
                        0
                          ? "text-red-600"
                          : lowStock
                            ? "text-orange-600"
                            : "text-green-700"
                      }`}
                    >
                      {
                        currentStock
                      }
                    </strong>
                  </div>

                  <div className="rounded-xl border border-[#e8dcc2] bg-[#faf9f6] p-4">
                    <p className="text-[11px] font-bold text-neutral-500">
                      Estoque mínimo
                    </p>

                    <strong className="mt-1 block text-2xl text-[#20170f]">
                      {
                        minimumStock
                      }
                    </strong>
                  </div>
                </div>

                {lowStock && (
                  <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-[11px] font-bold text-orange-700">
                    Estoque baixo.
                  </div>
                )}

                {currentStock <=
                  0 && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">
                    Produto sem estoque.
                  </div>
                )}

                {/* FORMULÁRIO */}

                {canEdit ? (
                  <form
                    onSubmit={
                      handleSubmit
                    }
                    className="mt-5"
                  >
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-neutral-500">
                      Nova movimentação
                    </p>

                    {/* TIPO */}

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          selectMovementType(
                            "ENTRY"
                          )
                        }
                        disabled={
                          submitting
                        }
                        className={`flex min-h-[64px] flex-col items-center justify-center rounded-xl border p-2 text-[11px] font-bold transition ${
                          movementType ===
                          "ENTRY"
                            ? "border-green-400 bg-green-50 text-green-700"
                            : "border-[#e8dcc2] bg-white text-neutral-500 hover:bg-[#faf9f6]"
                        }`}
                      >
                        <ArrowUp
                          size={16}
                        />

                        <span className="mt-1">
                          Entrada
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          selectMovementType(
                            "EXIT"
                          )
                        }
                        disabled={
                          submitting
                        }
                        className={`flex min-h-[64px] flex-col items-center justify-center rounded-xl border p-2 text-[11px] font-bold transition ${
                          movementType ===
                          "EXIT"
                            ? "border-red-400 bg-red-50 text-red-700"
                            : "border-[#e8dcc2] bg-white text-neutral-500 hover:bg-[#faf9f6]"
                        }`}
                      >
                        <ArrowDown
                          size={16}
                        />

                        <span className="mt-1">
                          Saída
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          selectMovementType(
                            "ADJUSTMENT"
                          )
                        }
                        disabled={
                          submitting
                        }
                        className={`flex min-h-[64px] flex-col items-center justify-center rounded-xl border p-2 text-[11px] font-bold transition ${
                          movementType ===
                          "ADJUSTMENT"
                            ? "border-blue-400 bg-blue-50 text-blue-700"
                            : "border-[#e8dcc2] bg-white text-neutral-500 hover:bg-[#faf9f6]"
                        }`}
                      >
                        <SlidersHorizontal
                          size={16}
                        />

                        <span className="mt-1">
                          Corrigir
                        </span>
                      </button>
                    </div>

                    {/* QUANTIDADE */}

                    {movementType !==
                    "ADJUSTMENT" ? (
                      <label className="mt-4 block">
                        <span className="text-[11px] font-bold text-[#20170f]">
                          Quantidade *
                        </span>

                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={
                            quantity
                          }
                          onChange={(
                            event
                          ) =>
                            setQuantity(
                              event
                                .target
                                .value
                            )
                          }
                          required
                          disabled={
                            submitting
                          }
                          placeholder="Ex: 10"
                          className="mt-1.5 h-10 w-full rounded-xl border border-[#e8dcc2] bg-white px-3 text-sm outline-none focus:border-[#b98218]"
                        />
                      </label>
                    ) : (
                      <label className="mt-4 block">
                        <span className="text-[11px] font-bold text-[#20170f]">
                          Novo estoque *
                        </span>

                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={
                            newStock
                          }
                          onChange={(
                            event
                          ) =>
                            setNewStock(
                              event
                                .target
                                .value
                            )
                          }
                          required
                          disabled={
                            submitting
                          }
                          placeholder={`Atual: ${currentStock}`}
                          className="mt-1.5 h-10 w-full rounded-xl border border-[#e8dcc2] bg-white px-3 text-sm outline-none focus:border-[#b98218]"
                        />
                      </label>
                    )}

                    {/* MOTIVO */}

                    <label className="mt-3 block">
                      <span className="text-[11px] font-bold text-[#20170f]">
                        Motivo *
                      </span>

                      <input
                        type="text"
                        value={
                          reason
                        }
                        onChange={(
                          event
                        ) =>
                          setReason(
                            event
                              .target
                              .value
                          )
                        }
                        required
                        minLength={
                          3
                        }
                        maxLength={
                          200
                        }
                        disabled={
                          submitting
                        }
                        placeholder={
                          movementType ===
                          "ENTRY"
                            ? "Reposição do fornecedor"
                            : movementType ===
                                "EXIT"
                              ? "Produto avariado"
                              : "Correção após inventário"
                        }
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#e8dcc2] bg-white px-3 text-sm outline-none focus:border-[#b98218]"
                      />
                    </label>

                    {/* OBSERVAÇÃO */}

                    <label className="mt-3 block">
                      <span className="text-[11px] font-bold text-[#20170f]">
                        Observação
                      </span>

                      <textarea
                        value={
                          note
                        }
                        onChange={(
                          event
                        ) =>
                          setNote(
                            event
                              .target
                              .value
                          )
                        }
                        maxLength={
                          500
                        }
                        rows={2}
                        disabled={
                          submitting
                        }
                        placeholder="Informação complementar..."
                        className="mt-1.5 w-full resize-none rounded-xl border border-[#e8dcc2] bg-white px-3 py-2 text-sm outline-none focus:border-[#b98218]"
                      />
                    </label>

                    {/* ERRO */}

                    {error && (
                      <div
                        role="alert"
                        className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700"
                      >
                        {
                          error
                        }
                      </div>
                    )}

                    {/* SUCESSO */}

                    {success && (
                      <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[11px] font-medium text-green-700">
                        {
                          success
                        }
                      </div>
                    )}

                    {/* CONFIRMAR */}

                    <button
                      type="submit"
                      disabled={
                        submitting
                      }
                      className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#b98218] px-4 text-xs font-extrabold text-white transition hover:bg-[#9f6f14] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <LoaderCircle
                            size={15}
                            className="animate-spin"
                          />

                          Salvando...
                        </>
                      ) : (
                        <>
                          <PackageCheck
                            size={15}
                          />

                          Confirmar movimentação
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="mt-5 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] p-4">
                    <p className="text-xs leading-5 text-neutral-500">
                      Sua permissão permite consultar o histórico, mas não alterar o estoque.
                    </p>
                  </div>
                )}

                {!canEdit &&
                  error && (
                  <div
                    role="alert"
                    className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                  >
                    {
                      error
                    }
                  </div>
                )}
              </div>

              {/* =========================================
                  HISTÓRICO
              ========================================= */}

              <div className="min-w-0 p-5 sm:p-6 lg:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <History
                        size={18}
                        className="text-[#b98218]"
                      />

                      <h3 className="font-extrabold text-[#20170f]">
                        Histórico de estoque
                      </h3>
                    </div>

                    <p className="mt-1 text-[11px] text-neutral-500">
                      {
                        totalMovements
                      }{" "}
                      {totalMovements ===
                      1
                        ? "movimentação registrada"
                        : "movimentações registradas"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      loadHistory(
                        historyPage
                      )
                    }
                    disabled={
                      loadingHistory
                    }
                    aria-label="Atualizar histórico"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e8dcc2] text-[#b98218] transition hover:bg-[#fff8e8] disabled:opacity-50"
                  >
                    <RefreshCw
                      size={15}
                      className={
                        loadingHistory
                          ? "animate-spin"
                          : ""
                      }
                    />
                  </button>
                </div>

                {/* CARREGANDO */}

                {loadingHistory &&
                movements.length ===
                  0 ? (
                  <div className="flex min-h-[260px] items-center justify-center">
                    <LoaderCircle
                      size={28}
                      className="animate-spin text-[#b98218]"
                    />
                  </div>
                ) : movements.length ===
                  0 ? (
                  /* SEM MOVIMENTAÇÕES */

                  <div className="mt-5 flex min-h-[250px] flex-col items-center justify-center rounded-xl border border-dashed border-[#e8dcc2] bg-[#faf9f6] p-6 text-center">
                    <History
                      size={30}
                      className="text-neutral-300"
                    />

                    <strong className="mt-3 text-sm text-[#20170f]">
                      Nenhuma movimentação
                    </strong>

                    <p className="mt-1 max-w-[300px] text-xs leading-5 text-neutral-500">
                      Entradas, saídas e correções de estoque aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  /* LISTA */

                  <div className="mt-5 space-y-3">
                    {movements.map(
                      (
                        movement
                      ) => (
                        <article
                          key={
                            movement.id
                          }
                          className="rounded-xl border border-[#e8dcc2] bg-white p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getMovementStyle(
                                  movement.type
                                )}`}
                              >
                                {getMovementLabel(
                                  movement.type
                                )}
                              </span>

                              <strong className="text-sm text-[#20170f]">
                                {
                                  movement.previousStock
                                }{" "}
                                →{" "}
                                {
                                  movement.newStock
                                }
                              </strong>
                            </div>

                            <span className="text-[10px] text-neutral-400">
                              {formatDate(
                                movement.createdAt
                              )}
                            </span>
                          </div>

                          <p className="mt-3 text-xs font-bold text-[#20170f]">
                            {
                              movement.reason
                            }
                          </p>

                          {movement.note && (
                            <p className="mt-1 break-words text-xs leading-5 text-neutral-500">
                              {
                                movement.note
                              }
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#f0e8d8] pt-3">
                            <span className="text-[10px] text-neutral-500">
                              Responsável:{" "}
                              <strong className="text-[#20170f]">
                                {
                                  movement.actor.name
                                }
                              </strong>
                            </span>

                            <span className="text-[10px] font-extrabold text-neutral-500">
                              {movement.type ===
                              "ENTRY"
                                ? "+"
                                : movement.type ===
                                    "EXIT"
                                  ? "-"
                                  : "±"}
                              {
                                movement.quantity
                              }{" "}
                              un.
                            </span>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                )}

                {/* PAGINAÇÃO */}

                {totalPages >
                  1 && (
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#eee2cc] pt-4">
                    <button
                      type="button"
                      disabled={
                        loadingHistory ||
                        historyPage <=
                          1
                      }
                      onClick={() =>
                        loadHistory(
                          historyPage -
                            1
                        )
                      }
                      className="flex h-9 items-center gap-1 rounded-xl border border-[#e8dcc2] px-3 text-[11px] font-bold text-[#20170f] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowLeft
                        size={14}
                      />

                      Anterior
                    </button>

                    <span className="text-[10px] text-neutral-500">
                      Página{" "}
                      <strong>
                        {
                          historyPage
                        }
                      </strong>{" "}
                      de{" "}
                      <strong>
                        {
                          totalPages
                        }
                      </strong>
                    </span>

                    <button
                      type="button"
                      disabled={
                        loadingHistory ||
                        historyPage >=
                          totalPages
                      }
                      onClick={() =>
                        loadHistory(
                          historyPage +
                            1
                        )
                      }
                      className="flex h-9 items-center gap-1 rounded-xl border border-[#e8dcc2] px-3 text-[11px] font-bold text-[#20170f] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Próxima

                      <ArrowRight
                        size={14}
                      />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* =============================================
              FOOTER
          ============================================= */}

          <footer className="flex shrink-0 items-center justify-end border-t border-[#eee2cc] bg-[#faf9f6] px-5 py-3 sm:px-6">
            <button
              type="button"
              onClick={
                closeManager
              }
              disabled={
                submitting
              }
              className="h-9 rounded-xl border border-[#e8dcc2] bg-white px-4 text-xs font-bold text-[#20170f] transition hover:bg-[#fff8e8] disabled:opacity-50"
            >
              Fechar
            </button>
          </footer>
        </section>
      </div>
    ) : null;

  return (
    <>
      {/* BOTÃO */}

      <button
        type="button"
        onClick={
          openManager
        }
        className="flex h-9 items-center gap-2 rounded-xl border border-[#e8dcc2] bg-white px-3 text-xs font-bold text-[#7a5422] transition hover:bg-[#fff8e8]"
      >
        <PackageCheck
          size={15}
        />

        Estoque
      </button>

      {/* MODAL FORA DO ADMIN SHELL */}

      {open &&
        modal &&
        createPortal(
          modal,
          document.body
        )}
    </>
  );
}