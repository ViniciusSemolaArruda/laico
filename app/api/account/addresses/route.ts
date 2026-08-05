import { NextResponse } from "next/server";

import {
  getCustomerSession,
} from "@/lib/customer-auth";

import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

const MAX_ADDRESSES = 10;

const BRAZILIAN_STATES =
  new Set([
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
  ]);

type AddressBody = {
  name?: unknown;
  cep?: unknown;
  state?: unknown;
  city?: unknown;
  neighborhood?: unknown;
  street?: unknown;
  number?: unknown;
  complement?: unknown;
  isDefault?: unknown;
};

function jsonResponse(
  body: Record<string, unknown>,
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
    .replace(/\s+/g, " ")
    .slice(
      0,
      maximumLength
    );
}

function normalizeDigits(
  value: unknown,
  maximumLength: number
) {
  return normalizeText(
    value,
    maximumLength + 10
  )
    .replace(/\D/g, "")
    .slice(
      0,
      maximumLength
    );
}

function isSameOrigin(
  request: Request
) {
  const origin =
    request.headers.get(
      "origin"
    );

  /*
   * Origin pode não existir em chamadas
   * internas feitas pelo servidor.
   *
   * Quando existir, obrigatoriamente precisa
   * corresponder ao domínio desta aplicação.
   */
  if (!origin) {
    return true;
  }

  try {
    const requestUrl =
      new URL(
        request.url
      );

    return (
      new URL(origin)
        .origin ===
      requestUrl.origin
    );
  } catch {
    return false;
  }
}

function hasJsonContentType(
  request: Request
) {
  const contentType =
    request.headers.get(
      "content-type"
    );

  return (
    contentType
      ?.toLowerCase()
      .includes(
        "application/json"
      ) === true
  );
}

function bodyIsTooLarge(
  request: Request
) {
  const contentLength =
    request.headers.get(
      "content-length"
    );

  if (!contentLength) {
    return false;
  }

  const length =
    Number(contentLength);

  return (
    Number.isFinite(
      length
    ) &&
    length > 16_384
  );
}

/*
 * =========================================================
 * GET
 * =========================================================
 *
 * Retorna somente os endereços do usuário autenticado.
 */

export async function GET() {
  try {
    const session =
      await getCustomerSession();

    if (!session) {
      return jsonResponse(
        {
          error:
            "Você não tem permissão para fazer isso! Acesso negado.",
        },
        401
      );
    }

    const addresses =
      await prisma.address.findMany({
        where: {
          userId:
            session.userId,

          archivedAt:
            null,
        },

        orderBy: [
          {
            isDefault:
              "desc",
          },

          {
            createdAt:
              "desc",
          },
        ],

        select: {
          id: true,
          name: true,
          cep: true,
          state: true,
          city: true,
          neighborhood:
            true,
          street: true,
          number: true,
          complement:
            true,
          isDefault:
            true,
          createdAt:
            true,
          updatedAt:
            true,
        },
      });

    return jsonResponse({
      addresses:
        addresses.map(
          (address) => ({
            ...address,

            createdAt:
              address.createdAt.toISOString(),

            updatedAt:
              address.updatedAt.toISOString(),
          })
        ),
    });
  } catch (error) {
    console.error(
      "Erro ao listar endereços:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível carregar os endereços.",
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
 * Adiciona um novo endereço ao usuário autenticado.
 */

export async function POST(
  request: Request
) {
  try {
    /*
     * Proteção adicional contra requisições
     * cross-site.
     */
    if (
      !isSameOrigin(
        request
      )
    ) {
      return jsonResponse(
        {
          error:
            "Você não tem permissão para fazer isso! Acesso negado.",
        },
        403
      );
    }

    if (
      !hasJsonContentType(
        request
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

    if (
      bodyIsTooLarge(
        request
      )
    ) {
      return jsonResponse(
        {
          error:
            "Requisição muito grande.",
        },
        413
      );
    }

    /*
     * A identidade do usuário vem SOMENTE
     * do cookie de sessão HttpOnly.
     *
     * Nunca aceitamos userId pelo body.
     */
    const session =
      await getCustomerSession();

    if (!session) {
      return jsonResponse(
        {
          error:
            "Você não tem permissão para fazer isso! Acesso negado.",
        },
        401
      );
    }

    let body: AddressBody;

    try {
      body =
        (await request.json()) as AddressBody;
    } catch {
      return jsonResponse(
        {
          error:
            "Dados do endereço inválidos.",
        },
        400
      );
    }

    /*
     * =====================================================
     * NORMALIZAÇÃO
     * =====================================================
     */

    const name =
      normalizeText(
        body.name,
        60
      );

    const cep =
      normalizeDigits(
        body.cep,
        8
      );

    const state =
      normalizeText(
        body.state,
        2
      ).toUpperCase();

    const city =
      normalizeText(
        body.city,
        100
      );

    const neighborhood =
      normalizeText(
        body.neighborhood,
        100
      );

    const street =
      normalizeText(
        body.street,
        150
      );

    const number =
      normalizeText(
        body.number,
        20
      );

    const complement =
      normalizeText(
        body.complement,
        100
      );

    const requestedAsDefault =
      body.isDefault === true;

    /*
     * =====================================================
     * VALIDAÇÃO
     * =====================================================
     */

    if (
      name.length < 2
    ) {
      return jsonResponse(
        {
          error:
            "Informe um nome para identificar o endereço.",
        },
        400
      );
    }

    if (
      cep.length !== 8
    ) {
      return jsonResponse(
        {
          error:
            "Informe um CEP válido com 8 dígitos.",
        },
        400
      );
    }

    if (
      !BRAZILIAN_STATES.has(
        state
      )
    ) {
      return jsonResponse(
        {
          error:
            "Informe um estado válido.",
        },
        400
      );
    }

    if (
      city.length < 2
    ) {
      return jsonResponse(
        {
          error:
            "Informe uma cidade válida.",
        },
        400
      );
    }

    if (
      neighborhood.length <
      2
    ) {
      return jsonResponse(
        {
          error:
            "Informe o bairro.",
        },
        400
      );
    }

    if (
      street.length < 2
    ) {
      return jsonResponse(
        {
          error:
            "Informe a rua ou logradouro.",
        },
        400
      );
    }

    if (!number) {
      return jsonResponse(
        {
          error:
            "Informe o número do endereço.",
        },
        400
      );
    }

    /*
     * =====================================================
     * LIMITE DE ENDEREÇOS
     * =====================================================
     */

    const addressCount =
      await prisma.address.count({
        where: {
          userId:
            session.userId,

          archivedAt:
            null,
        },
      });

    if (
      addressCount >=
      MAX_ADDRESSES
    ) {
      return jsonResponse(
        {
          error:
            `Você pode manter no máximo ${MAX_ADDRESSES} endereços ativos.`,
        },
        400
      );
    }

    /*
     * O primeiro endereço da conta sempre será
     * principal.
     */
    const shouldBeDefault =
      addressCount === 0 ||
      requestedAsDefault;

    const addressData = {
      userId:
        session.userId,

      name,
      cep,
      state,
      city,
      neighborhood,
      street,
      number,

      complement:
        complement ||
        null,

      isDefault:
        shouldBeDefault,

      archivedAt:
        null,
    };

    /*
     * =====================================================
     * CRIAÇÃO
     * =====================================================
     */

    if (
      shouldBeDefault
    ) {
      /*
       * Remover o status principal dos endereços
       * anteriores e criar o novo acontece em uma
       * única transação.
       */
      const results =
        await prisma.$transaction([
          prisma.address.updateMany({
            where: {
              userId:
                session.userId,

              archivedAt:
                null,

              isDefault:
                true,
            },

            data: {
              isDefault:
                false,
            },
          }),

          prisma.address.create({
            data:
              addressData,

            select: {
              id: true,
              name: true,
              cep: true,
              state: true,
              city: true,
              neighborhood:
                true,
              street: true,
              number: true,
              complement:
                true,
              isDefault:
                true,
            },
          }),
        ]);

      const createdAddress =
        results[1];

      return jsonResponse(
        {
          success:
            true,

          address:
            createdAddress,
        },
        201
      );
    }

    const createdAddress =
      await prisma.address.create({
        data:
          addressData,

        select: {
          id: true,
          name: true,
          cep: true,
          state: true,
          city: true,
          neighborhood:
            true,
          street: true,
          number: true,
          complement:
            true,
          isDefault:
            true,
        },
      });

    return jsonResponse(
      {
        success:
          true,

        address:
          createdAddress,
      },
      201
    );
  } catch (error) {
    /*
     * Não imprimimos endereço, CEP, usuário,
     * cookie ou conteúdo da requisição nos logs.
     */
    console.error(
      "Erro ao adicionar endereço:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível adicionar o endereço.",
      },
      500
    );
  }
}