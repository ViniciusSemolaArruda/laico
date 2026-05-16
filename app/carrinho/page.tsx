import Header from "../components/Header";
import Footer from "../components/Footer";
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

const cartItems = [
  {
    name: "Terço Cristal Rosa",
    code: "202030500",
    price: 29.9,
    quantity: 1,
    image: "/terço.png",
  },
  {
    name: "Kit 12 Enfeite Metal Nossa Senhora Aparecida",
    code: "20208900",
    price: 57.13,
    quantity: 1,
    image: "/aparecida.png",
  },
];

export default function CartPage() {
  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const shipping = 18.9;
  const total = subtotal + shipping;

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
                key={item.code}
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
                    <h2 className="text-[17px] font-semibold text-[#20170f]">
                      {item.name}
                    </h2>
                    <p className="text-[13px] text-neutral-500 mt-1">
                      Cód: {item.code}
                    </p>

                    <button className="flex items-center gap-2 text-[13px] text-red-500 mt-4">
                      <Trash2 size={15} />
                      Remover
                    </button>
                  </div>
                </div>

                <div className="flex w-[100px] h-[36px] border border-[#f0e3c2] rounded overflow-hidden">
                  <button className="w-9 flex items-center justify-center border-r border-[#f0e3c2]">
                    <Minus size={14} />
                  </button>
                  <span className="flex-1 flex items-center justify-center text-[14px]">
                    {item.quantity}
                  </span>
                  <button className="w-9 flex items-center justify-center border-l border-[#f0e3c2]">
                    <Plus size={14} />
                  </button>
                </div>

                <p className="text-[16px] font-semibold text-[#cfa74a]">
                  R${item.price.toFixed(2).replace(".", ",")}
                </p>

                <p className="text-[16px] font-bold text-[#20170f]">
                  R${(item.price * item.quantity)
                    .toFixed(2)
                    .replace(".", ",")}
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
                <strong>R${subtotal.toFixed(2).replace(".", ",")}</strong>
              </div>

              <div className="flex justify-between">
                <span className="text-neutral-600">Frete</span>
                <strong>R${shipping.toFixed(2).replace(".", ",")}</strong>
              </div>

              <div className="border-t border-[#f0e3c2] pt-4 flex justify-between text-[18px]">
                <span className="font-bold">Total</span>
                <strong className="text-[#cfa74a]">
                  R${total.toFixed(2).replace(".", ",")}
                </strong>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-[13px] font-medium mb-2">
                Calcular frete
              </p>

              <div className="flex gap-2">
                <input
                  placeholder="Digite seu CEP"
                  className="flex-1 h-[38px] border border-[#f0e3c2] rounded px-3 text-[13px]"
                />

                <button className="h-[38px] px-4 rounded bg-[#cfa74a] text-white text-[13px] font-bold">
                  OK
                </button>
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
      </section>

      <Footer />

      <button className="fixed bottom-8 right-8 w-[62px] h-[62px] rounded-full bg-[#24c45a] text-white flex items-center justify-center shadow-2xl">
        <MessageCircle size={34} />
      </button>
    </main>
  );
}