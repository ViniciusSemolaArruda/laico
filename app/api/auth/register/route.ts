import bcrypt from "bcryptjs";
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

const MAX_BODY_SIZE =
  16_384;

const MIN_PASSWORD_LENGTH =
  12;

const MAX_PASSWORD_BYTES =
  72;

type RegisterBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

/*
 * =========================================================
 * RESPOSTA
 * =========================================================
 */

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  additionalHeaders?: Record<
    string,
    string
  >
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

        ...additionalHeaders,
      },
    }
  );
}

/*
 * =========================================================
 * NORMALIZAÇÃO
 * =========================================================
 */

function normalizeName(
  value: unknown
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
    .slice(0, 120);
}

function normalizeEmail(
  value: unknown
) {
  if (
    typeof value !==
    "string"
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

/*
 * =========================================================
 * SENHA
 * =========================================================
 */

function validatePassword(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return {
      valid: false,
      password: "",
    };
  }

  const password =
    value;

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
    /[a-z]/.test(
      password
    );

  const hasUppercase =
    /[A-Z]/.test(
      password
    );

  const hasNumber =
    /\d/.test(
      password
    );

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

/*
 * =========================================================
 * ORIGEM
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
 * ERRO DE E-MAIL JÁ CADASTRADO
 * =========================================================
 *
 * A mesma resposta é utilizada independentemente de
 * a conta estar:
 *
 * - pendente;
 * - ativa;
 * - desativada;
 * - administrativa.
 *
 * Não revelamos o estado interno da conta.
 */

function emailAlreadyRegisteredResponse() {
  return jsonResponse(
    {
      error:
        "Este e-mail já está vinculado a uma conta. Faça login ou recupere sua senha.",

      code:
        "EMAIL_ALREADY_REGISTERED",
    },
    409
  );
}

/*
 * =========================================================
 * PRISMA UNIQUE CONSTRAINT
 * =========================================================
 *
 * Mesmo que duas requisições cheguem praticamente
 * ao mesmo tempo, o @unique do banco continua sendo
 * nossa última barreira.
 */

function isUniqueConstraintError(
  error: unknown
) {
  if (
    typeof error !==
      "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }

  return (
    error.code ===
    "P2002"
  );
}

/*
 * =========================================================
 * URL
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
 * E-MAIL DE CONFIRMAÇÃO
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
                  Recebemos uma solicitação
                  para criar sua conta.

                  Para concluir o cadastro,
                  confirme que este endereço
                  de e-mail pertence a você.
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
                  Este link é válido por
                  24 horas.
                </p>

                <p
                  style="
                    margin:12px 0 0;
                    color:#777067;
                    font-size:13px;
                    line-height:1.6;
                  "
                >
                  Se você não solicitou a
                  criação desta conta,
                  ignore este e-mail.

                  Nenhuma conta será ativada
                  sem a confirmação.
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
            "Requisição muito grande.",
        },
        413
      );
    }

    const rawBody =
      await request.text();

    if (
      rawBody.length ===
        0 ||
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

    let body:
      RegisterBody;

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

        limit:
          10,

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
     */

    const emailRateLimit =
      await consumeRateLimit({
        scope:
          "register-email",

        identifier:
          email,

        limit:
          4,

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
     * PROCURA O E-MAIL ANTES DE ALTERAR QUALQUER COISA
     * =====================================================
     */

    const existingUser =
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
     * E-MAIL JÁ POSSUI CONTA
     * =====================================================
     *
     * MUITO IMPORTANTE:
     *
     * Somente GUEST puro, criado pelo checkout e ainda
     * sem senha, pode ser convertido em cadastro.
     *
     * PENDING_VERIFICATION nunca passa daqui.
     *
     * Portanto, repetir cadastro NÃO consegue substituir
     * nome ou senha de uma conta pendente.
     */

    if (
      existingUser &&
      (
        existingUser.role !==
          "USER" ||
        existingUser.accountStatus !==
          "GUEST" ||
        Boolean(
          existingUser.password
        ) ||
        Boolean(
          existingUser.emailVerifiedAt
        ) ||
        Boolean(
          existingUser.disabledAt
        )
      )
    ) {
      return emailAlreadyRegisteredResponse();
    }

    /*
     * Só depois de saber que:
     *
     * - o usuário é novo;
     * OU
     * - é um GUEST legítimo sem senha;
     *
     * calculamos o hash.
     */

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    let userId:
      string;

    /*
     * =====================================================
     * GUEST → PENDING_VERIFICATION
     * =====================================================
     *
     * Este é o caso importante da compra sem login.
     *
     * O pedido já pertence a este User GUEST.
     * Não criamos outro User.
     *
     * Após a confirmação do e-mail, ele poderá acessar
     * os pedidos antigos pela mesma conta.
     */

    if (existingUser) {
      /*
       * updateMany é intencional.
       *
       * Repetimos TODAS as condições de segurança.
       *
       * Se outra requisição converter o GUEST alguns
       * milissegundos antes desta, count será 0 e NÃO
       * sobrescreveremos a senha criada pela primeira.
       */

      const conversion =
        await prisma.user.updateMany({
          where: {
            id:
              existingUser.id,

            role:
              "USER",

            accountStatus:
              "GUEST",

            password:
              null,

            emailVerifiedAt:
              null,

            disabledAt:
              null,
          },

          data: {
            name,

            password:
              passwordHash,

            accountStatus:
              "PENDING_VERIFICATION",
          },
        });

      if (
        conversion.count !==
        1
      ) {
        return emailAlreadyRegisteredResponse();
      }

      userId =
        existingUser.id;
    } else {
      /*
       * ===================================================
       * CLIENTE COMPLETAMENTE NOVO
       * ===================================================
       */

      try {
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
              id:
                true,
            },
          });

        userId =
          createdUser.id;
      } catch (error) {
        /*
         * Proteção contra corrida:
         *
         * Requisição A:
         * findUnique → não existe
         *
         * Requisição B:
         * findUnique → não existe
         *
         * As duas tentam criar.
         *
         * PostgreSQL/@unique permite apenas uma.
         */

        if (
          isUniqueConstraintError(
            error
          )
        ) {
          return emailAlreadyRegisteredResponse();
        }

        throw error;
      }
    }

    /*
     * =====================================================
     * TOKEN DE VERIFICAÇÃO
     * =====================================================
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
       * Nunca registramos:
       *
       * - e-mail;
       * - token;
       * - senha.
       */

      console.error(
        "Não foi possível enviar o e-mail de confirmação do cadastro."
      );

      return jsonResponse(
        {
          error:
            "Não foi possível enviar o e-mail de confirmação. Vá para o login e solicite um novo e-mail de confirmação.",

          code:
            "EMAIL_VERIFICATION_SEND_FAILED",
        },
        503
      );
    }

    /*
     * =====================================================
     * SUCESSO
     * =====================================================
     */

    return jsonResponse({
      success:
        true,

      requiresEmailVerification:
        true,

      message:
        "Cadastro recebido. Verifique seu e-mail para ativar sua conta.",
    });
  } catch (error) {
    /*
     * Nunca registramos informações sensíveis.
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