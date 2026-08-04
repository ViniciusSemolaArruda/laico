"use client";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Link from "next/link";
import {
  Home,
  Minus,
  Plus,
  Trash2,
  Truck,
  ShieldCheck,
  CreditCard,
  MessageCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type CartItem = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const storedCart = localStorage.getItem("laico-cart");

    if (storedCart) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCartItems(JSON.parse(storedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("laico-cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }, [cartItems]);

  const shipping = cartItems.length > 0 ? 18.9 : 0;
  const total = subtotal + shipping;

  function increaseQuantity(id: string) {
    setCartItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  }

  function decreaseQuantity(id: string) {
    setCartItems((items) =>
      items.map((item) =>
        item.id === id && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  }

  function removeItem(id: string) {
    setCartItems((items) => items.filter((item) => item.id !== id));
  }

  return (
    <main className="bg-[#faf9f6] min-h-screen">
      <Header />

      <section className="max-w-[1370px] mx-auto px-6 py-6">
        <div className="flex items-center gap-2 text-[13px] text-neutral-600 mb-7">
          <Home size={15} />
          <span>›</span>
          <span>Carrinho</span>
        </div>

        <h1 className="font-serif text-[34px] text-[#20170f] mb-8">
          Meu Carrinho
        </h1>

        {cartItems.length === 0 ? (
          <div className="bg-white border border-[#f0e3c2] rounded-[8px] p-10 text-center">
            <h2 className="text-[24px] font-bold mb-3">
              Seu carrinho está vazio
            </h2>
            <p className="text-neutral-500 mb-6">
              Adicione produtos para continuar sua compra.
            </p>
            <Link
              href="/"
              className="inline-flex h-[44px] px-6 rounded bg-[#cfa74a] text-white font-bold items-center justify-center"
            >
              Continuar comprando
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
            <section className="bg-white border border-[#f0e3c2] rounded-[8px] overflow-hidden">
              <div className="hidden md:grid grid-cols-[1fr_140px_130px_120px] gap-4 px-6 py-4 border-b border-[#f0e3c2] text-[13px] font-bold text-[#6f5a28] uppercase">
                <span>Produto</span>
                <span>Quantidade</span>
                <span>Preço</span>
                <span>Total</span>
              </div>

              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_140px_130px_120px] gap-4 px-6 py-5 border-b border-[#f0e3c2] items-center"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-[105px] h-[105px] rounded-[8px] border border-[#f0e3c2] bg-[#fffdf7] flex items-center justify-center">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="max-w-[85px] max-h-[85px] object-contain"
                      />
                    </div>

                    <div>
                      <Link
                        href={`/produtos/${item.slug}`}
                        className="text-[17px] font-semibold text-[#20170f] hover:text-[#cfa74a]"
                      >
                        {item.name}
                      </Link>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex items-center gap-2 text-[13px] text-red-500 mt-4"
                      >
                        <Trash2 size={15} />
                        Remover
                      </button>
                    </div>
                  </div>

                  <div className="flex w-[100px] h-[36px] border border-[#f0e3c2] rounded overflow-hidden">
                    <button
                      onClick={() => decreaseQuantity(item.id)}
                      className="w-9 flex items-center justify-center border-r border-[#f0e3c2]"
                    >
                      <Minus size={14} />
                    </button>

                    <span className="flex-1 flex items-center justify-center text-[14px]">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => increaseQuantity(item.id)}
                      className="w-9 flex items-center justify-center border-l border-[#f0e3c2]"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <p className="text-[16px] font-semibold text-[#cfa74a]">
                    {formatPrice(item.price)}
                  </p>

                  <p className="text-[16px] font-bold text-[#20170f]">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </section>

            <aside className="bg-white border border-[#f0e3c2] rounded-[8px] h-fit p-6 shadow-[0_2px_10px_rgba(207,167,74,0.08)]">
              <h2 className="font-serif text-[24px] text-[#20170f] mb-5">
                Resumo do pedido
              </h2>

              <div className="space-y-4 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Subtotal</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-neutral-600">Frete</span>
                  <strong>{formatPrice(shipping)}</strong>
                </div>

                <div className="border-t border-[#f0e3c2] pt-4 flex justify-between text-[18px]">
                  <span className="font-bold">Total</span>
                  <strong className="text-[#cfa74a]">
                    {formatPrice(total)}
                  </strong>
                </div>
              </div>

              <Link
                href="/checkout"
                className="mt-6 h-[46px] w-full rounded-[4px] bg-gradient-to-r from-[#b8872b] via-[#d8b35a] to-[#cfa74a] text-white font-bold flex items-center justify-center"
              >
                Finalizar compra
              </Link>

              <Link
                href="/"
                className="mt-3 h-[42px] w-full rounded-[4px] border border-[#cfa74a] text-[#cfa74a] font-bold flex items-center justify-center"
              >
                Continuar comprando
              </Link>

              <div className="mt-6 space-y-4 border-t border-[#f0e3c2] pt-5">
                <div className="flex gap-3 text-[13px]">
                  <Truck className="text-[#cfa74a]" size={20} />
                  <span>Entrega para todo o Brasil</span>
                </div>

                <div className="flex gap-3 text-[13px]">
                  <CreditCard className="text-[#cfa74a]" size={20} />
                  <span>Pagamento seguro via Pix, cartão ou boleto</span>
                </div>

                <div className="flex gap-3 text-[13px]">
                  <ShieldCheck className="text-[#cfa74a]" size={20} />
                  <span>Compra protegida e dados seguros</span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>

      <Footer />

      <button className="fixed bottom-8 right-8 w-[62px] h-[62px] rounded-full bg-[#24c45a] text-white flex items-center justify-center shadow-2xl">
        <MessageCircle size={34} />
      </button>
    </main>
  );
}