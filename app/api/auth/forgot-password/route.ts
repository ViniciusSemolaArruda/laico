import { NextResponse } from "next/server";
import { Resend } from "resend";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/auth-rate-limit";

import {
  createPasswordResetToken,
} from "@/lib/customer-tokens";

import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

const MAX_BODY_SIZE = 4096;

type ForgotPasswordBody = {
  email?: unknown;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  headers?: Record<string, string>
) {
  return NextResponse.json(body, {
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
  });
}

function successResponse() {
  /*
   * Mesma mensagem exista ou não uma conta.
   */
  return jsonResponse({
    success: true,

    message:
      "Se existir uma conta válida para este e-mail, enviaremos as instruções para redefinir a senha.",
  });
}

function normalizeEmail(
  value: unknown
) {
  if (typeof value !== "string") {
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
      new URL(request.url)
        .origin
    );
  } catch {
    return false;
  }
}

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
          process.env.NODE_ENV !==
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
  return (
    process.env
      .CUSTOMER_EMAIL_FROM
      ?.trim() ||
    "Laico <noreply@conta.capadociaproducoes.com.br>"
  );
}

async function sendPasswordResetEmail({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const resetUrl =
    new URL(
      "/redefinir-senha",
      getAppUrl()
    );

  resetUrl.searchParams.set(
    "token",
    token
  );

  const { error } =
    await getResend().emails.send({
      from:
        getEmailFrom(),

      to: [email],

      subject:
        "Redefinição de senha - Laico",

      html: `
<!doctype html>
<html lang="pt-BR">
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
          style="padding:40px 16px;"
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
                style="padding:36px;"
              >
                <div
                  style="
                    color:#b98218;
                    font-size:14px;
                    font-weight:bold;
                  "
                >
                  E-COMMERCE LAICO
                </div>

                <h1
                  style="
                    margin:16px 0 12px;
                    font-size:28px;
                  "
                >
                  Redefinir sua senha
                </h1>

                <p
                  style="
                    color:#5f574f;
                    line-height:1.6;
                  "
                >
                  Recebemos uma solicitação para
                  redefinir a senha da sua conta.
                </p>

                <a
                  href="${resetUrl.toString()}"
                  style="
                    display:inline-block;
                    margin-top:16px;
                    padding:14px 24px;
                    background:#b98218;
                    color:#ffffff;
                    text-decoration:none;
                    border-radius:10px;
                    font-weight:bold;
                  "
                >
                  Criar nova senha
                </a>

                <p
                  style="
                    margin-top:24px;
                    color:#777067;
                    font-size:13px;
                    line-height:1.6;
                  "
                >
                  Este link é válido por 1 hora
                  e pode ser utilizado apenas uma vez.
                </p>

                <p
                  style="
                    color:#777067;
                    font-size:13px;
                    line-height:1.6;
                  "
                >
                  Se você não solicitou esta alteração,
                  ignore este e-mail. Sua senha continuará
                  a mesma.
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
      "PASSWORD_RESET_EMAIL_FAILED"
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    if (!isSameOrigin(request)) {
      return jsonResponse(
        {
          error:
            "Você não tem permissão para fazer isso! Acesso negado.",
        },
        403
      );
    }

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

    const rawBody =
      await request.text();

    if (
      !rawBody ||
      rawBody.length >
        MAX_BODY_SIZE
    ) {
      /*
       * Também utilizamos resposta genérica aqui.
       */
      return successResponse();
    }

    let body: ForgotPasswordBody;

    try {
      body =
        JSON.parse(
          rawBody
        ) as ForgotPasswordBody;
    } catch {
      return successResponse();
    }

    const email =
      normalizeEmail(
        body.email
      );

    /*
     * E-mail sintaticamente inválido também
     * recebe resposta genérica.
     */
    if (!isValidEmail(email)) {
      return successResponse();
    }

    /*
     * RATE LIMIT POR IP
     */

    const ipRateLimit =
      await consumeRateLimit({
        scope:
          "forgot-password-ip",

        identifier:
          getClientIp(
            request
          ),

        limit: 10,

        windowMs:
          30 *
          60 *
          1000,

        blockMs:
          30 *
          60 *
          1000,
      });

    if (!ipRateLimit.allowed) {
      return jsonResponse(
        {
          error:
            "Muitas solicitações. Aguarde alguns minutos e tente novamente.",
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
     * RATE LIMIT POR E-MAIL
     */

    const emailRateLimit =
      await consumeRateLimit({
        scope:
          "forgot-password-email",

        identifier:
          email,

        limit: 3,

        windowMs:
          30 *
          60 *
          1000,

        blockMs:
          30 *
          60 *
          1000,
      });

    if (
      !emailRateLimit.allowed
    ) {
      /*
       * Para não facilitar enumeração,
       * não informamos que aquele e-mail
       * atingiu especificamente seu limite.
       */
      return successResponse();
    }

    /*
     * Somente conta USER ativa e confirmada
     * pode receber recuperação.
     */

    const user =
      await prisma.user.findFirst({
        where: {
          email,

          role:
            "USER",

          accountStatus:
            "ACTIVE",

          emailVerifiedAt: {
            not: null,
          },

          disabledAt:
            null,

          password: {
            not: null,
          },
        },

        select: {
          id: true,
          email: true,
        },
      });

    /*
     * Não existe conta elegível:
     * mesma resposta de sucesso.
     */

    if (!user) {
      return successResponse();
    }

    /*
     * Cria token:
     *
     * - 256 bits aleatórios;
     * - somente hash no banco;
     * - expiração de 1 hora;
     * - invalida reset anterior.
     */

    const { token } =
      await createPasswordResetToken(
        user.id
      );

    try {
      await sendPasswordResetEmail({
        email:
          user.email,

        token,
      });
    } catch {
      /*
       * Não revelamos falha específica para
       * não confirmar que o endereço existe.
       *
       * Também não imprimimos e-mail/token.
       */

      console.error(
        "Falha ao enviar e-mail de recuperação de senha."
      );
    }

    return successResponse();
  } catch (error) {
    console.error(
      "Erro na recuperação de senha:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    /*
     * Continuamos com resposta genérica.
     */
    return successResponse();
  }
}