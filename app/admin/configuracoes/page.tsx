import AdminShell from "@/app/components/admin/AdminShell";

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  PackageCheck,
  Plug,
  Settings,
  ShieldCheck,
  Truck,
  Unplug,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

import {
  getMelhorEnvioConnectionStatus,
} from "@/lib/shipping/melhor-envio-oauth";

export const dynamic =
  "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    shipping_connected?:
      string;

    shipping_disconnected?:
      string;

    shipping_error?:
      string;
  }>;
};

/*
 * =========================================================
 * FORMATAÇÃO
 * =========================================================
 */

function formatDate(
  value: Date | null
) {
  if (!value) {
    return "Nunca";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",

      timeZone:
        "America/Sao_Paulo",
    }
  ).format(
    value
  );
}

function formatCep(
  value:
    string |
    undefined
) {
  const digits =
    value?.replace(
      /\D/g,
      ""
    ) ?? "";

  if (
    digits.length !==
    8
  ) {
    return "Não configurado";
  }

  return `${digits.slice(
    0,
    5
  )}-${digits.slice(
    5
  )}`;
}

function formatPrice(
  value:
    string |
    undefined
) {
  const numberValue =
    Number(
      value
    );

  if (
    !Number.isFinite(
      numberValue
    )
  ) {
    return "Não configurado";
  }

  return numberValue
    .toLocaleString(
      "pt-BR",
      {
        style:
          "currency",

        currency:
          "BRL",
      }
    );
}

/*
 * =========================================================
 * PÁGINA
 * =========================================================
 */

export default async function AdminSettingsPage({
  searchParams,
}: PageProps) {
  /*
   * =====================================================
   * AUTORIZAÇÃO
   * =====================================================
   */

  let session:
    Awaited<
      ReturnType<
        typeof requireAdminPermission
      >
    >;

  try {
    session =
      await requireAdminPermission(
        "SETTINGS",
        "VIEW"
      );
  } catch (error) {
    if (
      error instanceof
        Error &&
      error.message ===
        "ADMIN_UNAUTHORIZED"
    ) {
      redirect(
        "/admin/login?redirect=/admin/configuracoes"
      );
    }

    if (
      error instanceof
        Error &&
      error.message ===
        "ADMIN_FORBIDDEN"
    ) {
      redirect(
        "/admin/acesso-negado?redirect=/admin/configuracoes"
      );
    }

    throw error;
  }

  const parameters =
    await searchParams;

  const connectedMessage =
    parameters
      .shipping_connected ===
    "true";

  const disconnectedMessage =
    parameters
      .shipping_disconnected ===
    "true";

  const errorMessage =
    typeof parameters
      .shipping_error ===
      "string" &&
    parameters
      .shipping_error
      .length <=
      300
      ? parameters
          .shipping_error
      : null;

  /*
   * =====================================================
   * MELHOR ENVIO
   * =====================================================
   */

  let connection:
    Awaited<
      ReturnType<
        typeof getMelhorEnvioConnectionStatus
      >
    >;

  try {
    connection =
      await getMelhorEnvioConnectionStatus();
  } catch {
    connection = {
      connected:
        false,
    };
  }

  const environment =
    process.env
      .MELHOR_ENVIO_ENV ===
    "production"
      ? "Produção"
      : "Sandbox";

  const originCep =
    formatCep(
      process.env
        .SHIPPING_ORIGIN_CEP
    );

  const freeShippingMinimum =
    formatPrice(
      process.env
        .FREE_SHIPPING_MINIMUM
    );

  return (
    <AdminShell title="Configurações">
      <div className="mx-auto w-full max-w-[1200px] space-y-7">
        {/* CABEÇALHO */}

        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff8e8] text-[#b98218]">
              <Settings
                size={24}
                aria-hidden="true"
              />
            </div>

            <div>
              <h1 className="text-[30px] font-extrabold text-[#20170f]">
                Configurações
                da Loja
              </h1>

              <p className="mt-1 text-sm text-neutral-500">
                Gerencie dados
                gerais e integrações
                externas da loja.
              </p>
            </div>
          </div>
        </div>

        {/* MENSAGENS */}

        {connectedMessage && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800"
          >
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />

            <div>
              <strong className="block">
                Melhor Envio
                conectado
              </strong>

              <p className="mt-1">
                A autorização
                logística foi
                concluída com
                sucesso.
              </p>
            </div>
          </div>
        )}

        {disconnectedMessage && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800"
          >
            <Unplug
              size={20}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />

            <div>
              <strong className="block">
                Integração
                desconectada
              </strong>

              <p className="mt-1">
                Os tokens armazenados
                foram removidos.
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
          >
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />

            <div>
              <strong className="block">
                Não foi possível
                concluir a operação
              </strong>

              <p className="mt-1">
                {
                  errorMessage
                }
              </p>
            </div>
          </div>
        )}

        {/* INTEGRAÇÃO LOGÍSTICA */}

        <section className="overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-sm">
          <div className="flex flex-col gap-5 border-b border-[#eee2cc] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff8e8] text-[#b98218]">
                <Truck
                  size={24}
                  aria-hidden="true"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-extrabold text-[#20170f]">
                    Melhor Envio
                  </h2>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                      connection.connected &&
                      !connection.requiresReconnect
                        ? "bg-green-100 text-green-700"
                        : connection.connected
                          ? "bg-amber-100 text-amber-700"
                          : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {connection.connected &&
                    !connection.requiresReconnect
                      ? "Conectado"
                      : connection.connected
                        ? "Reconexão necessária"
                        : "Desconectado"}
                  </span>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                    {
                      environment
                    }
                  </span>
                </div>

                <p className="mt-2 max-w-[680px] text-sm leading-6 text-neutral-500">
                  Integração utilizada
                  para calcular fretes
                  dos Correios, emitir
                  etiquetas e acompanhar
                  entregas.
                </p>
              </div>
            </div>

            {session.isSuperAdmin &&
              (!connection.connected ||
                connection.requiresReconnect) && (
                <a
                  href="/api/integrations/melhor-envio/connect"
                  className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#b98218] px-5 text-sm font-extrabold text-white shadow-md transition hover:bg-[#9f6f14]"
                >
                  <Plug
                    size={17}
                    aria-hidden="true"
                  />

                  {connection.connected
                    ? "Reconectar"
                    : "Conectar"}
                </a>
              )}
          </div>

          {/* INFORMAÇÕES */}

          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
            <div className="rounded-xl border border-[#eee2cc] bg-[#faf9f6] p-4">
              <span className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                Ambiente
              </span>

              <strong className="mt-2 block text-sm text-[#20170f]">
                {
                  environment
                }
              </strong>
            </div>

            <div className="rounded-xl border border-[#eee2cc] bg-[#faf9f6] p-4">
              <span className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                CEP de origem
              </span>

              <strong className="mt-2 block text-sm text-[#20170f]">
                {
                  originCep
                }
              </strong>
            </div>

            <div className="rounded-xl border border-[#eee2cc] bg-[#faf9f6] p-4">
              <span className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                Frete grátis
              </span>

              <strong className="mt-2 block text-sm text-[#20170f]">
                A partir de{" "}
                {
                  freeShippingMinimum
                }
              </strong>
            </div>

            <div className="rounded-xl border border-[#eee2cc] bg-[#faf9f6] p-4">
              <span className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                Conectado em
              </span>

              <strong className="mt-2 block text-sm text-[#20170f]">
                {connection.connected
                  ? formatDate(
                      connection.connectedAt
                    )
                  : "Não conectado"}
              </strong>
            </div>
          </div>

          {/* DETALHES DA CONEXÃO */}

          {connection.connected && (
            <div className="border-t border-[#eee2cc] px-5 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#20170f]">
                    <ShieldCheck
                      size={18}
                      className="text-[#b98218]"
                      aria-hidden="true"
                    />

                    Segurança da
                    integração
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    Os tokens de acesso
                    e renovação ficam
                    criptografados no
                    banco e nunca são
                    enviados ao
                    navegador.
                  </p>
                </div>

                <div>
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#20170f]">
                    <PackageCheck
                      size={18}
                      className="text-[#b98218]"
                      aria-hidden="true"
                    />

                    Validade
                  </h3>

                  <div className="mt-2 space-y-1 text-sm text-neutral-500">
                    <p>
                      Token de acesso:{" "}
                      <strong className="text-[#20170f]">
                        {formatDate(
                          connection.accessTokenExpiresAt
                        )}
                      </strong>
                    </p>

                    <p>
                      Renovação:{" "}
                      <strong className="text-[#20170f]">
                        {formatDate(
                          connection.refreshTokenExpiresAt
                        )}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-[#eee2cc] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <a
                  href="https://sandbox.melhorenvio.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#b98218] hover:underline"
                >
                  Abrir painel do
                  Melhor Envio

                  <ExternalLink
                    size={15}
                    aria-hidden="true"
                  />
                </a>

                {session.isSuperAdmin && (
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50">
                      <Unplug
                        size={16}
                        aria-hidden="true"
                      />

                      Desconectar
                    </summary>

                    <div className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 p-4 sm:w-[360px]">
                      <strong className="text-sm text-red-800">
                        Tem certeza?
                      </strong>

                      <p className="mt-2 text-xs leading-5 text-red-700">
                        A loja deixará
                        de calcular
                        novos fretes até
                        que a integração
                        seja conectada
                        novamente.
                      </p>

                      <form
                        action="/api/integrations/melhor-envio/disconnect"
                        method="POST"
                      >
                        <button
                          type="submit"
                          className="mt-4 flex h-10 w-full items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-extrabold text-white transition hover:bg-red-700"
                        >
                          Confirmar
                          desconexão
                        </button>
                      </form>
                    </div>
                  </details>
                )}
              </div>
            </div>
          )}

          {!session.isSuperAdmin && (
            <div className="border-t border-[#eee2cc] bg-amber-50 px-5 py-4 text-sm text-amber-800 sm:px-6">
              Somente o Super
              Admin pode conectar
              ou desconectar
              provedores
              logísticos.
            </div>
          )}
        </section>

        {/* DADOS DA LOJA */}

        <section className="rounded-2xl border border-[#e8dcc2] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-[#20170f]">
              Dados da Loja
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Informações
              institucionais
              exibidas pela
              plataforma.
            </p>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="text-sm font-bold text-[#20170f]">
                Nome da loja
              </span>

              <input
                value="E-commerce Laico"
                readOnly
                className="mt-2 h-12 w-full rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#20170f]">
                E-mail de
                atendimento
              </span>

              <input
                value="vinicius.semola@gmail.com"
                readOnly
                className="mt-2 h-12 w-full rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#20170f]">
                Descrição
                institucional
              </span>

              <textarea
                rows={4}
                value="Loja oficial de produtos religiosos, culturais e artigos simbólicos do Observatório Internacional do Turismo Religioso Laico."
                readOnly
                className="mt-2 w-full resize-none rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 py-3 text-sm leading-6 outline-none"
              />
            </label>

            <p className="text-xs text-neutral-400">
              A edição destas
              informações será
              implementada em uma
              etapa separada.
            </p>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}