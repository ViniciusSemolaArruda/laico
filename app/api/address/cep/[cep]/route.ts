import {
  NextResponse,
} from "next/server";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/auth-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    cep: string;
  }>;
};

type ViaCepResponse = {
  cep?: unknown;
  logradouro?: unknown;
  bairro?: unknown;
  localidade?: unknown;
  uf?: unknown;
  erro?: unknown;
};

const REQUEST_TIMEOUT_MS =
  7_000;

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,

    headers: {
      "Cache-Control":
        status === 200
          ? "public, max-age=86400, stale-while-revalidate=604800"
          : "private, no-store, no-cache, must-revalidate",

      "X-Content-Type-Options":
        "nosniff",

      "Referrer-Policy":
        "no-referrer",
    },
  });
}

function normalizeText(
  value: unknown,
  maximumLength: number
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(
      /[\u0000-\u001F\u007F]/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
}

function normalizeCep(
  value: unknown
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\D/g, "")
    .slice(0, 8);
}

export async function GET(
  request: Request,
  {
    params,
  }: Props
) {
  const clientIp =
    getClientIp(request);

  const rateLimit =
    await consumeRateLimit({
      scope:
        "address-cep-ip",

      identifier:
        clientIp,

      limit: 60,

      windowMs:
        10 * 60 * 1000,

      blockMs:
        15 * 60 * 1000,
    });

  if (!rateLimit.allowed) {
    return jsonResponse(
      {
        error:
          "Muitas consultas de CEP. Aguarde alguns minutos e tente novamente.",
      },
      429
    );
  }

  const {
    cep: rawCep,
  } = await params;

  const cep =
    normalizeCep(rawCep);

  if (
    cep.length !== 8 ||
    /^(\d)\1{7}$/.test(cep)
  ) {
    return jsonResponse(
      {
        error:
          "Informe um CEP válido.",
      },
      400
    );
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT_MS
    );

  try {
    /*
     * O host é fixo e o parâmetro contém apenas
     * oito dígitos. Isso impede transformar esta
     * rota em um proxy para endereços arbitrários.
     */
    const response =
      await fetch(
        `https://viacep.com.br/ws/${cep}/json/`,
        {
          method: "GET",
          cache: "no-store",
          signal:
            controller.signal,
          headers: {
            Accept:
              "application/json",
          },
        }
      );

    if (!response.ok) {
      return jsonResponse(
        {
          error:
            "Não foi possível consultar o CEP agora.",
        },
        502
      );
    }

    const data =
      (await response.json()) as ViaCepResponse;

    if (data.erro === true) {
      return jsonResponse(
        {
          error:
            "CEP não encontrado.",
        },
        404
      );
    }

    const returnedCep =
      normalizeCep(data.cep);

    const street =
      normalizeText(
        data.logradouro,
        150
      );

    const neighborhood =
      normalizeText(
        data.bairro,
        100
      );

    const city =
      normalizeText(
        data.localidade,
        100
      );

    const state =
      normalizeText(
        data.uf,
        2
      ).toUpperCase();

    if (
      returnedCep !== cep ||
      !city ||
      !/^[A-Z]{2}$/.test(state)
    ) {
      return jsonResponse(
        {
          error:
            "O CEP não retornou um endereço válido.",
        },
        502
      );
    }

    return jsonResponse({
      success: true,

      address: {
        cep,
        street,
        neighborhood,
        city,
        state,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name ===
        "AbortError"
    ) {
      return jsonResponse(
        {
          error:
            "A consulta do CEP demorou demais. Tente novamente.",
        },
        504
      );
    }

    console.error(
      "Erro ao consultar CEP:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível consultar o CEP agora.",
      },
      502
    );
  } finally {
    clearTimeout(timeout);
  }
}