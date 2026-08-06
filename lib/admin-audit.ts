import "server-only";

import type {
  AdminModule,
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

/*
 * =========================================================
 * AÇÕES DE AUDITORIA
 * =========================================================
 *
 * Mantemos nomes padronizados para facilitar:
 *
 * - filtros;
 * - histórico;
 * - calendário;
 * - relatórios.
 */

export type AdminAuditAction =
  /*
   * ACESSO
   */
  | "ADMIN_LOGIN"
  | "ADMIN_LOGOUT"
  | "ADMIN_SESSION_REVOKED"

  /*
   * FUNCIONÁRIOS
   */
  | "EMPLOYEE_CREATED"
  | "EMPLOYEE_UPDATED"
  | "EMPLOYEE_REMOVED"
  | "EMPLOYEE_RESTORED"
  | "EMPLOYEE_PASSWORD_RESET"
  | "EMPLOYEE_PERMISSIONS_UPDATED"

  /*
   * PRODUTOS
   */
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_ARCHIVED"
  | "PRODUCT_RESTORED"
  | "PRODUCT_PRICE_CHANGED"
  | "PRODUCT_STOCK_ADJUSTED"
  | "PRODUCT_IMAGE_ADDED"
  | "PRODUCT_IMAGE_REMOVED"
  | "PRODUCT_IMAGES_REORDERED"

  /*
   * PEDIDOS
   */
  | "ORDER_UPDATED"
  | "ORDER_STATUS_CHANGED"
  | "ORDER_TRACKING_UPDATED"
  | "ORDER_CANCELED"

  /*
   * CLIENTES
   */
  | "CUSTOMER_UPDATED"
  | "CUSTOMER_DISABLED"

  /*
   * CATEGORIAS
   */
  | "CATEGORY_CREATED"
  | "CATEGORY_UPDATED"
  | "CATEGORY_ARCHIVED"
  | "CATEGORY_RESTORED"

  /*
   * BANNERS
   */
  | "BANNER_CREATED"
  | "BANNER_UPDATED"
  | "BANNER_ARCHIVED"
  | "BANNER_REORDERED"

  /*
   * CUPONS
   */
  | "COUPON_CREATED"
  | "COUPON_UPDATED"
  | "COUPON_DISABLED"

  /*
   * FINANCEIRO
   */
  | "FINANCE_UPDATED"
  | "REFUND_REQUESTED"
  | "REFUND_COMPLETED"

  /*
   * CONFIGURAÇÕES
   */
  | "SETTINGS_UPDATED";

/*
 * =========================================================
 * INPUT
 * =========================================================
 */

type CreateAdminAuditInput = {
  actorId:
    | string
    | null;

  module:
    AdminModule;

  action:
    AdminAuditAction;

  entityType:
    string;

  entityId?:
    | string
    | null;

  changes?:
    Record<
      string,
      unknown
    >;

  /*
   * Quando uma alteração estiver acontecendo
   * dentro de prisma.$transaction(), passamos
   * o tx aqui.
   *
   * Assim:
   *
   * alteração + auditoria
   *
   * são confirmadas juntas.
   */
  transaction?:
    Prisma.TransactionClient;
};

/*
 * =========================================================
 * DADOS PROIBIDOS
 * =========================================================
 *
 * Mesmo que um programador passe acidentalmente
 * alguma dessas propriedades em `changes`,
 * removemos antes de salvar.
 */

const SENSITIVE_KEYS = [
  "password",
  "senha",

  "passwordhash",
  "senhahash",

  "token",
  "tokenhash",

  "secret",
  "segredo",

  "cookie",

  "authorization",
  "authorizationheader",

  "credential",
  "credentials",

  "accesstoken",
  "refreshtoken",

  "cardtoken",

  "creditcard",
  "cardnumber",

  "cvv",
  "cvc",

  "cpf",

  "document",
  "documento",

  "address",
  "endereco",

  "phone",
  "telefone",
] as const;

/*
 * =========================================================
 * LIMITES
 * =========================================================
 *
 * Impedem que um erro de programação coloque
 * objetos gigantes no histórico.
 */

const MAXIMUM_DEPTH =
  6;

const MAXIMUM_STRING_LENGTH =
  2_000;

const MAXIMUM_ARRAY_ITEMS =
  100;

const MAXIMUM_OBJECT_KEYS =
  100;

/*
 * =========================================================
 * NORMALIZAÇÃO
 * =========================================================
 */

function normalizeAuditText(
  value: string,
  maximumLength:
    number
) {
  return value
    .trim()
    .slice(
      0,
      maximumLength
    );
}

function normalizeKey(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

/*
 * =========================================================
 * VERIFICAR CAMPO SENSÍVEL
 * =========================================================
 */

function isSensitiveKey(
  key: string
) {
  const normalized =
    normalizeKey(
      key
    );

  return SENSITIVE_KEYS.some(
    (
      sensitiveKey
    ) =>
      normalized ===
        sensitiveKey ||
      normalized.includes(
        sensitiveKey
      )
  );
}

/*
 * =========================================================
 * SANITIZAÇÃO RECURSIVA
 * =========================================================
 */

function sanitizeAuditValue(
  value: unknown,
  depth = 0
):
  | Prisma.InputJsonValue
  | null
  | undefined {
  /*
   * Limite de profundidade.
   */

  if (
    depth >
    MAXIMUM_DEPTH
  ) {
    return "[limite de profundidade]";
  }

  /*
   * null
   */

  if (
    value === null
  ) {
    return null;
  }

  /*
   * undefined
   */

  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  /*
   * string
   */

  if (
    typeof value ===
    "string"
  ) {
    return value.slice(
      0,
      MAXIMUM_STRING_LENGTH
    );
  }

  /*
   * number
   */

  if (
    typeof value ===
    "number"
  ) {
    /*
     * JSON não suporta Infinity ou NaN.
     */

    if (
      !Number.isFinite(
        value
      )
    ) {
      return String(
        value
      );
    }

    return value;
  }

  /*
   * boolean
   */

  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  /*
   * bigint
   */

  if (
    typeof value ===
    "bigint"
  ) {
    return value.toString();
  }

  /*
   * Date
   *
   * Sempre armazenamos o instante real.
   * A conversão para Brasília acontece
   * somente na exibição.
   */

  if (
    value instanceof
    Date
  ) {
    return value.toISOString();
  }

  /*
   * Arrays
   */

  if (
    Array.isArray(
      value
    )
  ) {
    const sanitizedArray:
  Array<
    | Prisma.InputJsonValue
    | null
  > = [];

    const limitedArray =
      value.slice(
        0,
        MAXIMUM_ARRAY_ITEMS
      );

    for (
      const item of
      limitedArray
    ) {
      const sanitized =
        sanitizeAuditValue(
          item,
          depth + 1
        );

      if (
        sanitized !==
        undefined
      ) {
        sanitizedArray.push(
          sanitized
        );
      }
    }

    return sanitizedArray;
  }

  /*
   * Objetos
   */

  if (
    typeof value ===
      "object"
  ) {
    /*
     * Alguns tipos como Decimal possuem
     * toJSON/toString próprios.
     *
     * Para objetos normais percorremos
     * somente propriedades enumeráveis.
     */

    const record =
      value as Record<
        string,
        unknown
      >;

    const result:
  Record<
    string,
    | Prisma.InputJsonValue
    | null
  > = {};

    const entries =
      Object.entries(
        record
      ).slice(
        0,
        MAXIMUM_OBJECT_KEYS
      );

    for (
      const [
        key,
        itemValue,
      ] of entries
    ) {
      /*
       * Campo sensível:
       * simplesmente não entra no log.
       */

      if (
        isSensitiveKey(
          key
        )
      ) {
        continue;
      }

      const sanitized =
        sanitizeAuditValue(
          itemValue,
          depth + 1
        );

      if (
        sanitized ===
        undefined
      ) {
        continue;
      }

      result[
        key.slice(
          0,
          100
        )
      ] =
        sanitized;
    }

    /*
     * Decimal do Prisma e outros objetos
     * sem propriedades enumeráveis.
     */

    if (
      Object.keys(
        result
      ).length ===
        0 &&
      "toString" in
        record &&
      typeof record.toString ===
        "function"
    ) {
      const stringValue =
        record.toString();

      if (
        stringValue !==
        "[object Object]"
      ) {
        return stringValue.slice(
          0,
          MAXIMUM_STRING_LENGTH
        );
      }
    }

    return result;
  }

  /*
   * symbol / function etc.
   */

  return undefined;
}

/*
 * =========================================================
 * SANITIZAR CHANGES
 * =========================================================
 */

function sanitizeChanges(
  changes:
    Record<
      string,
      unknown
    >
): Prisma.InputJsonValue {
  const sanitized =
    sanitizeAuditValue(
      changes
    );

  /*
   * changes sempre deve ser um objeto
   * JSON no nível superior.
   */
  if (
    sanitized ===
      undefined ||
    sanitized ===
      null
  ) {
    return {};
  }

  return sanitized;
}

/*
 * =========================================================
 * CRIAR LOG
 * =========================================================
 */

export async function createAdminAuditLog({
  actorId,
  module,
  action,
  entityType,
  entityId = null,
  changes,
  transaction,
}: CreateAdminAuditInput) {
  const normalizedActorId =
    actorId
      ? normalizeAuditText(
          actorId,
          100
        )
      : null;

  const normalizedEntityType =
    normalizeAuditText(
      entityType,
      100
    );

  const normalizedEntityId =
    entityId
      ? normalizeAuditText(
          entityId,
          100
        )
      : null;

  if (
    !normalizedEntityType
  ) {
    throw new Error(
      "ADMIN_AUDIT_INVALID_ENTITY"
    );
  }

  const auditData:
    Prisma.AdminAuditLogCreateInput =
      {
        module,

        action,

        entityType:
          normalizedEntityType,

        entityId:
          normalizedEntityId,

        changes:
          changes
            ? sanitizeChanges(
                changes
              )
            : undefined,

        actor:
          normalizedActorId
            ? {
                connect: {
                  id:
                    normalizedActorId,
                },
              }
            : undefined,
      };

  /*
   * =======================================================
   * DENTRO DE TRANSAÇÃO
   * =======================================================
   */

  if (
    transaction
  ) {
    return transaction.adminAuditLog.create({
      data:
        auditData,

      select: {
        id:
          true,

        actorId:
          true,

        module:
          true,

        action:
          true,

        entityType:
          true,

        entityId:
          true,

        createdAt:
          true,
      },
    });
  }

  /*
   * =======================================================
   * FORA DE TRANSAÇÃO
   * =======================================================
   */

  return prisma.adminAuditLog.create({
    data:
      auditData,

    select: {
      id:
        true,

      actorId:
        true,

      module:
        true,

      action:
        true,

      entityType:
        true,

      entityId:
        true,

      createdAt:
        true,
    },
  });
}

/*
 * =========================================================
 * HORÁRIO DE BRASÍLIA
 * =========================================================
 *
 * O PostgreSQL/Prisma continua armazenando
 * o instante normalmente.
 *
 * Esta função serve somente para apresentação.
 *
 * Não fazemos:
 *
 * date - 3 horas
 *
 * porque isso seria uma conversão frágil.
 */

export function formatAdminAuditDate(
  value:
    | Date
    | string
) {
  const date =
    value instanceof
      Date
      ? value
      : new Date(
          value
        );

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
      timeZone:
        "America/Sao_Paulo",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit",

      hour12:
        false,
    }
  ).format(date);
}

/*
 * =========================================================
 * DIA EM BRASÍLIA
 * =========================================================
 *
 * Útil posteriormente para agrupar o calendário:
 *
 * 06/08/2026
 */

export function formatAdminAuditDay(
  value:
    | Date
    | string
) {
  const date =
    value instanceof
      Date
      ? value
      : new Date(
          value
        );

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
      timeZone:
        "America/Sao_Paulo",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    }
  ).format(date);
}

/*
 * =========================================================
 * HORÁRIO EM BRASÍLIA
 * =========================================================
 */

export function formatAdminAuditTime(
  value:
    | Date
    | string
) {
  const date =
    value instanceof
      Date
      ? value
      : new Date(
          value
        );

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
      timeZone:
        "America/Sao_Paulo",

      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit",

      hour12:
        false,
    }
  ).format(date);
}

/*
 * =========================================================
 * NOMES AMIGÁVEIS DAS AÇÕES
 * =========================================================
 *
 * Usaremos isso na tela de histórico.
 */

export function getAdminAuditActionLabel(
  action:
    AdminAuditAction
) {
  const labels:
    Record<
      AdminAuditAction,
      string
    > = {
    ADMIN_LOGIN:
      "Entrou no sistema",

    ADMIN_LOGOUT:
      "Saiu do sistema",

    ADMIN_SESSION_REVOKED:
      "Sessão encerrada",

    EMPLOYEE_CREATED:
      "Funcionário criado",

    EMPLOYEE_UPDATED:
      "Funcionário atualizado",

    EMPLOYEE_REMOVED:
      "Funcionário removido",

    EMPLOYEE_RESTORED:
      "Funcionário restaurado",

    EMPLOYEE_PASSWORD_RESET:
      "Senha do funcionário redefinida",

    EMPLOYEE_PERMISSIONS_UPDATED:
      "Permissões alteradas",

    PRODUCT_CREATED:
      "Produto criado",

    PRODUCT_UPDATED:
      "Produto atualizado",

    PRODUCT_ARCHIVED:
      "Produto arquivado",

    PRODUCT_RESTORED:
      "Produto restaurado",

    PRODUCT_PRICE_CHANGED:
      "Preço do produto alterado",

    PRODUCT_STOCK_ADJUSTED:
      "Estoque alterado",

    PRODUCT_IMAGE_ADDED:
      "Imagem adicionada",

    PRODUCT_IMAGE_REMOVED:
      "Imagem removida",

    PRODUCT_IMAGES_REORDERED:
      "Imagens reordenadas",

    ORDER_UPDATED:
      "Pedido atualizado",

    ORDER_STATUS_CHANGED:
      "Status do pedido alterado",

    ORDER_TRACKING_UPDATED:
      "Rastreamento atualizado",

    ORDER_CANCELED:
      "Pedido cancelado",

    CUSTOMER_UPDATED:
      "Cliente atualizado",

    CUSTOMER_DISABLED:
      "Cliente desativado",

    CATEGORY_CREATED:
      "Categoria criada",

    CATEGORY_UPDATED:
      "Categoria atualizada",

    CATEGORY_ARCHIVED:
      "Categoria arquivada",

    CATEGORY_RESTORED:
      "Categoria restaurada",

    BANNER_CREATED:
      "Banner criado",

    BANNER_UPDATED:
      "Banner atualizado",

    BANNER_ARCHIVED:
      "Banner arquivado",

    BANNER_REORDERED:
      "Banners reordenados",

    COUPON_CREATED:
      "Cupom criado",

    COUPON_UPDATED:
      "Cupom atualizado",

    COUPON_DISABLED:
      "Cupom desativado",

    FINANCE_UPDATED:
      "Informação financeira atualizada",

    REFUND_REQUESTED:
      "Reembolso solicitado",

    REFUND_COMPLETED:
      "Reembolso concluído",

    SETTINGS_UPDATED:
      "Configurações atualizadas",
  };

  return labels[
    action
  ];
}