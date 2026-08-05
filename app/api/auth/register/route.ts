import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Resend } from "resend";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/auth-rate-limit";
import { createEmailVerificationToken } from "@/lib/customer-tokens";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_BODY_SIZE = 16_384;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 72;

type RegisterBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  additionalHeaders?: Record<string, string>
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      ...additionalHeaders,
    },
  });
}

function normalizeName(
  value: unknown
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
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
  if (
    !email ||
    email.length > 254
  ) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function validatePassword(
  value: unknown
) {
  if (typeof value !== "string") {
    return {
      valid: false,
      password: "",
    };
  }

  const password = value;

  const bytes =
    Buffer.byteLength(
      password,
      "utf8"
    );

  if (
    password.length <
      MIN_PASSWORD_LENGTH ||
    bytes >
      MAX_PASSWORD_BYTES
  ) {
    return {
      valid: false,
      password,
    };
  }

  const hasLowercase =
    /[a-z]/.test(password);

  const hasUppercase =
    /[A-Z]/.test(password);

  const hasNumber =
    /\d/.test(password);

  const hasSpecial =
    /[^a-zA-Z0-9]/.test(
      password
    );

  return {
    valid:
      hasLowercase &&
      hasUppercase &&
      hasNumber &&
      hasSpecial,

    password,
  };
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
      "NEXT_PUBLIC_APP_URL não configurada corretamente."
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
      "RESEND_API_KEY não configurada."
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

  verificationUrl.searchParams.set(
    "token",
    token
  );

  const resend =
    getResend();

  const { error } =
    await resend.emails.send({
      from:
        getEmailFrom(),

      to: [email],

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
                  Recebemos uma solicitação para criar
                  sua conta. Para concluir o cadastro,
                  confirme que este endereço de e-mail
                  pertence a você.
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
                  Este link é válido por 24 horas.
                </p>

                <p
                  style="
                    margin:12px 0 0;
                    color:#777067;
                    font-size:13px;
                    line-height:1.6;
                  "
                >
                  Se você não solicitou a criação desta
                  conta, ignore este e-mail. Nenhuma conta
                  será ativada sem a confirmação.
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
            "Requisição muito grande.",
        },
        413
      );
    }

    const rawBody =
      await request.text();

    if (
      rawBody.length === 0 ||
      rawBody.length >
        MAX_BODY_SIZE
    ) {
      return jsonResponse(
        {
          error:
            "Dados de cadastro inválidos.",
        },
        400
      );
    }

    /*
     * =====================================================
     * JSON
     * =====================================================
     */

    let body: RegisterBody;

    try {
      body =
        JSON.parse(
          rawBody
        ) as RegisterBody;
    } catch {
      return jsonResponse(
        {
          error:
            "Dados de cadastro inválidos.",
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
      normalizeName(
        body.name
      );

    const email =
      normalizeEmail(
        body.email
      );

    const {
      valid:
        passwordIsValid,
      password,
    } =
      validatePassword(
        body.password
      );

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
            "Informe seu nome completo.",
        },
        400
      );
    }

    if (
      !isValidEmail(
        email
      )
    ) {
      return jsonResponse(
        {
          error:
            "Informe um e-mail válido.",
        },
        400
      );
    }

    if (
      !passwordIsValid
    ) {
      return jsonResponse(
        {
          error:
            "A senha deve possuir pelo menos 12 caracteres, incluindo letra maiúscula, letra minúscula, número e caractere especial.",
        },
        400
      );
    }

    /*
     * =====================================================
     * RATE LIMIT POR IP
     * =====================================================
     *
     * Impede uma origem de disparar centenas
     * de cadastros/e-mails.
     */

    const clientIp =
      getClientIp(
        request
      );

    const ipRateLimit =
      await consumeRateLimit({
        scope:
          "register-ip",

        identifier:
          clientIp,

        limit: 10,

        windowMs:
          15 *
          60 *
          1000,

        blockMs:
          30 *
          60 *
          1000,
      });

    if (
      !ipRateLimit.allowed
    ) {
      return jsonResponse(
        {
          error:
            "Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.",
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
     * Continua protegendo o endereço mesmo
     * caso o atacante troque de IP.
     */

    const emailRateLimit =
      await consumeRateLimit({
        scope:
          "register-email",

        identifier:
          email,

        limit: 4,

        windowMs:
          15 *
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
      return jsonResponse(
        {
          error:
            "Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.",
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
     * HASH DA SENHA
     * =====================================================
     *
     * Só executamos bcrypt depois do rate limit.
     */

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    /*
     * =====================================================
     * PROCURA USUÁRIO
     * =====================================================
     */

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },

        select: {
          id: true,
          role: true,
          accountStatus:
            true,
        },
      });

    /*
     * Conta ADMIN, ACTIVE ou DISABLED:
     *
     * nunca alteramos senha, nome ou estado.
     *
     * A resposta propositalmente não revela
     * se aquele endereço possui uma conta.
     */

    if (
      existingUser &&
      (
        existingUser.role ===
          "ADMIN" ||
        existingUser.accountStatus ===
          "ACTIVE" ||
        existingUser.accountStatus ===
          "DISABLED"
      )
    ) {
      return jsonResponse({
        success: true,

        message:
          "Se o cadastro puder ser realizado, enviaremos as instruções de confirmação para o e-mail informado.",
      });
    }

    let userId: string;

    /*
     * =====================================================
     * CLIENTE EXISTENTE COMO GUEST/PENDING
     * =====================================================
     */

    if (existingUser) {
      const updatedUser =
        await prisma.user.update({
          where: {
            id:
              existingUser.id,
          },

          data: {
            name,

            password:
              passwordHash,

            accountStatus:
              "PENDING_VERIFICATION",

            emailVerifiedAt:
              null,

            disabledAt:
              null,
          },

          select: {
            id: true,
          },
        });

      userId =
        updatedUser.id;
    } else {
      /*
       * ===================================================
       * CLIENTE NOVO
       * ===================================================
       */

      const createdUser =
        await prisma.user.create({
          data: {
            name,
            email,

            password:
              passwordHash,

            role:
              "USER",

            accountStatus:
              "PENDING_VERIFICATION",
          },

          select: {
            id: true,
          },
        });

      userId =
        createdUser.id;
    }

    /*
     * =====================================================
     * TOKEN DE VERIFICAÇÃO
     * =====================================================
     *
     * createEmailVerificationToken salva somente
     * o hash no banco.
     */

    const {
      token,
    } =
      await createEmailVerificationToken({
        userId,
        email,
      });

    /*
     * =====================================================
     * ENVIO DO E-MAIL
     * =====================================================
     */

    try {
      await sendVerificationEmail({
        email,
        token,
      });
    } catch {
      /*
       * Nunca imprimimos:
       *
       * token
       * e-mail
       * senha
       */
      console.error(
        "Não foi possível enviar o e-mail de confirmação do cadastro."
      );

      return jsonResponse(
        {
          error:
            "Não foi possível enviar o e-mail de confirmação. Tente novamente em alguns minutos.",
        },
        503
      );
    }

    /*
     * =====================================================
     * SUCESSO
     * =====================================================
     *
     * Ainda NÃO existe sessão.
     *
     * O usuário continua:
     *
     * PENDING_VERIFICATION
     *
     * até clicar no link recebido.
     */

    return jsonResponse({
      success: true,

      requiresEmailVerification:
        true,

      message:
        "Cadastro recebido. Verifique seu e-mail para ativar sua conta.",
    });
  } catch (error) {
    /*
     * Não colocamos dados sensíveis nos logs.
     */

    console.error(
      "Erro ao realizar cadastro:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível realizar o cadastro.",
      },
      500
    );
  }
}