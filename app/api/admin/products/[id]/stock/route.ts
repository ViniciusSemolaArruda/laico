import {
  NextResponse,
} from "next/server";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

const MAX_BODY_SIZE =
  10_000;

const MAX_STOCK =
  10_000_000;

const ACCESS_DENIED_MESSAGE =
  "Você não tem permissão para fazer isso! Acesso negado.";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type MovementType =
  | "ENTRY"
  | "EXIT"
  | "ADJUSTMENT";

type StockRequestBody = {
  type?: unknown;
  quantity?: unknown;
  newStock?: unknown;
  reason?: unknown;
  note?: unknown;
};

class StockConflictError extends Error {
  constructor() {
    super(
      "STOCK_CONFLICT"
    );

    this.name =
      "StockConflictError";
  }
}

/*
 * =========================================================
 * JSON
 * =========================================================
 */

function jsonResponse(
  body: Record<
    string,
    unknown
  >,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "private, no-store, no-cache, must-revalidate",

        Pragma:
          "no-cache",

        "X-Content-Type-Options":
          "nosniff",
      },
    }
  );
}

/*
 * =========================================================
 * ORIGEM
 * =========================================================
 */

function isAllowedOrigin(
  request: Request
) {
  const origin =
    request.headers.get(
      "origin"
    );

  if (!origin) {
    return true;
  }

  try {
    return (
      origin ===
      new URL(
        request.url
      ).origin
    );
  } catch {
    return false;
  }
}

/*
 * =========================================================
 * VALIDAÇÕES
 * =========================================================
 */

function isValidProductId(
  id: string
) {
  return /^[a-zA-Z0-9_-]{10,100}$/.test(
    id
  );
}

function isMovementType(
  value: unknown
): value is MovementType {
  return (
    value ===
      "ENTRY" ||
    value ===
      "EXIT" ||
    value ===
      "ADJUSTMENT"
  );
}

function normalizeText(
  value: unknown,
  maximumLength: number
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(
      0,
      maximumLength
    );
}

function getInteger(
  value: unknown
) {
  if (
    typeof value ===
      "number" &&
    Number.isInteger(
      value
    )
  ) {
    return value;
  }

  if (
    typeof value ===
      "string" &&
    /^\d+$/.test(
      value
    )
  ) {
    return Number(
      value
    );
  }

  return null;
}

/*
 * =========================================================
 * RESPOSTA DE AUTORIZAÇÃO
 * =========================================================
 */

function getAuthorizationResponse(
  error: unknown
) {
  if (
    !(error instanceof Error)
  ) {
    return null;
  }

  if (
    error.message ===
    "ADMIN_UNAUTHORIZED"
  ) {
    return jsonResponse(
      {
        error:
          "Não autorizado.",
      },
      401
    );
  }

  if (
    error.message ===
    "ADMIN_FORBIDDEN"
  ) {
    return jsonResponse(
      {
        error:
          ACCESS_DENIED_MESSAGE,
      },
      403
    );
  }

  return null;
}

/*
 * =========================================================
 * GET
 * =========================================================
 *
 * Histórico de movimentações de estoque.
 */

export async function GET(
  request: Request,
  {
    params,
  }: Props
) {
  try {
    /*
     * Para visualizar o histórico basta
     * possuir acesso de leitura aos produtos.
     */

    await requireAdminPermission(
      "PRODUCTS",
      "VIEW"
    );

    const {
      id,
    } =
      await params;

    if (
      !id ||
      !isValidProductId(
        id
      )
    ) {
      return jsonResponse(
        {
          error:
            "Produto inválido.",
        },
        400
      );
    }

    const product =
      await prisma.product.findFirst({
        where: {
          id,

          archivedAt:
            null,
        },

        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          minimumStock:
            true,
        },
      });

    if (!product) {
      return jsonResponse(
        {
          error:
            "Produto não encontrado.",
        },
        404
      );
    }

    /*
     * =====================================================
     * PAGINAÇÃO DO HISTÓRICO
     * =====================================================
     */

    const url =
      new URL(
        request.url
      );

    const requestedPage =
      Number(
        url.searchParams.get(
          "page"
        ) || "1"
      );

    const page =
      Number.isInteger(
        requestedPage
      ) &&
      requestedPage > 0
        ? Math.min(
            requestedPage,
            10_000
          )
        : 1;

    const limit =
      20;

    const total =
      await prisma.productStockMovement.count({
        where: {
          productId:
            product.id,
        },
      });

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          total /
            limit
        )
      );

    const safePage =
      Math.min(
        page,
        totalPages
      );

    const movements =
      await prisma.productStockMovement.findMany({
        where: {
          productId:
            product.id,
        },

        orderBy: [
          {
            createdAt:
              "desc",
          },

          {
            id:
              "desc",
          },
        ],

        skip:
          (safePage - 1) *
          limit,

        take:
          limit,

        select: {
          id: true,

          type: true,

          quantity:
            true,

          previousStock:
            true,

          newStock:
            true,

          reason:
            true,

          note:
            true,

          createdAt:
            true,

          actor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    return jsonResponse({
      success:
        true,

      product: {
        id:
          product.id,

        name:
          product.name,

        sku:
          product.sku,

        stock:
          product.stock,

        minimumStock:
          product.minimumStock,
      },

      movements,

      pagination: {
        page:
          safePage,

        limit,

        total,

        totalPages,

        hasPreviousPage:
          safePage > 1,

        hasNextPage:
          safePage <
          totalPages,
      },
    });
  } catch (error) {
    const authorizationResponse =
      getAuthorizationResponse(
        error
      );

    if (
      authorizationResponse
    ) {
      return authorizationResponse;
    }

    console.error(
      "Erro ao carregar movimentações de estoque:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível carregar o histórico de estoque.",
      },
      500
    );
  }
}

/*
 * =========================================================
 * POST
 * =========================================================
 *
 * Cria uma movimentação e altera o estoque.
 */

export async function POST(
  request: Request,
  {
    params,
  }: Props
) {
  try {
    /*
     * =====================================================
     * ORIGEM
     * =====================================================
     */

    if (
      !isAllowedOrigin(
        request
      )
    ) {
      return jsonResponse(
        {
          error:
            ACCESS_DENIED_MESSAGE,
        },
        403
      );
    }

    /*
     * =====================================================
     * AUTORIZAÇÃO
     * =====================================================
     *
     * VIEW não pode alterar estoque.
     *
     * EDIT ou MANAGE poderão realizar a operação,
     * conforme a hierarquia já implementada no
     * requireAdminPermission.
     */

    const session =
      await requireAdminPermission(
        "PRODUCTS",
        "EDIT"
      );

    /*
     * =====================================================
     * PRODUTO
     * =====================================================
     */

    const {
      id,
    } =
      await params;

    if (
      !id ||
      !isValidProductId(
        id
      )
    ) {
      return jsonResponse(
        {
          error:
            "Produto inválido.",
        },
        400
      );
    }

    /*
     * =====================================================
     * CONTENT TYPE
     * =====================================================
     */

    const contentType =
      request.headers.get(
        "content-type"
      ) ?? "";

    if (
      !contentType
        .toLowerCase()
        .includes(
          "application/json"
        )
    ) {
      return jsonResponse(
        {
          error:
            "Formato da requisição inválido.",
        },
        415
      );
    }

    /*
     * =====================================================
     * TAMANHO
     * =====================================================
     */

    const contentLength =
      Number(
        request.headers.get(
          "content-length"
        ) || "0"
      );

    if (
      Number.isFinite(
        contentLength
      ) &&
      contentLength >
        MAX_BODY_SIZE
    ) {
      return jsonResponse(
        {
          error:
            "Requisição muito grande.",
        },
        413
      );
    }

    const rawBody =
      await request.text();

    if (
      !rawBody ||
      rawBody.length >
        MAX_BODY_SIZE
    ) {
      return jsonResponse(
        {
          error:
            "Requisição inválida.",
        },
        400
      );
    }

    let body:
      StockRequestBody;

    try {
      body =
        JSON.parse(
          rawBody
        ) as StockRequestBody;
    } catch {
      return jsonResponse(
        {
          error:
            "Requisição inválida.",
        },
        400
      );
    }

    /*
     * =====================================================
     * TIPO
     * =====================================================
     */

    if (
      !isMovementType(
        body.type
      )
    ) {
      return jsonResponse(
        {
          error:
            "Tipo de movimentação inválido.",
        },
        400
      );
    }

    const movementType =
      body.type;

    /*
     * =====================================================
     * MOTIVO
     * =====================================================
     */

    const reason =
      normalizeText(
        body.reason,
        200
      );

    if (
      reason.length < 3
    ) {
      return jsonResponse(
        {
          error:
            "Informe o motivo da movimentação.",
        },
        400
      );
    }

    const note =
      normalizeText(
        body.note,
        500
      );

    /*
     * =====================================================
     * QUANTIDADE
     * =====================================================
     */

    const requestedQuantity =
      getInteger(
        body.quantity
      );

    const requestedNewStock =
      getInteger(
        body.newStock
      );

    if (
      movementType !==
        "ADJUSTMENT" &&
      (
        requestedQuantity ===
          null ||
        requestedQuantity <=
          0 ||
        requestedQuantity >
          MAX_STOCK
      )
    ) {
      return jsonResponse(
        {
          error:
            "Informe uma quantidade válida.",
        },
        400
      );
    }

    if (
      movementType ===
        "ADJUSTMENT" &&
      (
        requestedNewStock ===
          null ||
        requestedNewStock <
          0 ||
        requestedNewStock >
          MAX_STOCK
      )
    ) {
      return jsonResponse(
        {
          error:
            "Informe o novo estoque corretamente.",
        },
        400
      );
    }

    /*
     * =====================================================
     * TRANSAÇÃO
     * =====================================================
     *
     * Dentro da mesma transação:
     *
     * 1. consultamos o estoque;
     * 2. calculamos o novo estoque;
     * 3. fazemos update condicional;
     * 4. salvamos movimentação;
     * 5. registramos auditoria.
     *
     * Se qualquer etapa falhar, nada é gravado.
     */

    const result =
      await prisma.$transaction(
        async (
          transaction
        ) => {
          const product =
            await transaction.product.findFirst({
              where: {
                id,

                archivedAt:
                  null,
              },

              select: {
                id: true,
                name: true,
                sku: true,
                stock: true,
                minimumStock:
                  true,
              },
            });

          if (!product) {
            throw new Error(
              "PRODUCT_NOT_FOUND"
            );
          }

          const previousStock =
            product.stock;

          let newStock =
            previousStock;

          let movementQuantity =
            0;

          /*
           * =============================================
           * ENTRADA
           * =============================================
           */

          if (
            movementType ===
            "ENTRY"
          ) {
            movementQuantity =
              requestedQuantity!;

            newStock =
              previousStock +
              movementQuantity;
          }

          /*
           * =============================================
           * SAÍDA
           * =============================================
           */

          if (
            movementType ===
            "EXIT"
          ) {
            movementQuantity =
              requestedQuantity!;

            if (
              movementQuantity >
              previousStock
            ) {
              throw new Error(
                "INSUFFICIENT_STOCK"
              );
            }

            newStock =
              previousStock -
              movementQuantity;
          }

          /*
           * =============================================
           * CORREÇÃO
           * =============================================
           */

          if (
            movementType ===
            "ADJUSTMENT"
          ) {
            newStock =
              requestedNewStock!;

            if (
              newStock ===
              previousStock
            ) {
              throw new Error(
                "STOCK_NOT_CHANGED"
              );
            }

            movementQuantity =
              Math.abs(
                newStock -
                  previousStock
              );
          }

          /*
           * Defesa adicional.
           */

          if (
            newStock < 0 ||
            newStock >
              MAX_STOCK
          ) {
            throw new Error(
              "INVALID_STOCK"
            );
          }

          /*
           * =============================================
           * CONTROLE DE CONCORRÊNCIA
           * =============================================
           *
           * O update acontece SOMENTE se o estoque ainda
           * possuir o mesmo valor que acabamos de ler.
           *
           * Se outra requisição alterou o estoque nesse
           * intervalo, count será 0.
           */

          const updateResult =
            await transaction.product.updateMany({
              where: {
                id:
                  product.id,

                archivedAt:
                  null,

                stock:
                  previousStock,
              },

              data: {
                stock:
                  newStock,
              },
            });

          if (
            updateResult.count !==
            1
          ) {
            throw new StockConflictError();
          }

          /*
           * =============================================
           * HISTÓRICO DE ESTOQUE
           * =============================================
           */

          const movement =
            await transaction.productStockMovement.create({
              data: {
                productId:
                  product.id,

                actorId:
                  session.userId,

                type:
                  movementType,

                quantity:
                  movementQuantity,

                previousStock,

                newStock,

                reason,

                note:
                  note ||
                  null,
              },

              select: {
                id: true,
                type: true,
                quantity:
                  true,
                previousStock:
                  true,
                newStock:
                  true,
                reason:
                  true,
                note:
                  true,
                createdAt:
                  true,
              },
            });

          /*
           * =============================================
           * AUDITORIA ADMINISTRATIVA
           * =============================================
           */

          await transaction.adminAuditLog.create({
            data: {
              actorId:
                session.userId,

              module:
                "PRODUCTS",

              action:
                "PRODUCT_STOCK_MOVEMENT",

              entityType:
                "PRODUCT",

              entityId:
                product.id,

              changes: {
                productName:
                  product.name,

                sku:
                  product.sku,

                movementType,

                quantity:
                  movementQuantity,

                previousStock,

                newStock,

                reason,

                /*
                 * Mantemos a observação na auditoria
                 * porque ela faz parte da justificativa
                 * administrativa da operação.
                 */

                note:
                  note ||
                  null,
              },
            },
          });

          return {
            product: {
              id:
                product.id,

              name:
                product.name,

              sku:
                product.sku,

              stock:
                newStock,

              minimumStock:
                product.minimumStock,
            },

            movement,
          };
        }
      );

    /*
     * =====================================================
     * RESPOSTA
     * =====================================================
     */

    return jsonResponse({
      success:
        true,

      message:
        movementType ===
        "ENTRY"
          ? "Entrada de estoque registrada com sucesso."
          : movementType ===
              "EXIT"
            ? "Saída de estoque registrada com sucesso."
            : "Estoque corrigido com sucesso.",

      product:
        result.product,

      movement:
        result.movement,
    });
  } catch (error) {
    /*
     * =====================================================
     * AUTORIZAÇÃO
     * =====================================================
     */

    const authorizationResponse =
      getAuthorizationResponse(
        error
      );

    if (
      authorizationResponse
    ) {
      return authorizationResponse;
    }

    /*
     * =====================================================
     * ERROS DE NEGÓCIO
     * =====================================================
     */

    if (
      error instanceof
        StockConflictError ||
      (
        error instanceof
          Error &&
        error.message ===
          "STOCK_CONFLICT"
      )
    ) {
      return jsonResponse(
        {
          error:
            "O estoque foi alterado por outra operação. Atualize a página e tente novamente.",
        },
        409
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "PRODUCT_NOT_FOUND"
    ) {
      return jsonResponse(
        {
          error:
            "Produto não encontrado.",
        },
        404
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "INSUFFICIENT_STOCK"
    ) {
      return jsonResponse(
        {
          error:
            "A quantidade de saída é maior que o estoque disponível.",
        },
        409
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "STOCK_NOT_CHANGED"
    ) {
      return jsonResponse(
        {
          error:
            "O novo estoque precisa ser diferente do estoque atual.",
        },
        400
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "INVALID_STOCK"
    ) {
      return jsonResponse(
        {
          error:
            "O estoque informado é inválido.",
        },
        400
      );
    }

    /*
     * Não registramos corpo da requisição,
     * cookies ou informações sensíveis.
     */

    console.error(
      "Erro ao movimentar estoque:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível atualizar o estoque.",
      },
      500
    );
  }
}