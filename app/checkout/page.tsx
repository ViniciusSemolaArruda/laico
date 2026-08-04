// app/checkout/page.tsx
"use client";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import MercadoPagoPaymentBrick from "../../components/MercadoPagoPaymentBrick";

import {
  User,
  MapPin,
  CreditCard,
  ShoppingBag,
  Lock,
  ShieldCheck,
  Truck,
  MessageCircle,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

const cardFlags = {
  pix: "https://cdn.sistemawbuy.com.br/img/bandeiras/novo/pix.svg",
  visa: "https://cdn.sistemawbuy.com.br/img/bandeiras/novo/visa.svg",
  master: "https://cdn.sistemawbuy.com.br/img/bandeiras/novo/master.svg",
  boleto: "https://cdn.sistemawbuy.com.br/img/bandeiras/novo/boleto.svg",
};

type PaymentMethod = "pix" | "credit_card" | "debit_card" | "ticket";

type CartItem = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

type FormData = {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  reference: string;
};

const initialForm: FormData = {
  name: "",
  cpf: "",
  email: "",
  phone: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "RJ",
  reference: "",
};

function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderExpiresAt, setOrderExpiresAt] = useState<string | null>(null);

  const [selectedPayment, setSelectedPayment] =
    useState<PaymentMethod>("pix");

  useEffect(() => {
  const timer = window.setTimeout(() => {
    const checkoutItems = window.localStorage.getItem("laico-checkout");
    const storedCartItems = window.localStorage.getItem("laico-cart");

    const selectedItems = checkoutItems || storedCartItems;

    if (!selectedItems) return;

    try {
      const parsedItems = JSON.parse(selectedItems);

      if (Array.isArray(parsedItems)) {
        setCartItems(parsedItems);
      }
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
    }
  }, 0);

  return () => window.clearTimeout(timer);
}, []);

  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }, [cartItems]);

  const shipping = 0;
  const total = subtotal + shipping;

  function updateForm(field: keyof FormData, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCreateOrder() {
    try {
      if (cartItems.length === 0) {
        alert(
          "Nenhum produto encontrado. Volte no produto e clique em Comprar agora."
        );
        return;
      }

      if (
        !form.name ||
        !form.cpf ||
        !form.email ||
        !form.phone ||
        !form.cep ||
        !form.street ||
        !form.number ||
        !form.neighborhood ||
        !form.city ||
        !form.state
      ) {
        alert("Preencha todos os campos obrigatórios.");
        return;
      }

      setLoading(true);

      const checkoutResponse = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethod: selectedPayment,
          customer: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            cpf: form.cpf,
          },
          address: {
            cep: form.cep,
            state: form.state,
            city: form.city,
            neighborhood: form.neighborhood,
            street: form.street,
            number: form.number,
            complement: form.complement,
          },
          items: cartItems.map((item) => ({
            id: item.id,
            slug: item.slug,
            quantity: item.quantity,
          })),
          shipping,
        }),
      });

      const checkoutData = await checkoutResponse.json();

      if (!checkoutResponse.ok) {
        throw new Error(checkoutData.error || "Erro ao criar pedido.");
      }

      setOrderId(checkoutData.orderId);
      setOrderExpiresAt(
        checkoutData.expiresAt || checkoutData.order?.expiresAt || null
      );
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao preparar pagamento."
      );
    } finally {
      setLoading(false);
    }
  }

  const paymentOptions: {
    id: PaymentMethod;
    title: string;
    text: string;
    image: string;
  }[] = [
    {
      id: "pix",
      title: "PIX",
      text: "QR Code e copia e cola",
      image: cardFlags.pix,
    },
    {
      id: "credit_card",
      title: "Crédito",
      text: "Cartão de crédito",
      image: cardFlags.visa,
    },
    {
      id: "debit_card",
      title: "Débito",
      text: "Cartão de débito",
      image: cardFlags.master,
    },
    {
      id: "ticket",
      title: "Boleto",
      text: "Boleto bancário",
      image: cardFlags.boleto,
    },
  ];

  return (
    <main className="min-h-screen bg-[#faf9f6]">
      <Header />

      <section className="mx-auto max-w-[1370px] px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="rounded-[8px] border border-[#e8dcc2] bg-white p-6">
                <div className="mb-6 flex items-center gap-3">
                  <User className="text-[#b98218]" />

                  <div>
                    <h2 className="text-[20px] font-bold">
                      1. Identificação
                    </h2>
                    <p className="text-[13px] text-neutral-500">
                      Informe seus dados pessoais
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    ["name", "Nome completo *", "Digite seu nome completo"],
                    ["cpf", "CPF *", "000.000.000-00"],
                    ["email", "E-mail *", "seu@email.com"],
                    ["phone", "Telefone / WhatsApp *", "(11) 99999-9999"],
                  ].map(([field, label, placeholder]) => (
                    <label key={field} className="block">
                      <span className="text-[13px] font-semibold">
                        {label}
                      </span>

                      <input
                        value={form[field as keyof FormData]}
                        onChange={(e) =>
                          updateForm(field as keyof FormData, e.target.value)
                        }
                        placeholder={placeholder}
                        disabled={!!orderId}
                        className="mt-2 h-[40px] w-full rounded-[5px] border border-[#e5e5e5] px-3 text-[13px] outline-none focus:border-[#b98218] disabled:bg-neutral-100"
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded-[8px] border border-[#e8dcc2] bg-white p-6">
                <div className="mb-6 flex items-center gap-3">
                  <MapPin className="text-[#b98218]" />

                  <div>
                    <h2 className="text-[20px] font-bold">2. Entrega</h2>
                    <p className="text-[13px] text-neutral-500">
                      Informe o endereço de entrega
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-[13px] font-semibold">CEP *</span>
                    <input
                      value={form.cep}
                      onChange={(e) => updateForm("cep", e.target.value)}
                      disabled={!!orderId}
                      placeholder="00000-000"
                      className="mt-2 h-[40px] w-full rounded-[5px] border border-[#e5e5e5] px-3 text-[13px] outline-none focus:border-[#b98218] disabled:bg-neutral-100"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[13px] font-semibold">Rua *</span>
                    <input
                      value={form.street}
                      onChange={(e) => updateForm("street", e.target.value)}
                      disabled={!!orderId}
                      placeholder="Digite sua rua"
                      className="mt-2 h-[40px] w-full rounded-[5px] border border-[#e5e5e5] px-3 text-[13px] outline-none focus:border-[#b98218] disabled:bg-neutral-100"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label>
                      <span className="text-[13px] font-semibold">
                        Número *
                      </span>
                      <input
                        value={form.number}
                        onChange={(e) => updateForm("number", e.target.value)}
                        disabled={!!orderId}
                        placeholder="123"
                        className="mt-2 h-[40px] w-full rounded-[5px] border border-[#e5e5e5] px-3 text-[13px] outline-none focus:border-[#b98218] disabled:bg-neutral-100"
                      />
                    </label>

                    <label>
                      <span className="text-[13px] font-semibold">
                        Complemento
                      </span>
                      <input
                        value={form.complement}
                        onChange={(e) =>
                          updateForm("complement", e.target.value)
                        }
                        disabled={!!orderId}
                        placeholder="Apto, bloco, etc."
                        className="mt-2 h-[40px] w-full rounded-[5px] border border-[#e5e5e5] px-3 text-[13px] outline-none focus:border-[#b98218] disabled:bg-neutral-100"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label>
                      <span className="text-[13px] font-semibold">
                        Bairro *
                      </span>
                      <input
                        value={form.neighborhood}
                        onChange={(e) =>
                          updateForm("neighborhood", e.target.value)
                        }
                        disabled={!!orderId}
                        placeholder="Digite seu bairro"
                        className="mt-2 h-[40px] w-full rounded-[5px] border border-[#e5e5e5] px-3 text-[13px] outline-none focus:border-[#b98218] disabled:bg-neutral-100"
                      />
                    </label>

                    <label>
                      <span className="text-[13px] font-semibold">
                        Cidade *
                      </span>
                      <input
                        value={form.city}
                        onChange={(e) => updateForm("city", e.target.value)}
                        disabled={!!orderId}
                        placeholder="Digite sua cidade"
                        className="mt-2 h-[40px] w-full rounded-[5px] border border-[#e5e5e5] px-3 text-[13px] outline-none focus:border-[#b98218] disabled:bg-neutral-100"
                      />
                    </label>
                  </div>

                  <label>
                    <span className="text-[13px] font-semibold">Estado *</span>
                    <select
                      value={form.state}
                      onChange={(e) => updateForm("state", e.target.value)}
                      disabled={!!orderId}
                      className="mt-2 h-[40px] w-full rounded-[5px] border border-[#e5e5e5] px-3 text-[13px] outline-none focus:border-[#b98218] disabled:bg-neutral-100"
                    >
                      <option value="">Selecione</option>
                      <option value="RJ">RJ</option>
                      <option value="SP">SP</option>
                      <option value="MG">MG</option>
                    </select>
                  </label>
                </div>

                <div className="mt-5 flex gap-3 rounded-[6px] border border-[#ead9b8] bg-[#fffdf8] p-4">
                  <Truck className="text-[#b98218]" />
                  <div>
                    <p className="text-[13px] font-bold">
                      Previsão de entrega
                    </p>
                    <p className="text-[12px] text-neutral-500">
                      De 3 a 10 dias úteis, conforme a região.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-[8px] border border-[#e8dcc2] bg-white p-6">
              <div className="mb-6 flex items-center gap-3">
                <CreditCard className="text-[#b98218]" />
                <div>
                  <h2 className="text-[20px] font-bold">3. Pagamento</h2>
                  <p className="text-[13px] text-neutral-500">
                    Escolha Pix, boleto, crédito ou débito no próprio site.
                  </p>
                </div>
              </div>

              {!orderId ? (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    {paymentOptions.map((payment) => (
                      <button
                        type="button"
                        key={payment.id}
                        onClick={() => setSelectedPayment(payment.id)}
                        className={`h-[100px] rounded-[6px] border p-4 text-left transition ${
                          selectedPayment === payment.id
                            ? "border-[#b98218] bg-[#fff8e8] shadow"
                            : "border-[#e5e5e5] bg-white hover:border-[#b98218]"
                        }`}
                      >
                        <img
                          src={payment.image}
                          alt={payment.title}
                          className="mb-3 h-[28px] object-contain"
                        />
                        <p className="text-[14px] font-bold">
                          {payment.title}
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          {payment.text}
                        </p>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateOrder}
                    disabled={loading}
                    className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-[5px] bg-gradient-to-r from-[#b8872b] via-[#d8b35a] to-[#b98218] font-bold text-white shadow-lg disabled:opacity-60"
                  >
                    <Lock size={18} />
                    {loading
                      ? "Preparando pagamento..."
                      : selectedPayment === "pix"
                      ? "Gerar Pix"
                      : selectedPayment === "ticket"
                      ? "Gerar boleto"
                      : "Continuar pagamento"}
                  </button>
                </>
              ) : (
                <div className="rounded-[8px] border border-[#ead9b8] bg-white p-4">
                  {orderExpiresAt && (
                    <div className="mb-4 rounded-[8px] border border-[#ead9b8] bg-[#fff8e8] p-4 text-[13px] text-[#20170f]">
                      <strong>Prazo para pagamento:</strong>{" "}
                      {formatDateTime(orderExpiresAt)}
                    </div>
                  )}

                  <MercadoPagoPaymentBrick
                    orderId={orderId}
                    amount={Number(total)}
                    email={form.email}
                    selectedPayment={selectedPayment}
                  />
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="overflow-hidden rounded-[8px] border border-[#e8dcc2] bg-white">
              <div className="flex items-center gap-3 border-b border-[#e8dcc2] p-6">
                <ShoppingBag />
                <h2 className="text-[20px] font-bold">Resumo do pedido</h2>
              </div>

              <div className="p-6">
                {cartItems.length === 0 ? (
                  <p className="text-[14px] text-neutral-500">
                    Nenhum produto selecionado.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="flex h-[70px] w-[70px] items-center justify-center rounded-[6px] border border-[#e8dcc2] bg-[#fffdf8]">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="max-h-[58px] max-w-[58px] object-contain"
                          />
                        </div>

                        <div className="flex-1">
                          <p className="text-[14px] font-bold">{item.name}</p>
                          <p className="text-[12px] text-neutral-500">
                            Qtd: {item.quantity}
                          </p>
                        </div>

                        <strong className="text-[14px]">
                          {formatPrice(item.price * item.quantity)}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 space-y-4 border-t border-[#e8dcc2] pt-5 text-[14px]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <strong>{formatPrice(subtotal)}</strong>
                  </div>

                  <div className="flex justify-between">
                    <span>Frete</span>
                    <strong>{formatPrice(shipping)}</strong>
                  </div>

                  <div className="flex justify-between pt-3 text-[18px]">
                    <strong>Total</strong>
                    <strong className="text-[#b98218]">
                      {formatPrice(total)}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            <p className="flex items-center justify-center gap-2 text-[13px] text-neutral-600">
              <ShieldCheck size={17} />
              Pagamento processado com segurança pelo Mercado Pago
            </p>
          </aside>
        </div>
      </section>

      <Footer />

      <button className="fixed bottom-8 right-8 flex h-[62px] w-[62px] items-center justify-center rounded-full bg-[#24c45a] text-white shadow-2xl">
        <MessageCircle size={34} />
      </button>
    </main>
  );
}