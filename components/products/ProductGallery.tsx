"use client";

import {
  useState,
} from "react";

type GalleryImage = {
  id: string;
  url: string;

  alt:
    | string
    | null;
};

export default function ProductGallery({
  productName,
  images,
}: {
  productName: string;

  images:
    GalleryImage[];
}) {
  const [
    selectedIndex,
    setSelectedIndex,
  ] =
    useState(
      0
    );

  const selectedImage =
    images[
      selectedIndex
    ] ||
    images[
      0
    ];

  if (
    !selectedImage
  ) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-[#e8dcc2] bg-[#faf9f6] text-sm text-neutral-400">
        Imagem
        indisponível
      </div>
    );
  }

  return (
    <section
      aria-label={`Galeria de imagens de ${productName}`}
    >
      {/* IMAGEM PRINCIPAL */}

      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white p-5 shadow-sm sm:p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}

        <img
          src={
            selectedImage.url
          }
          alt={
            selectedImage.alt ||
            productName
          }
          className="max-h-full max-w-full object-contain mix-blend-multiply"
        />
      </div>

      {/* MINIATURAS */}

      {images.length >
        1 && (
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map(
            (
              image,
              index
            ) => (
              <button
                key={
                  image.id
                }
                type="button"
                onClick={() =>
                  setSelectedIndex(
                    index
                  )
                }
                aria-label={`Ver imagem ${index + 1} de ${productName}`}
                aria-pressed={
                  selectedIndex ===
                  index
                }
                className={`flex aspect-square items-center justify-center overflow-hidden rounded-xl border bg-white p-2 transition ${
                  selectedIndex ===
                  index
                    ? "border-[#b98218] ring-2 ring-[#b98218]/20"
                    : "border-[#e8dcc2] hover:border-[#d9b66b]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}

                <img
                  src={
                    image.url
                  }
                  alt=""
                  className="max-h-full max-w-full object-contain mix-blend-multiply"
                />
              </button>
            )
          )}
        </div>
      )}
    </section>
  );
}