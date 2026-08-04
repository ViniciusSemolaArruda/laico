"use client";

import { ShoppingCart, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

type ProductCart = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
};

export default function AddToCartButton({ product }: { product: ProductCart }) {
  const router = useRouter();

  function addToCart() {
    const item = {
      ...product,
      quantity: 1,
    };

    localStorage.setItem("laico-cart", JSON.stringify([item]));
    router.push("/carrinho");
  }

  function buyNow() {
    const item = {
      ...product,
      quantity: 1,
    };

    localStorage.setItem("laico-checkout", JSON.stringify([item]));
    router.push("/checkout");
  }

  return (
    <>
      <button
        type="button"
        onClick={addToCart}
        className="mt-4 w-full h-[45px] bg-[#b98218] text-white rounded-[4px] font-bold flex items-center justify-center gap-2"
      >
        <ShoppingCart size={18} />
        Adicionar ao carrinho
      </button>

      <button
        type="button"
        onClick={buyNow}
        className="mt-3 w-full h-[43px] border border-[#b98218] text-[#b98218] rounded-[4px] font-bold flex items-center justify-center gap-2"
      >
        <Zap size={17} />
        Comprar agora
      </button>
    </>
  );
}