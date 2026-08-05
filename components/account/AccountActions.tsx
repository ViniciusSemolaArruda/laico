"use client";

import {
  AlertTriangle,
  Eye,
  EyeOff,
  LogOut,
  ShieldAlert,
  X,
} from "lucide-react";

import {
  FormEvent,
  useState,
} from "react";

export default function AccountActions() {
  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);

  const [
    disableOpen,
    setDisableOpen,
  ] =
    useState(false);

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    confirmation,
    setConfirmation,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    disabling,
    setDisabling,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  /*
   * =======================================================
   * LOGOUT
   * =======================================================
   */

  async function handleLogout() {
    if (
      loggingOut ||
      disabling
    ) {
      return;
    }

    setLoggingOut(
      true
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/auth/logout",
          {
            method:
              "POST",

            credentials:
              "same-origin",
          }
        );

      let data: {
        redirect?: string;
        error?: string;
      } = {};

      try {
        data =
          (await response.json()) as {
            redirect?: string;
            error?: string;
          };
      } catch {
        /*
         * Resposta sem JSON será tratada
         * como erro genérico abaixo.
         */
      }

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Não foi possível sair da conta."
        );
      }

      /*
       * replace() evita que a navegação tente
       * reutilizar uma página autenticada
       * depois que a sessão foi encerrada.
       */
      window.location.replace(
        data.redirect ||
          "/entrar"
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível sair da conta."
      );

      setLoggingOut(
        false
      );
    }
  }

  /*
   * =======================================================
   * ABRIR DESATIVAÇÃO
   * =======================================================
   */

  function openDisable() {
    if (
      loggingOut ||
      disabling
    ) {
      return;
    }

    setPassword(
      ""
    );

    setConfirmation(
      ""
    );

    setShowPassword(
      false
    );

    setError(
      null
    );

    setDisableOpen(
      true
    );
  }

  /*
   * =======================================================
   * FECHAR DESATIVAÇÃO
   * =======================================================
   */

  function closeDisable() {
    if (
      disabling
    ) {
      return;
    }

    /*
     * Remove os dados sensíveis mantidos
     * temporariamente no estado do componente.
     */
    setPassword(
      ""
    );

    setConfirmation(
      ""
    );

    setShowPassword(
      false
    );

    setError(
      null
    );

    setDisableOpen(
      false
    );
  }

  /*
   * =======================================================
   * DESATIVAR CONTA
   * =======================================================
   */

  async function handleDisable(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      disabling ||
      loggingOut
    ) {
      return;
    }

    if (!password) {
      setError(
        "Informe sua senha atual."
      );

      return;
    }

    /*
     * Confirmação explícita antes de permitir
     * que a solicitação chegue ao servidor.
     */
    if (
      confirmation !==
      "DESATIVAR"
    ) {
      setError(
        'Digite "DESATIVAR" exatamente como mostrado.'
      );

      return;
    }

    setDisabling(
      true
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/account/disable",
          {
            method:
              "POST",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                password,
                confirmation,
              }),
          }
        );

      let data: {
        success?: boolean;
        error?: string;
        message?: string;
        redirect?: string;
      } = {};

      try {
        data =
          (await response.json()) as {
            success?: boolean;
            error?: string;
            message?: string;
            redirect?: string;
          };
      } catch {
        /*
         * Resposta inválida será tratada como
         * erro genérico abaixo.
         */
      }

      /*
       * Não precisamos mais manter a senha
       * digitada no estado do componente.
       */
      setPassword(
        ""
      );

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Não foi possível desativar sua conta."
        );
      }

      /*
       * Neste ponto:
       *
       * - a conta está DISABLED;
       * - todas as sessões foram revogadas;
       * - o cookie atual foi apagado.
       *
       * Portanto não reutilizamos esta página.
       */
      window.location.replace(
        data.redirect ||
          "/entrar?account=disabled"
      );
    } catch (error) {
      setPassword(
        ""
      );

      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível desativar sua conta."
      );

      setDisabling(
        false
      );
    }
  }

  return (
    <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
      {/* CABEÇALHO */}

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
          <ShieldAlert
            size={20}
          />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-[#20170f]">
            Sessão e conta
          </h2>

          <p className="mt-0.5 text-xs text-neutral-500">
            Gerencie seu acesso
            à loja.
          </p>
        </div>
      </div>

      {/* ERRO */}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
        >
          {error}
        </div>
      )}

      {/* OPÇÕES */}

      {!disableOpen && (
        <div className="mt-6 space-y-3">
          {/* SAIR */}

          <button
            type="button"
            onClick={
              handleLogout
            }
            disabled={
              loggingOut ||
              disabling
            }
            className="flex w-full items-center justify-between rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 py-4 text-left transition hover:border-[#d9b66b] hover:bg-[#fffaf0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div>
              <strong className="block text-sm text-[#20170f]">
                {loggingOut
                  ? "Saindo..."
                  : "Sair da conta"}
              </strong>

              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Encerra sua sessão
                neste dispositivo.
              </p>
            </div>

            <LogOut
              size={19}
              className="shrink-0 text-[#b98218]"
            />
          </button>

          {/* DESATIVAR */}

          <button
            type="button"
            onClick={
              openDisable
            }
            disabled={
              loggingOut ||
              disabling
            }
            className="flex w-full items-center justify-between rounded-xl border border-red-200 bg-red-50/40 px-4 py-4 text-left transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div>
              <strong className="block text-sm text-red-700">
                Desativar minha
                conta
              </strong>

              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Bloqueia o acesso
                e encerra todas
                as sessões.
              </p>
            </div>

            <AlertTriangle
              size={19}
              className="shrink-0 text-red-500"
            />
          </button>
        </div>
      )}

      {/* PAINEL DE DESATIVAÇÃO */}

      {disableOpen && (
        <form
          onSubmit={
            handleDisable
          }
          className="mt-6 border-t border-[#eee2cc] pt-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-red-700">
                Desativar conta
              </h3>

              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Confirme sua
                identidade antes
                de continuar.
              </p>
            </div>

            <button
              type="button"
              onClick={
                closeDisable
              }
              disabled={
                disabling
              }
              aria-label="Cancelar desativação"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:opacity-50"
            >
              <X
                size={17}
              />
            </button>
          </div>

          {/* AVISO */}

          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div className="text-xs leading-5 text-red-800">
                <strong>
                  O que acontecerá?
                </strong>

                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>
                    sua conta ficará
                    desativada;
                  </li>

                  <li>
                    todas as sessões
                    serão encerradas;
                  </li>

                  <li>
                    novos logins serão
                    bloqueados;
                  </li>

                  <li>
                    seus pedidos e
                    registros de compra
                    serão preservados.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* SENHA */}

          <label className="mt-5 block">
            <span className="text-xs font-bold text-[#20170f]">
              Senha atual *
            </span>

            <div className="mt-2 flex h-11 items-center rounded-xl border border-[#e8dcc2] bg-white px-3 transition focus-within:border-[#b98218]">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  password
                }
                onChange={(
                  event
                ) =>
                  setPassword(
                    event
                      .target
                      .value
                  )
                }
                required
                autoComplete="current-password"
                maxLength={
                  72
                }
                placeholder="Digite sua senha"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (
                      current
                    ) =>
                      !current
                  )
                }
                aria-label={
                  showPassword
                    ? "Ocultar senha"
                    : "Mostrar senha"
                }
                className="ml-2 flex h-8 w-8 items-center justify-center text-neutral-400 transition hover:text-[#20170f]"
              >
                {showPassword ? (
                  <EyeOff
                    size={17}
                  />
                ) : (
                  <Eye
                    size={17}
                  />
                )}
              </button>
            </div>
          </label>

          {/* CONFIRMAÇÃO */}

          <label className="mt-4 block">
            <span className="text-xs font-bold text-[#20170f]">
              Confirme a ação *
            </span>

            <p className="mt-1 text-[11px] leading-5 text-neutral-500">
              Digite{" "}
              <strong className="text-red-700">
                DESATIVAR
              </strong>{" "}
              no campo abaixo.
            </p>

            <input
              type="text"
              value={
                confirmation
              }
              onChange={(
                event
              ) =>
                setConfirmation(
                  event
                    .target
                    .value
                    .toUpperCase()
                    .slice(
                      0,
                      9
                    )
                )
              }
              required
              autoComplete="off"
              maxLength={
                9
              }
              placeholder="DESATIVAR"
              className="mt-2 h-11 w-full rounded-xl border border-red-200 bg-white px-3 text-sm font-bold tracking-wide outline-none transition focus:border-red-500"
            />
          </label>

          {/* AÇÕES */}

          <div className="mt-5 space-y-2">
            <button
              type="submit"
              disabled={
                disabling ||
                !password ||
                confirmation !==
                  "DESATIVAR"
              }
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <AlertTriangle
                size={16}
              />

              {disabling
                ? "Desativando..."
                : "Confirmar desativação"}
            </button>

            <button
              type="button"
              onClick={
                closeDisable
              }
              disabled={
                disabling
              }
              className="h-10 w-full rounded-xl text-xs font-bold text-neutral-500 transition hover:bg-[#faf9f6] disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}