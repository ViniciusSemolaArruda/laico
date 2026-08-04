/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import {
  initMercadoPago,
  Payment,
} from "@mercadopago/sdk-react";
import {
  AlertCircle,
  Copy,
  ExternalLink,
  LoaderCircle,
} from "lucide-react";
import type { ComponentProps } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type PaymentMethod =
  | "pix"
  | "credit_card"
  | "debit_card"
  | "ticket";

type Props = {
  orderId: string;
  amount: number;
  email: string;
  selectedPayment: PaymentMethod;
};

type PaymentResult = {
  id?: string;
  mercadoPagoOrderId?: string;
  status?: string | null;
  statusDetail?: string | null;
  paymentMethod?: string | null;
  pixQrCode?: string | null;
  pixQrCodeBase64?: string | null;
  ticketUrl?: string | null;
  barcode?: string | null;
  error?: string;
};

type PaymentOnSubmit = NonNullable<
  ComponentProps<
    typeof Payment
  >["onSubmit"]
>;

type PaymentOnError = NonNullable<
  ComponentProps<
    typeof Payment
  >["onError"]
>;

let mercadoPagoInitialized = false;

function normalizePaymentStatus(
  status: string | null | undefined
) {
  return status
    ?.trim()
    .toLowerCase() || "";
}

function getRejectedMessage(
  statusDetail: string | null | undefined
) {
  switch (statusDetail) {
    case "cc_rejected_bad_filled_card_number":
      return "Confira o número do cartão.";

    case "cc_rejected_bad_filled_date":
      return "Confira a data de validade do cartão.";

    case "cc_rejected_bad_filled_security_code":
      return "Confira o código de segurança do cartão.";

    case "cc_rejected_bad_filled_other":
      return "Confira os dados informados do cartão.";

    case "cc_rejected_insufficient_amount":
      return "O cartão não possui limite suficiente.";

    case "cc_rejected_call_for_authorize":
      return "O pagamento precisa ser autorizado junto ao banco emissor.";

    case "cc_rejected_card_disabled":
      return "O cartão está desativado. Entre em contato com o banco emissor.";

    case "cc_rejected_duplicated_payment":
      return "Este pagamento já foi processado anteriormente.";

    case "cc_rejected_max_attempts":
      return "O limite de tentativas com este cartão foi atingido.";

    case "cc_rejected_card_type_not_allowed":
      return "Esse tipo de cartão não é aceito para esta compra.";

    case "cc_rejected_other_reason":
      return "O banco emissor recusou o pagamento. Tente outro cartão.";

    default:
      return statusDetail
        ? `Pagamento recusado: ${statusDetail}.`
        : "O pagamento foi recusado. Confira os dados ou utilize outro cartão.";
  }
}

export default function MercadoPagoPaymentBrick({
  orderId,
  amount,
  email,
  selectedPayment,
}: Props) {
  const submittingRef =
    useRef(false);

  const [sdkReady, setSdkReady] =
    useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    brickError,
    setBrickError,
  ] = useState<string | null>(
    null
  );

  const [
    paymentResult,
    setPaymentResult,
  ] = useState<PaymentResult | null>(
    null
  );

  const publicKey =
    process.env
      .NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;

  const normalizedAmount =
    useMemo(() => {
      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(
          numericAmount
        )
      ) {
        return 0;
      }

      return Number(
        numericAmount.toFixed(2)
      );
    }, [amount]);

  const normalizedEmail =
    useMemo(() => {
      return email
        .trim()
        .toLowerCase();
    }, [email]);

  useEffect(() => {
    if (!publicKey) {
      console.error(
        "NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY não encontrada."
      );

      setSdkReady(false);

      return;
    }

    try {
      if (
        !mercadoPagoInitialized
      ) {
        initMercadoPago(
          publicKey,
          {
            locale: "pt-BR",
          }
        );

        mercadoPagoInitialized =
          true;
      }

      setSdkReady(true);
    } catch (error) {
      mercadoPagoInitialized =
        false;

      setSdkReady(false);

      console.error(
        "Erro ao inicializar o SDK do Mercado Pago:",
        error
      );
    }
  }, [publicKey]);

  useEffect(() => {
    submittingRef.current =
      false;

    setSubmitting(false);
    setBrickError(null);
    setPaymentResult(null);
  }, [selectedPayment]);

  const initialization =
    useMemo(
      () => ({
        amount:
          normalizedAmount,

        payer: {
          email:
            normalizedEmail,

          entityType:
            "individual" as const,
        },
      }),
      [
        normalizedAmount,
        normalizedEmail,
      ]
    );

  const customization =
    useMemo(() => {
      switch (
        selectedPayment
      ) {
        case "credit_card":
          return {
            paymentMethods: {
              creditCard:
                "all" as const,
            },
          };

        case "debit_card":
          return {
            paymentMethods: {
              debitCard:
                "all" as const,
            },
          };

        case "ticket":
          return {
            paymentMethods: {
              ticket:
                "all" as const,
            },
          };

        case "pix":
        default:
          return {
            paymentMethods: {
              bankTransfer:
                "all" as const,
            },
          };
      }
    }, [selectedPayment]);

  const handleSubmit =
    useCallback<PaymentOnSubmit>(
      async ({
        formData,
      }) => {
        if (
          submittingRef.current
        ) {
          return;
        }

        submittingRef.current =
          true;

        setSubmitting(true);
        setBrickError(null);

        try {
          const response =
            await fetch(
              "/api/payments/process",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify(
                    {
                      orderId,

                      paymentMethod:
                        selectedPayment,

                      formData,
                    }
                  ),
              }
            );

          const contentType =
            response.headers.get(
              "content-type"
            );

          if (
            !contentType?.includes(
              "application/json"
            )
          ) {
            throw new Error(
              "O servidor retornou uma resposta inválida."
            );
          }

          const data =
            (await response.json()) as PaymentResult;

          console.log(
            "Resposta completa do pagamento:",
            data
          );

          if (!response.ok) {
            throw new Error(
              data.error ||
                "Não foi possível processar o pagamento."
            );
          }

          const status =
            normalizePaymentStatus(
              data.status
            );

          console.log(
            "Status retornado pelo Mercado Pago:",
            {
              status,
              statusDetail:
                data.statusDetail,
              paymentId:
                data.id,
              mercadoPagoOrderId:
                data.mercadoPagoOrderId,
            }
          );

          /*
           * Cartão aprovado.
           *
           * A API pode retornar approved
           * para a transação ou processed
           * para a ordem.
           */
          if (
            status ===
              "approved" ||
            status ===
              "processed"
          ) {
            window.location.assign(
              `/pedido/${encodeURIComponent(
                orderId
              )}?status=approved`
            );

            return;
          }

          /*
           * Pix criado.
           */
          if (
            selectedPayment ===
            "pix"
          ) {
            if (
              !data.pixQrCode
            ) {
              throw new Error(
                "O Pix foi criado, mas o Mercado Pago não retornou o código para pagamento."
              );
            }

            setPaymentResult(
              data
            );

            return;
          }

          /*
           * Boleto criado.
           */
          if (
            selectedPayment ===
            "ticket"
          ) {
            if (
              !data.ticketUrl
            ) {
              throw new Error(
                "O boleto foi criado, mas o Mercado Pago não retornou o endereço para visualização."
              );
            }

            setPaymentResult(
              data
            );

            return;
          }

          /*
           * Pagamento recusado.
           */
          if (
            status ===
              "rejected" ||
            status ===
              "cancelled" ||
            status ===
              "canceled"
          ) {
            const message =
              getRejectedMessage(
                data.statusDetail
              );

            setBrickError(
              message
            );

            throw new Error(
              message
            );
          }

          /*
           * Pagamento aguardando
           * processamento.
           */
          if (
            status ===
              "pending" ||
            status ===
              "in_process" ||
            status ===
              "action_required" ||
            status ===
              "created"
          ) {
            window.location.assign(
              `/pedido/${encodeURIComponent(
                orderId
              )}?status=pending`
            );

            return;
          }

          /*
           * Evita que um status novo
           * do Mercado Pago deixe a
           * tela aparentemente travada.
           */
          throw new Error(
            `O Mercado Pago retornou o status "${
              status ||
              "desconhecido"
            }"${
              data.statusDetail
                ? `: ${data.statusDetail}`
                : "."
            }`
          );
        } catch (error) {
          const message =
            error instanceof
            Error
              ? error.message
              : "Erro ao processar pagamento.";

          console.error(
            "Erro ao processar pagamento:",
            error
          );

          setBrickError(
            message
          );
        } finally {
          submittingRef.current =
            false;

          setSubmitting(false);
        }
      },
      [
        orderId,
        selectedPayment,
      ]
    );

  const handleReady =
    useCallback(() => {
      console.log(
        `Payment Brick pronto: ${selectedPayment}`
      );

      setBrickError(null);
    }, [selectedPayment]);

  const handleError =
    useCallback<PaymentOnError>(
      (error) => {
        console.error(
          "Erro no Payment Brick:",
          error
        );

        if (
          typeof error ===
            "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message ===
            "string"
        ) {
          setBrickError(
            error.message
          );

          return;
        }

        setBrickError(
          "Não foi possível carregar essa forma de pagamento. Confira as credenciais e o valor do pedido."
        );
      },
      []
    );

  async function copyPixCode() {
    const pixQrCode =
      paymentResult?.pixQrCode;

    if (!pixQrCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        pixQrCode
      );

      alert(
        "Código Pix copiado!"
      );
    } catch (error) {
      console.error(
        "Erro ao copiar código Pix:",
        error
      );

      alert(
        "Não foi possível copiar o código Pix."
      );
    }
  }

  if (!publicKey) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        <p className="font-bold">
          Mercado Pago não
          configurado
        </p>

        <p className="mt-1 text-sm">
          A variável{" "}
          <code>
            NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY
          </code>{" "}
          não foi encontrada.
        </p>
      </div>
    );
  }

  if (
    normalizedAmount <= 0
  ) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        <p className="font-bold">
          Valor do pedido
          inválido
        </p>

        <p className="mt-1 text-sm">
          O valor recebido foi
          R${" "}
          {normalizedAmount.toFixed(
            2
          )}
          .
        </p>
      </div>
    );
  }

  if (!normalizedEmail) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        O e-mail do comprador
        não foi informado.
      </div>
    );
  }

  if (!sdkReady) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <p className="font-medium text-neutral-700">
          Carregando formas de
          pagamento...
        </p>

        <p className="mt-1 text-sm text-neutral-500">
          Aguarde alguns
          segundos.
        </p>
      </div>
    );
  }

  if (
    paymentResult?.pixQrCode
  ) {
    return (
      <div className="rounded-xl border border-[#e8dcc2] bg-white p-6">
        <h3 className="text-[22px] font-bold">
          Pix gerado com sucesso
        </h3>

        <p className="mt-2 text-[14px] text-neutral-600">
          Escaneie o QR Code ou
          copie o código Pix
          abaixo.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[260px_1fr]">
          <div>
            <p className="mb-3 font-bold">
              Escaneie o QR Code
            </p>

            {paymentResult.pixQrCodeBase64 ? (
              <img
                src={`data:image/png;base64,${paymentResult.pixQrCodeBase64}`}
                alt="QR Code para pagamento por Pix"
                width={240}
                height={240}
                className="h-[240px] w-[240px] rounded-lg border bg-white object-contain p-2"
              />
            ) : (
              <div className="flex h-[240px] w-[240px] items-center justify-center rounded-lg border bg-neutral-50 p-4 text-center text-[13px] text-neutral-500">
                Utilize o código
                Pix copia e cola.
              </div>
            )}
          </div>

          <div>
            <p className="mb-3 font-bold">
              Ou copie o código
              Pix
            </p>

            <textarea
              readOnly
              value={
                paymentResult.pixQrCode
              }
              aria-label="Código Pix copia e cola"
              className="h-[155px] w-full resize-none rounded-lg border bg-[#fafafa] p-4 text-[13px]"
            />

            <button
              type="button"
              onClick={
                copyPixCode
              }
              className="mt-4 flex h-[44px] items-center gap-2 rounded border border-blue-600 px-5 font-bold text-blue-600 transition hover:bg-blue-50"
            >
              <Copy size={17} />

              Copiar código Pix
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-[14px] text-blue-900">
          Assim que o pagamento
          for confirmado, o
          pedido será atualizado
          automaticamente.
        </div>
      </div>
    );
  }

  if (
    paymentResult?.ticketUrl
  ) {
    return (
      <div className="rounded-xl border border-[#e8dcc2] bg-white p-6">
        <h3 className="text-[22px] font-bold">
          Boleto gerado com
          sucesso
        </h3>

        <p className="mt-2 text-[14px] text-neutral-600">
          Clique abaixo para
          abrir ou imprimir o
          boleto.
        </p>

        <a
          href={
            paymentResult.ticketUrl
          }
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex h-[48px] items-center justify-center gap-2 rounded bg-blue-600 px-6 font-bold text-white transition hover:bg-blue-700"
        >
          <ExternalLink
            size={18}
          />

          Abrir boleto
        </a>
      </div>
    );
  }

  return (
    <div>
      {brickError && (
        <div
          role="alert"
          className="mb-4 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-bold">
              Não foi possível
              concluir o
              pagamento
            </p>

            <p className="mt-1">
              {brickError}
            </p>
          </div>
        </div>
      )}

      {submitting && (
        <div
          role="status"
          className="mb-4 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800"
        >
          <LoaderCircle
            size={20}
            className="animate-spin"
          />

          <div>
            <p className="font-bold">
              Processando
              pagamento
            </p>

            <p className="mt-1">
              Não feche ou
              atualize esta
              página.
            </p>
          </div>
        </div>
      )}

      <div
        className={
          submitting
            ? "pointer-events-none opacity-70"
            : ""
        }
      >
        <Payment
          id={`payment-brick-${orderId}-${selectedPayment}`}
          initialization={
            initialization
          }
          customization={
            customization
          }
          onSubmit={
            handleSubmit
          }
          onReady={
            handleReady
          }
          onError={
            handleError
          }
        />
      </div>
    </div>
  );
}