"use client";

import {
  Heart,
  Menu,
  Search,
  ShoppingCart,
  Truck,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    "Todos",
    "Novidades",
    "Mais Vendidos",
    "Artigos Religiosos",
    "Aço Inox 316L",
    "Acessórios Femininos",
    "Chaveiro",
    "Acessórios & Embalagem",
    "Coleções",
  ];

  return (
    <>
      <header className="bg-[#fffdf7] w-full shadow-sm relative z-40">
        <div className="min-h-[34px] bg-gradient-to-r from-[#b8872b] via-[#f3de9b] to-[#cfa74a] flex items-center justify-center text-white text-[12px] sm:text-[15px] font-semibold tracking-[0.3px] px-4 text-center">
          <Truck size={15} className="mr-2 shrink-0" />
          Frete Grátis acima de R$1000* para todo o Brasil
        </div>

        <div className="border-b border-[#f3e7c7] bg-[#fffdf7]">
          <div className="max-w-[1370px] mx-auto px-4 sm:px-6 py-4 lg:h-[115px] flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="w-full lg:w-[320px] h-[46px] border border-[#e3c97a] rounded-[10px] flex items-center px-4 bg-white shadow-sm order-3 lg:order-1">
              <input
                placeholder="O que você está procurando?"
                className="flex-1 outline-none text-[14px] text-[#9f7a2f] bg-transparent placeholder:text-[#c9b27b]"
              />

              <Search size={21} className="text-[#cfa74a]" />
            </div>

            <Link href="/" className="order-1 lg:order-2">
              <img
                src="/logo3.png"
                alt="Laico"
                className="w-[190px] sm:w-[230px] lg:w-[270px] h-auto object-contain mix-blend-multiply"
              />
            </Link>

            <div className="w-full lg:w-auto flex items-center justify-between lg:justify-end gap-4 sm:gap-8 text-[13px] sm:text-[15px] text-[#b58b36] font-medium order-2 lg:order-3">
              <button
                onClick={() => setMenuOpen(true)}
                className="lg:hidden flex items-center gap-2 hover:text-[#d4af37] transition"
              >
                <Menu size={24} />
                Menu
              </button>

              <div className="hidden sm:flex items-center gap-2 hover:text-[#d4af37] transition cursor-pointer">
                <Heart size={22} />
                Favoritos
              </div>

              <div className="hidden sm:flex items-center gap-2 hover:text-[#d4af37] transition cursor-pointer">
                <User size={22} />
                Minha conta
              </div>

              <Link
                href="/carrinho"
                className="flex items-center gap-2 relative hover:text-[#d4af37] transition cursor-pointer"
              >
                <ShoppingCart size={25} />

                <span>Carrinho</span>

                <span className="absolute -right-4 -top-2 bg-gradient-to-b from-[#f3de9b] to-[#cfa74a] text-white rounded-full text-[11px] w-5 h-5 flex items-center justify-center shadow">
                  2
                </span>
              </Link>
            </div>
          </div>
        </div>

        <nav className="hidden lg:block border-b border-[#f3e7c7] bg-[#fffdf7] overflow-x-auto">
          <div className="max-w-[1370px] mx-auto h-[56px] px-4 sm:px-6 flex items-center justify-between gap-6 text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.6px] text-[#9f7a2f] whitespace-nowrap">
            {menuItems.map((item) => (
              <span
                key={item}
                className={`relative h-full flex items-center px-1 sm:px-4 transition-all duration-300 cursor-pointer hover:text-[#d4af37] ${
                  item === "Artigos Religiosos" ? "text-[#cfa74a]" : ""
                }`}
              >
                {item}

                {item === "Artigos Religiosos" && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] rounded-full bg-gradient-to-r from-[#f3de9b] to-[#cfa74a]" />
                )}
              </span>
            ))}
          </div>
        </nav>
      </header>

      {/* MENU MOBILE */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          menuOpen
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setMenuOpen(false)}
        />

        <div
          className={`absolute left-0 top-0 h-full w-[320px] bg-[#fffdf7] shadow-2xl transition-transform duration-300 ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-[80px] border-b border-[#f3e7c7] flex items-center justify-between px-5">
            <img
              src="/logo3.png"
              alt="Laico"
              className="w-[140px] object-contain"
            />

            <button
              onClick={() => setMenuOpen(false)}
              className="text-[#b58b36]"
            >
              <X size={28} />
            </button>
          </div>

          <div className="py-4">
            {menuItems.map((item) => (
              <button
                key={item}
                className={`w-full text-left px-5 h-[54px] border-b border-[#f7edd5] text-[14px] font-semibold uppercase tracking-[0.5px] transition hover:bg-[#fff5de] hover:text-[#cfa74a] ${
                  item === "Artigos Religiosos"
                    ? "text-[#cfa74a] bg-[#fff8e8]"
                    : "text-[#9f7a2f]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="px-5 pt-6 border-t border-[#f3e7c7] space-y-4">
            <div className="flex items-center gap-3 text-[#9f7a2f]">
              <Heart size={20} />
              Favoritos
            </div>

            <div className="flex items-center gap-3 text-[#9f7a2f]">
              <User size={20} />
              Minha conta
            </div>
          </div>
        </div>
      </div>
    </>
  );
}