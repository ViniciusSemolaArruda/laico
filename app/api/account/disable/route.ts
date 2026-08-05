import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import {
  clearCustomerSessionCookieOnly,
  getCustomerSession,
} from "@/lib/customer-auth";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/auth-rate-limit";

import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

type DisableAccountBody = {
  password?: unknown;
  confirmation?: unknown;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,

    headers: {
      "Cache-Control":
        "private, no-store, no-cache, must-revalidate",

      Pragma: "no-cache",

      "X-Content-Type-Options":
        "nosniff",
    },
  });
}

function isSameOrigin(
  request: Request
) {
  const origin =
    request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    return (
      new URL(origin).origin ===
      new URL(request.url).origin
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
      .get("content-type")
      ?.toLowerCase()
      .includes(
        "application/json"
      ) === true
  );
}

function bodyIsTooLarge(
  request: Request
) {
  const value =
    request.headers.get(
      "content-length"
    );

  if (!value) {
    return false;
  }

  const length =
    Number(value);

  return (
    Number.isFinite(length) &&
    length > 8_192
  );
}

export async function POST(
  request: Request
) {
  try {
    /*
     * =====================================================
     * ORIGEM
     * =====================================================
     */

    if (
      !isSameOrigin(request)
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
      bodyIsTooLarge(request)
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

    /*
     * =====================================================
     * RATE LIMIT
     * =====================================================
     *
     * Desativar uma conta exige novamente a senha.
     * Portanto protegemos essa tentativa contra força bruta.
     */

    const clientIp =
      getClientIp(request);

    const ipLimit =
      await consumeRateLimit({
        scope:
          "disable-account-ip",

        identifier:
          clientIp,

        limit: 15,

        windowMs:
          15 * 60 * 1000,

        blockMs:
          30 * 60 * 1000,
      });

    if (!ipLimit.allowed) {
      return jsonResponse(
        {
          error:
            "Muitas tentativas. Aguarde alguns minutos e tente novamente.",

          retryAfterSeconds:
            ipLimit.retryAfterSeconds,
        },
        429
      );
    }

    const accountLimit =
      await consumeRateLimit({
        scope:
          "disable-account-user",

        identifier:
          session.userId,

        limit: 5,

        windowMs:
          15 * 60 * 1000,

        blockMs:
          30 * 60 * 1000,
      });

    if (
      !accountLimit.allowed
    ) {
      return jsonResponse(
        {
          error:
            "Muitas tentativas. Aguarde alguns minutos e tente novamente.",

          retryAfterSeconds:
            accountLimit.retryAfterSeconds,
        },
        429
      );
    }

    /*
     * =====================================================
     * BODY
     * =====================================================
     */

    let body: DisableAccountBody;

    try {
      body =
        (await request.json()) as DisableAccountBody;
    } catch {
      return jsonResponse(
        {
          error:
            "Dados inválidos.",
        },
        400
      );
    }

    if (
      typeof body.password !==
        "string" ||
      !body.password ||
      Buffer.byteLength(
        body.password,
        "utf8"
      ) > 72
    ) {
      return jsonResponse(
        {
          error:
            "Informe sua senha atual.",
        },
        400
      );
    }

    /*
     * Confirmação deliberada.
     *
     * Evita que uma ação acidental da interface
     * desative a conta imediatamente.
     */
    if (
      body.confirmation !==
      "DESATIVAR"
    ) {
      return jsonResponse(
        {
          error:
            'Digite "DESATIVAR" para confirmar.',
        },
        400
      );
    }

    /*
     * =====================================================
     * CONTA
     * =====================================================
     */

    const user =
      await prisma.user.findFirst({
        where: {
          id:
            session.userId,

          role:
            "USER",

          accountStatus:
            "ACTIVE",

          emailVerifiedAt: {
            not: null,
          },

          disabledAt:
            null,
        },

        select: {
          id: true,
          password: true,
        },
      });

    if (
      !user ||
      !user.password
    ) {
      return jsonResponse(
        {
          error:
            "Não foi possível realizar esta operação.",
        },
        400
      );
    }

    /*
     * =====================================================
     * REAUTENTICAÇÃO
     * =====================================================
     *
     * Estar logado não é suficiente para uma
     * operação sensível como desativar a conta.
     */

    const passwordIsValid =
      await bcrypt.compare(
        body.password,
        user.password
      );

    if (
      !passwordIsValid
    ) {
      return jsonResponse(
        {
          error:
            "Senha atual incorreta.",
        },
        401
      );
    }

    const now =
      new Date();

    /*
     * =====================================================
     * DESATIVAÇÃO ATÔMICA
     * =====================================================
     *
     * NÃO apagamos:
     *
     * - usuário;
     * - pedidos;
     * - pagamentos;
     * - histórico;
     * - endereços utilizados em pedidos.
     *
     * Isso evita destruir registros comerciais.
     */

    const results =
      await prisma.$transaction([
        /*
         * Desativa a própria conta.
         *
         * Incluímos a senha atual no WHERE como
         * proteção adicional contra uma troca
         * concorrente de senha.
         */
        prisma.user.updateMany({
          where: {
            id:
              user.id,

            role:
              "USER",

            accountStatus:
              "ACTIVE",

            disabledAt:
              null,

            password:
              user.password,
          },

          data: {
            accountStatus:
              "DISABLED",

            disabledAt:
              now,
          },
        }),

        /*
         * Revoga TODAS as sessões da conta.
         *
         * Isso inclui outros navegadores,
         * computadores e celulares.
         */
        prisma.customerSession.updateMany({
          where: {
            userId:
              user.id,

            revokedAt:
              null,
          },

          data: {
            revokedAt:
              now,
          },
        }),

        /*
         * Invalida links pendentes de
         * verificação de e-mail.
         */
        prisma.emailVerificationToken.updateMany({
          where: {
            userId:
              user.id,

            usedAt:
              null,
          },

          data: {
            usedAt:
              now,
          },
        }),

        /*
         * Invalida links pendentes de
         * redefinição de senha.
         */
        prisma.passwordResetToken.updateMany({
          where: {
            userId:
              user.id,

            usedAt:
              null,
          },

          data: {
            usedAt:
              now,
          },
        }),
      ]);

    const userUpdate =
      results[0];

    if (
      userUpdate.count !== 1
    ) {
      /*
       * Por segurança o cookie local também
       * deixa de ser considerado confiável.
       */
      await clearCustomerSessionCookieOnly();

      return jsonResponse(
        {
          error:
            "Não foi possível realizar esta operação.",
        },
        409
      );
    }

    /*
     * O registro da sessão já foi revogado no
     * banco. Agora apagamos o cookie HttpOnly
     * deste navegador.
     */
    await clearCustomerSessionCookieOnly();

    return jsonResponse({
      success: true,

      redirect:
        "/entrar?account=disabled",

      message:
        "Sua conta foi desativada com segurança.",
    });
  } catch (error) {
    /*
     * Não registramos:
     *
     * - senha;
     * - cookie;
     * - token;
     * - e-mail;
     * - dados pessoais.
     */
    console.error(
      "Erro ao desativar conta:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível desativar sua conta.",
      },
      500
    );
  }
}