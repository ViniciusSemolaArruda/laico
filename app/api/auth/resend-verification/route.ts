import { NextResponse } from "next/server";
import { Resend } from "resend";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/auth-rate-limit";

import {
  createEmailVerificationToken,
} from "@/lib/customer-tokens";

import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

const MAX_BODY_SIZE = 4096;

type ResendVerificationBody = {
  email?: unknown;
};

/*
 * =========================================================
 * RESPOSTA JSON
 * =========================================================
 */

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  headers?: Record<string, string>
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate",

        Pragma:
          "no-cache",

        "X-Content-Type-Options":
          "nosniff",

        ...headers,
      },
    }
  );
}

/*
 * =========================================================
 * NORMALIZAÇÃO
 * =========================================================
 */

function normalizeEmail(
  value: unknown
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .slice(0, 254);
}

function isValidEmail(
  email: string
) {
  return (
    email.length > 3 &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  );
}

/*
 * =========================================================
 * PROTEÇÃO DE ORIGEM
 * =========================================================
 */

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
 * RESPOSTA GENÉRICA
 * =========================================================
 *
 * É proposital.
 *
 * Não informamos se:
 *
 * - a conta existe;
 * - o e-mail já foi confirmado;
 * - a conta está desativada;
 * - o cadastro está pendente.
 */

function genericSuccessResponse() {
  return jsonResponse({
    success:
      true,

    message:
      "Se existir uma conta aguardando confirmação para este e-mail, enviaremos um novo link de confirmação.",
  });
}

/*
 * =========================================================
 * URL DO SITE
 * =========================================================
 */

function getAppUrl() {
  const configuredUrl =
    process.env
      .NEXT_PUBLIC_APP_URL
      ?.trim();

  if (configuredUrl) {
    try {
      const url =
        new URL(
          configuredUrl
        );

      if (
        url.protocol ===
          "https:" ||
        (
          process.env
            .NODE_ENV !==
            "production" &&
          url.protocol ===
            "http:"
        )
      ) {
        return url.origin;
      }
    } catch {
      // Continua abaixo.
    }
  }

  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL_INVALID"
    );
  }

  return "http://localhost:3000";
}

/*
 * =========================================================
 * RESEND
 * =========================================================
 */

function getResend() {
  const apiKey =
    process.env
      .RESEND_API_KEY
      ?.trim();

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY_NOT_CONFIGURED"
    );
  }

  return new Resend(
    apiKey
  );
}

function getEmailFrom() {
  const emailFrom =
    process.env
      .EMAIL_FROM
      ?.trim();

  if (!emailFrom) {
    throw new Error(
      "EMAIL_FROM_NOT_CONFIGURED"
    );
  }

  return emailFrom;
}

/*
 * =========================================================
 * ENVIO DO E-MAIL
 * =========================================================
 */

async function sendVerificationEmail({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const verificationUrl =
    new URL(
      "/verificar-email",
      getAppUrl()
    );

  verificationUrl
    .searchParams
    .set(
      "token",
      token
    );

  const resend =
    getResend();

  const {
    error,
  } =
    await resend.emails.send({
      from:
        getEmailFrom(),

      to: [
        email,
      ],

      subject:
        "Confirme seu e-mail - Laico",

      html: `
        <!doctype html>

        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />

            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />
          </head>

          <body
            style="
              margin:0;
              padding:0;
              background:#f5f1e8;
              font-family:Arial,Helvetica,sans-serif;
              color:#20170f;
            "
          >
            <table
              role="presentation"
              width="100%"
              cellspacing="0"
              cellpadding="0"
              border="0"
            >
              <tr>
                <td
                  align="center"
                  style="
                    padding:40px 16px;
                  "
                >
                  <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                      max-width:600px;
                      background:#ffffff;
                      border:1px solid #e8dcc2;
                      border-radius:16px;
                    "
                  >
                    <tr>
                      <td
                        style="
                          padding:36px;
                        "
                      >
                        <div
                          style="
                            color:#b98218;
                            font-size:14px;
                            font-weight:bold;
                            text-transform:uppercase;
                            letter-spacing:1px;
                          "
                        >
                          E-commerce Laico
                        </div>

                        <h1
                          style="
                            margin:16px 0 12px;
                            font-size:28px;
                            line-height:1.2;
                            color:#20170f;
                          "
                        >
                          Confirme seu e-mail
                        </h1>

                        <p
                          style="
                            margin:0 0 24px;
                            color:#5f574f;
                            font-size:16px;
                            line-height:1.6;
                          "
                        >
                          Você solicitou um novo
                          link para confirmar sua
                          conta na Laico.
                        </p>

                        <p
                          style="
                            margin:0 0 24px;
                            color:#5f574f;
                            font-size:16px;
                            line-height:1.6;
                          "
                        >
                          Clique no botão abaixo
                          para confirmar seu
                          endereço de e-mail e
                          concluir a ativação da
                          sua conta.
                        </p>

                        <a
                          href="${verificationUrl.toString()}"
                          style="
                            display:inline-block;
                            padding:14px 24px;
                            background:#b98218;
                            color:#ffffff;
                            text-decoration:none;
                            border-radius:10px;
                            font-weight:bold;
                          "
                        >
                          Confirmar meu e-mail
                        </a>

                        <p
                          style="
                            margin:24px 0 0;
                            color:#777067;
                            font-size:13px;
                            line-height:1.6;
                          "
                        >
                          Este link possui
                          validade limitada.
                        </p>

                        <p
                          style="
                            margin:12px 0 0;
                            color:#777067;
                            font-size:13px;
                            line-height:1.6;
                          "
                        >
                          Se você não solicitou
                          este e-mail, pode
                          ignorá-lo com segurança.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

  if (error) {
    throw new Error(
      "EMAIL_SEND_FAILED"
    );
  }
}

/*
 * =========================================================
 * POST
 * =========================================================
 */

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
        ) ?? "0"
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
            "Requisição inválida.",
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
      return genericSuccessResponse();
    }

    /*
     * =====================================================
     * JSON
     * =====================================================
     */

    let body:
      ResendVerificationBody;

    try {
      body =
        JSON.parse(
          rawBody
        ) as ResendVerificationBody;
    } catch {
      return genericSuccessResponse();
    }

    const email =
      normalizeEmail(
        body.email
      );

    /*
     * Mesmo um e-mail inválido recebe uma
     * resposta genérica.
     */

    if (
      !isValidEmail(
        email
      )
    ) {
      return genericSuccessResponse();
    }

    /*
     * =====================================================
     * RATE LIMIT POR IP
     * =====================================================
     *
     * Impede que uma única origem utilize
     * nosso sistema para enviar e-mails em massa.
     */

    const clientIp =
      getClientIp(
        request
      );

    const ipRateLimit =
      await consumeRateLimit({
        scope:
          "resend-verification-ip",

        identifier:
          clientIp,

        limit:
          10,

        windowMs:
          60 *
          60 *
          1000,

        blockMs:
          60 *
          60 *
          1000,
      });

    if (
      !ipRateLimit.allowed
    ) {
      return jsonResponse(
        {
          error:
            "Muitas solicitações. Aguarde alguns minutos antes de tentar novamente.",
        },
        429,
        {
          "Retry-After":
            String(
              ipRateLimit
                .retryAfterSeconds
            ),
        }
      );
    }

    /*
     * =====================================================
     * RATE LIMIT POR E-MAIL
     * =====================================================
     *
     * No máximo 3 solicitações por hora
     * para o mesmo endereço.
     */

    const emailRateLimit =
      await consumeRateLimit({
        scope:
          "resend-verification-email",

        identifier:
          email,

        limit:
          3,

        windowMs:
          60 *
          60 *
          1000,

        blockMs:
          60 *
          60 *
          1000,
      });

    if (
      !emailRateLimit.allowed
    ) {
      return jsonResponse(
        {
          error:
            "Muitas solicitações. Aguarde alguns minutos antes de tentar novamente.",
        },
        429,
        {
          "Retry-After":
            String(
              emailRateLimit
                .retryAfterSeconds
            ),
        }
      );
    }

    /*
     * =====================================================
     * USUÁRIO
     * =====================================================
     */

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },

        select: {
          id:
            true,

          role:
            true,

          password:
            true,

          accountStatus:
            true,

          emailVerifiedAt:
            true,

          disabledAt:
            true,
        },
      });

    /*
     * =====================================================
     * CONTA ELEGÍVEL
     * =====================================================
     *
     * Não retornamos erro se não for elegível.
     *
     * Isso impede alguém de usar esta API
     * para descobrir quais e-mails possuem
     * cadastro no site.
     */

    const canReceiveVerificationEmail =
      Boolean(
        user &&
          user.role ===
            "USER" &&
          user.password &&
          !user.emailVerifiedAt &&
          !user.disabledAt &&
          user.accountStatus ===
            "PENDING_VERIFICATION"
      );

    if (
      !canReceiveVerificationEmail ||
      !user
    ) {
      return genericSuccessResponse();
    }

    /*
     * =====================================================
     * NOVO TOKEN
     * =====================================================
     *
     * O token puro:
     *
     * - não é salvo no banco;
     * - não aparece nos logs;
     * - não é devolvido no JSON.
     *
     * O helper armazena somente seu hash.
     */

    const {
      token,
    } =
      await createEmailVerificationToken({
        userId:
          user.id,

        email,
      });

    /*
     * =====================================================
     * ENVIO
     * =====================================================
     */

    try {
      await sendVerificationEmail({
        email,
        token,
      });
    } catch {
      /*
       * Não registramos:
       *
       * - e-mail;
       * - token;
       * - dados da conta.
       */

      console.error(
        "Falha ao reenviar e-mail de confirmação."
      );

      /*
       * Também retornamos resposta genérica.
       *
       * Isso evita que uma falha do provedor
       * revele que determinado e-mail possui
       * uma conta pendente.
       */

      return genericSuccessResponse();
    }

    /*
     * =====================================================
     * INVALIDAR LINKS ANTIGOS
     * =====================================================
     *
     * O token recém-criado é o mais recente.
     *
     * Depois do envio bem-sucedido, marcamos
     * os tokens anteriores como utilizados.
     *
     * Dessa forma, o cliente deve utilizar
     * somente o link mais recente recebido.
     */

    const newestToken =
      await prisma.emailVerificationToken.findFirst({
        where: {
          userId:
            user.id,

          email,

          usedAt:
            null,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        select: {
          id:
            true,
        },
      });

    if (newestToken) {
      await prisma.emailVerificationToken.updateMany({
        where: {
          userId:
            user.id,

          email,

          usedAt:
            null,

          id: {
            not:
              newestToken.id,
          },
        },

        data: {
          usedAt:
            new Date(),
        },
      });
    }

    /*
     * =====================================================
     * SUCESSO
     * =====================================================
     */

    return genericSuccessResponse();
  } catch (error) {
    /*
     * Não logamos:
     *
     * - e-mail;
     * - token;
     * - cookie;
     * - corpo da requisição.
     */

    console.error(
      "Erro no reenvio da confirmação:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível processar a solicitação agora. Tente novamente mais tarde.",
      },
      500
    );
  }
}