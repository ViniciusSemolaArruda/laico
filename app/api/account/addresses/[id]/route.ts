import { NextResponse } from "next/server";

import {
  getCustomerSession,
} from "@/lib/customer-auth";

import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

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

type Props = {
  params: Promise<{
    id: string;
  }>;
};

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

const ADDRESS_FIELDS = [
  "name",
  "cep",
  "state",
  "city",
  "neighborhood",
  "street",
  "number",
  "complement",
] as const;

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
  return (
    request.headers
      .get(
        "content-type"
      )
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
    Number(
      contentLength
    );

  return (
    Number.isFinite(
      length
    ) &&
    length > 16_384
  );
}

function hasOwn(
  object: object,
  property: string
) {
  return Object.prototype.hasOwnProperty.call(
    object,
    property
  );
}

function isValidAddressId(
  value: string
) {
  return /^[a-zA-Z0-9_-]{10,100}$/.test(
    value
  );
}

/*
 * =========================================================
 * PATCH
 * =========================================================
 *
 * Editar endereço ou torná-lo principal.
 */

export async function PATCH(
  request: Request,
  { params }: Props
) {
  try {
    /*
     * =====================================================
     * SEGURANÇA DA REQUISIÇÃO
     * =====================================================
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
     * =====================================================
     * SESSÃO
     * =====================================================
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

    const { id } =
      await params;

    if (
      !id ||
      !isValidAddressId(
        id
      )
    ) {
      return jsonResponse(
        {
          error:
            "Endereço não encontrado.",
        },
        404
      );
    }

    /*
     * A consulta contém simultaneamente:
     *
     * - id do endereço;
     * - userId da sessão;
     * - endereço não arquivado.
     *
     * Portanto conhecer o ID de um endereço
     * de outra pessoa não concede acesso.
     */
    const existingAddress =
      await prisma.address.findFirst({
        where: {
          id,

          userId:
            session.userId,

          archivedAt:
            null,
        },

        select: {
          id: true,
          userId: true,
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

          _count: {
            select: {
              orders:
                true,
            },
          },
        },
      });

    /*
     * A mesma resposta é usada para:
     *
     * - ID inexistente;
     * - endereço arquivado;
     * - endereço de outra conta.
     *
     * Assim não revelamos a existência de
     * registros pertencentes a terceiros.
     */
    if (
      !existingAddress
    ) {
      return jsonResponse(
        {
          error:
            "Endereço não encontrado.",
        },
        404
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
     * Verifica se o usuário realmente está
     * tentando alterar algum dado do endereço.
     */
    const hasAddressChanges =
      ADDRESS_FIELDS.some(
        (field) =>
          hasOwn(
            body,
            field
          )
      );

    const makeDefault =
      body.isDefault ===
      true;

    if (
      !hasAddressChanges &&
      !makeDefault
    ) {
      return jsonResponse(
        {
          success:
            true,

          updated:
            false,

          message:
            "Nenhuma alteração foi identificada.",
        }
      );
    }

    /*
     * =====================================================
     * DADOS FINAIS
     * =====================================================
     *
     * PATCH permite alteração parcial.
     *
     * Campos não enviados permanecem com os
     * valores atuais.
     */

    const name =
      hasOwn(
        body,
        "name"
      )
        ? normalizeText(
            body.name,
            60
          )
        : existingAddress.name;

    const cep =
      hasOwn(
        body,
        "cep"
      )
        ? normalizeDigits(
            body.cep,
            8
          )
        : existingAddress.cep;

    const state =
      hasOwn(
        body,
        "state"
      )
        ? normalizeText(
            body.state,
            2
          ).toUpperCase()
        : existingAddress.state;

    const city =
      hasOwn(
        body,
        "city"
      )
        ? normalizeText(
            body.city,
            100
          )
        : existingAddress.city;

    const neighborhood =
      hasOwn(
        body,
        "neighborhood"
      )
        ? normalizeText(
            body.neighborhood,
            100
          )
        : existingAddress.neighborhood;

    const street =
      hasOwn(
        body,
        "street"
      )
        ? normalizeText(
            body.street,
            150
          )
        : existingAddress.street;

    const number =
      hasOwn(
        body,
        "number"
      )
        ? normalizeText(
            body.number,
            20
          )
        : existingAddress.number;

    const complement =
      hasOwn(
        body,
        "complement"
      )
        ? normalizeText(
            body.complement,
            100
          )
        : existingAddress.complement ??
          "";

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
     * Detecta se algum dado real do endereço
     * mudou.
     */
    const dataChanged =
      name !==
        existingAddress.name ||
      cep !==
        existingAddress.cep ||
      state !==
        existingAddress.state ||
      city !==
        existingAddress.city ||
      neighborhood !==
        existingAddress.neighborhood ||
      street !==
        existingAddress.street ||
      number !==
        existingAddress.number ||
      complement !==
        (existingAddress.complement ??
          "");

    /*
     * =====================================================
     * APENAS TORNAR PRINCIPAL
     * =====================================================
     */

    if (
      !dataChanged &&
      makeDefault
    ) {
      if (
        existingAddress.isDefault
      ) {
        return jsonResponse({
          success:
            true,

          updated:
            false,

          message:
            "Este endereço já é o principal.",
        });
      }

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

        prisma.address.update({
          where: {
            id:
              existingAddress.id,
          },

          data: {
            isDefault:
              true,
          },
        }),
      ]);

      return jsonResponse({
        success:
          true,

        updated:
          true,

        message:
          "Endereço principal atualizado.",
      });
    }

    /*
     * Se nenhum valor realmente mudou,
     * encerramos aqui.
     */
    if (!dataChanged) {
      return jsonResponse({
        success:
          true,

        updated:
          false,

        message:
          "Nenhuma alteração foi identificada.",
      });
    }

    /*
     * =====================================================
     * ENDEREÇO UTILIZADO EM PEDIDO
     * =====================================================
     *
     * NUNCA alteramos os dados de um endereço
     * já associado a um pedido.
     *
     * O original é arquivado e preservado.
     * Uma nova cópia editada é criada.
     */

    if (
      existingAddress
        ._count.orders > 0
    ) {
      const newAddressIsDefault =
        existingAddress.isDefault ||
        makeDefault;

      const newAddressData = {
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
          newAddressIsDefault,

        archivedAt:
          null,
      };

      if (
        newAddressIsDefault
      ) {
        const results =
          await prisma.$transaction([
            /*
             * Nenhum endereço ativo permanece
             * como principal.
             */
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

            /*
             * O endereço histórico é arquivado
             * sem alterar rua, número, CEP etc.
             */
            prisma.address.update({
              where: {
                id:
                  existingAddress.id,
              },

              data: {
                archivedAt:
                  new Date(),

                isDefault:
                  false,
              },
            }),

            prisma.address.create({
              data:
                newAddressData,

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

        return jsonResponse({
          success:
            true,

          updated:
            true,

          address:
            results[2],

          message:
            "Endereço atualizado com sucesso.",
        });
      }

      const results =
        await prisma.$transaction([
          prisma.address.update({
            where: {
              id:
                existingAddress.id,
            },

            data: {
              archivedAt:
                new Date(),

              isDefault:
                false,
            },
          }),

          prisma.address.create({
            data:
              newAddressData,

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

      return jsonResponse({
        success:
          true,

        updated:
          true,

        address:
          results[1],

        message:
          "Endereço atualizado com sucesso.",
      });
    }

    /*
     * =====================================================
     * ENDEREÇO SEM PEDIDOS
     * =====================================================
     *
     * Como ele nunca foi usado em um pedido,
     * pode ser alterado diretamente.
     */

    if (
      makeDefault &&
      !existingAddress.isDefault
    ) {
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

          prisma.address.update({
            where: {
              id:
                existingAddress.id,
            },

            data: {
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
                true,
            },

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

      return jsonResponse({
        success:
          true,

        updated:
          true,

        address:
          results[1],

        message:
          "Endereço atualizado com sucesso.",
      });
    }

    const updatedAddress =
      await prisma.address.update({
        where: {
          id:
            existingAddress.id,
        },

        data: {
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
        },

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

    return jsonResponse({
      success:
        true,

      updated:
        true,

      address:
        updatedAddress,

      message:
        "Endereço atualizado com sucesso.",
    });
  } catch (error) {
    console.error(
      "Erro ao atualizar endereço:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível atualizar o endereço.",
      },
      500
    );
  }
}

/*
 * =========================================================
 * DELETE
 * =========================================================
 *
 * "Excluir" significa ARQUIVAR.
 *
 * Nunca apagamos fisicamente o endereço.
 */

export async function DELETE(
  request: Request,
  { params }: Props
) {
  try {
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

    const { id } =
      await params;

    if (
      !id ||
      !isValidAddressId(
        id
      )
    ) {
      return jsonResponse(
        {
          error:
            "Endereço não encontrado.",
        },
        404
      );
    }

    /*
     * Busca SOMENTE um endereço pertencente
     * ao usuário da sessão.
     */
    const address =
      await prisma.address.findFirst({
        where: {
          id,

          userId:
            session.userId,

          archivedAt:
            null,
        },

        select: {
          id: true,
          isDefault:
            true,
        },
      });

    if (!address) {
      return jsonResponse(
        {
          error:
            "Endereço não encontrado.",
        },
        404
      );
    }

    /*
     * =====================================================
     * NÃO É O PRINCIPAL
     * =====================================================
     */

    if (
      !address.isDefault
    ) {
      await prisma.address.updateMany({
        where: {
          id:
            address.id,

          userId:
            session.userId,

          archivedAt:
            null,
        },

        data: {
          archivedAt:
            new Date(),

          isDefault:
            false,
        },
      });

      return jsonResponse({
        success:
          true,

        message:
          "Endereço removido com sucesso.",
      });
    }

    /*
     * =====================================================
     * ENDEREÇO PRINCIPAL
     * =====================================================
     *
     * Se houver outro endereço, ele passa a ser
     * automaticamente o principal.
     */

    const replacement =
      await prisma.address.findFirst({
        where: {
          userId:
            session.userId,

          archivedAt:
            null,

          id: {
            not:
              address.id,
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },

        select: {
          id: true,
        },
      });

    if (replacement) {
      await prisma.$transaction([
        prisma.address.updateMany({
          where: {
            id:
              address.id,

            userId:
              session.userId,

            archivedAt:
              null,
          },

          data: {
            archivedAt:
              new Date(),

            isDefault:
              false,
          },
        }),

        prisma.address.updateMany({
          where: {
            id:
              replacement.id,

            userId:
              session.userId,

            archivedAt:
              null,
          },

          data: {
            isDefault:
              true,
          },
        }),
      ]);
    } else {
      /*
       * Se era o único endereço, simplesmente
       * arquivamos.
       */
      await prisma.address.updateMany({
        where: {
          id:
            address.id,

          userId:
            session.userId,

          archivedAt:
            null,
        },

        data: {
          archivedAt:
            new Date(),

          isDefault:
            false,
        },
      });
    }

    return jsonResponse({
      success:
        true,

      message:
        "Endereço removido com sucesso.",
    });
  } catch (error) {
    /*
     * Não registramos endereço, CEP,
     * cookie ou conteúdo enviado.
     */
    console.error(
      "Erro ao remover endereço:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível remover o endereço.",
      },
      500
    );
  }
}