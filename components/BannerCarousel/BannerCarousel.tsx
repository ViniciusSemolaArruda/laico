"use client";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Banner = {
  id: number;
  image: string;
  mobileImage?: string;
  alt: string;
  href?: string;
};

const banners: Banner[] = [
  {
    id: 1,

    /*
     * DESKTOP
     */
    image:
      "/banners/banner-1.webp",

    /*
     * MOBILE
     */
    mobileImage:
      "/banners/banner-1-mobile.webp",

    alt: "Um presente de fé para quem sempre cuidou de você",

    href: "/produtos",
  },

  {
    id: 2,

    image:
      "/banners/banner-2.webp",

    /*
    /*
     * MOBILE
     */
    mobileImage:
      "/banners/banner-2-mobile.webp",

    alt: "Fé que transforma a casa em um lar",

    href: "/produtos",
  },

  {
    id: 3,

    image:
      "/banners/banner-3.webp",

    /*
     * MOBILE
     */
    mobileImage:
      "/banners/banner-3-mobile.webp",

    alt: "Sua fé, sua história, Laico",

    href: "/produtos",
  },
];

const AUTOPLAY_TIME = 5000;

export default function BannerCarousel() {
  const [
    currentBanner,
    setCurrentBanner,
  ] = useState(0);

  const [
    paused,
    setPaused,
  ] = useState(false);

  const touchStartX =
    useRef<number | null>(
      null
    );

  /*
   * =====================================================
   * PRÓXIMO BANNER
   * =====================================================
   */

  const nextBanner =
    useCallback(() => {
      setCurrentBanner(
        (current) =>
          (current + 1) %
          banners.length
      );
    }, []);

  /*
   * =====================================================
   * BANNER ANTERIOR
   * =====================================================
   */

  const previousBanner =
    useCallback(() => {
      setCurrentBanner(
        (current) =>
          (current -
            1 +
            banners.length) %
          banners.length
      );
    }, []);

  /*
   * =====================================================
   * AUTOPLAY
   * =====================================================
   */

  useEffect(() => {
    if (paused) {
      return;
    }

    const interval =
      window.setInterval(
        nextBanner,
        AUTOPLAY_TIME
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    paused,
    nextBanner,
  ]);

  /*
   * =====================================================
   * TOUCH / SWIPE
   * =====================================================
   */

  function handleTouchStart(
    event: React.TouchEvent
  ) {
    touchStartX.current =
      event.touches[0]
        .clientX;
  }

  function handleTouchEnd(
    event: React.TouchEvent
  ) {
    if (
      touchStartX.current ===
      null
    ) {
      return;
    }

    const touchEndX =
      event.changedTouches[0]
        .clientX;

    const difference =
      touchStartX.current -
      touchEndX;

    /*
     * Evita trocar o banner
     * por um toque muito pequeno.
     */
    if (
      Math.abs(difference) <
      50
    ) {
      touchStartX.current =
        null;

      return;
    }

    if (difference > 0) {
      nextBanner();
    } else {
      previousBanner();
    }

    touchStartX.current =
      null;
  }

  return (
    <section
      className="bannerCarousel"
      aria-label="Banners promocionais"
      onMouseEnter={() =>
        setPaused(true)
      }
      onMouseLeave={() =>
        setPaused(false)
      }
      onTouchStart={
        handleTouchStart
      }
      onTouchEnd={
        handleTouchEnd
      }
    >
      {/* ===============================================
          VIEWPORT
      =============================================== */}

      <div className="bannerViewport">
        <div
          className="bannerTrack"
          style={{
            transform: `translateX(-${
              currentBanner *
              100
            }%)`,
          }}
        >
          {banners.map(
            (banner) => (
              <div
                key={banner.id}
                className="bannerSlide"
              >
                {banner.href ? (
                  <Link
                    href={
                      banner.href
                    }
                    className="bannerLink"
                  >
                    <picture className="bannerPicture">
                      {/* ===================================
                          IMAGEM MOBILE
                      =================================== */}

                      {banner.mobileImage && (
                        <source
                          media="(max-width: 600px)"
                          srcSet={
                            banner.mobileImage
                          }
                        />
                      )}

                      {/* ===================================
                          IMAGEM DESKTOP
                      =================================== */}

                      <img
                        src={
                          banner.image
                        }
                        alt={
                          banner.alt
                        }
                        draggable={
                          false
                        }
                        className={`bannerImage ${
                          banner.mobileImage
                            ? "hasMobileImage"
                            : "desktopOnlyImage"
                        }`}
                      />
                    </picture>
                  </Link>
                ) : (
                  <picture className="bannerPicture">
                    {banner.mobileImage && (
                      <source
                        media="(max-width: 600px)"
                        srcSet={
                          banner.mobileImage
                        }
                      />
                    )}

                    <img
                      src={
                        banner.image
                      }
                      alt={
                        banner.alt
                      }
                      draggable={
                        false
                      }
                      className={`bannerImage ${
                        banner.mobileImage
                          ? "hasMobileImage"
                          : "desktopOnlyImage"
                      }`}
                    />
                  </picture>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* ===============================================
          SETA ESQUERDA
      =============================================== */}

      <button
        type="button"
        className="arrow arrowLeft"
        onClick={
          previousBanner
        }
        aria-label="Banner anterior"
      >
        <ChevronLeft
          size={30}
          strokeWidth={2}
        />
      </button>

      {/* ===============================================
          SETA DIREITA
      =============================================== */}

      <button
        type="button"
        className="arrow arrowRight"
        onClick={nextBanner}
        aria-label="Próximo banner"
      >
        <ChevronRight
          size={30}
          strokeWidth={2}
        />
      </button>

      {/* ===============================================
          INDICADORES
      =============================================== */}

      <div
        className="indicators"
        aria-label="Selecionar banner"
      >
        {banners.map(
          (banner, index) => (
            <button
              type="button"
              key={banner.id}
              aria-label={`Ir para o banner ${
                index + 1
              }`}
              aria-current={
                currentBanner ===
                index
                  ? "true"
                  : undefined
              }
              className={`indicator ${
                currentBanner ===
                index
                  ? "indicatorActive"
                  : ""
              }`}
              onClick={() =>
                setCurrentBanner(
                  index
                )
              }
            />
          )
        )}
      </div>

      <style jsx>{`
        /* =====================================================
           CARROSSEL
        ===================================================== */

        .bannerCarousel {
          position: relative;

          width: 100%;

          /*
           * DESKTOP:
           * banners 1920 × 500
           */
          aspect-ratio:
            1920 / 500;

          overflow: hidden;

          background: #f5efe3;

          user-select: none;
        }

        /* =====================================================
           VIEWPORT
        ===================================================== */

        .bannerViewport {
          position: absolute;

          inset: 0;

          width: 100%;
          height: 100%;

          overflow: hidden;
        }

        /* =====================================================
           TRACK
        ===================================================== */

        .bannerTrack {
          display: flex;

          width: 100%;
          height: 100%;

          transition:
            transform
            700ms
            cubic-bezier(
              0.65,
              0,
              0.35,
              1
            );

          will-change:
            transform;
        }

        /* =====================================================
           SLIDE
        ===================================================== */

        .bannerSlide {
          position: relative;

          flex:
            0 0 100%;

          width: 100%;
          height: 100%;

          overflow: hidden;
        }

        /* =====================================================
           LINK
        ===================================================== */

        .bannerLink {
          display: block;

          width: 100%;
          height: 100%;
        }

        /* =====================================================
           PICTURE
        ===================================================== */

        .bannerPicture {
          display: block;

          width: 100%;
          height: 100%;
        }

        /* =====================================================
           IMAGEM
        ===================================================== */

        .bannerImage {
          display: block;

          width: 100%;
          height: 100%;

          object-fit: cover;

          object-position:
            center center;

          pointer-events: none;

          -webkit-user-drag:
            none;
        }

        /* =====================================================
           SETAS
        ===================================================== */

        .arrow {
          position: absolute;

          top: 50%;
          z-index: 10;

          display: flex;
          align-items: center;
          justify-content: center;

          width: 42px;
          height: 54px;

          padding: 0;

          border: 0;

          color: #8b671b;

          background:
            rgba(
              255,
              255,
              255,
              0.9
            );

          cursor: pointer;

          transform:
            translateY(-50%);

          box-shadow:
            0 3px 12px
            rgba(
              0,
              0,
              0,
              0.12
            );

          backdrop-filter:
            blur(5px);

          -webkit-backdrop-filter:
            blur(5px);

          transition:
            color
              200ms ease,
            background
              200ms ease,
            transform
              200ms ease,
            box-shadow
              200ms ease;
        }

        .arrow:hover {
          color: #b8872b;

          background:
            #ffffff;

          box-shadow:
            0 5px 18px
            rgba(
              0,
              0,
              0,
              0.18
            );
        }

        .arrow:active {
          transform:
            translateY(-50%)
            scale(0.94);
        }

        /* =====================================================
           SETA ESQUERDA
        ===================================================== */

        .arrowLeft {
          left: 0;

          border-radius:
            0 14px 14px 0;
        }

        /* =====================================================
           SETA DIREITA
        ===================================================== */

        .arrowRight {
          right: 0;

          border-radius:
            14px 0 0 14px;
        }

        /* =====================================================
           INDICADORES
        ===================================================== */

        .indicators {
          position: absolute;

          left: 50%;
          bottom: 16px;
          z-index: 11;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 8px;

          transform:
            translateX(-50%);
        }

        .indicator {
          width: 54px;
          height: 5px;

          padding: 0;

          border: none;

          border-radius:
            999px;

          background:
            rgba(
              255,
              255,
              255,
              0.58
            );

          cursor: pointer;

          box-shadow:
            0 1px 4px
            rgba(
              0,
              0,
              0,
              0.18
            );

          transition:
            width
              250ms ease,
            background-color
              250ms ease,
            opacity
              250ms ease;
        }

        .indicator:hover {
          background:
            rgba(
              255,
              255,
              255,
              0.9
            );
        }

        .indicatorActive {
          width: 64px;

          background:
            #ffffff;
        }

        /* =====================================================
           MONITORES GRANDES
        ===================================================== */

        @media (
          min-width: 1920px
        ) {
          .bannerCarousel {
            max-height: 500px;
          }
        }

        /* =====================================================
           TABLETS / NOTEBOOKS
        ===================================================== */

        @media (
          max-width: 1100px
        ) {
          .arrow {
            width: 38px;
            height: 48px;
          }

          .indicators {
            bottom: 12px;
          }

          .indicator {
            width: 40px;
            height: 4px;
          }

          .indicatorActive {
            width: 48px;
          }
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (
          max-width: 600px
        ) {
          /*
           * Agora o carrossel realmente
           * muda de formato no celular.
           *
           * Desktop = 1920 × 500
           * Mobile  = 1080 × 1080
           */
          .bannerCarousel {
            width: 100%;

            aspect-ratio:
              1 / 1;

            max-height: none;

            background:
              #f5efe3;
          }

          /*
           * Os banners que possuem uma
           * imagem mobile usam cover.
           */
          .hasMobileImage {
            object-fit: cover;

            object-position:
              center center;
          }

          /*
           * Enquanto os banners 2 e 3
           * ainda não possuem versão
           * mobile, mostramos a imagem
           * inteira sem cortar.
           *
           * Quando criarmos as versões
           * mobile deles, esta regra
           * deixa de ser usada nesses
           * banners.
           */
          .desktopOnlyImage {
            object-fit: contain;

            object-position:
              center center;
          }

          /* =============================================
             SETAS MOBILE
          ============================================= */

          .arrow {
            width: 34px;
            height: 46px;

            color: #916b1c;

            background:
              rgba(
                255,
                255,
                255,
                0.9
              );

            box-shadow:
              0 2px 10px
              rgba(
                0,
                0,
                0,
                0.12
              );
          }

          .arrowLeft {
            left: 0;

            border-radius:
              0 12px 12px 0;
          }

          .arrowRight {
            right: 0;

            border-radius:
              12px 0 0 12px;
          }

          /* =============================================
             INDICADORES MOBILE
          ============================================= */

          .indicators {
            bottom: 10px;

            gap: 6px;
          }

          .indicator {
            width: 24px;
            height: 4px;

            background:
              rgba(
                255,
                255,
                255,
                0.65
              );

            box-shadow:
              0 1px 4px
              rgba(
                0,
                0,
                0,
                0.25
              );
          }

          .indicatorActive {
            width: 34px;

            background:
              #ffffff;
          }
        }

        /* =====================================================
           CELULARES PEQUENOS
        ===================================================== */

        @media (
          max-width: 380px
        ) {
          .arrow {
            width: 30px;
            height: 42px;
          }

          .indicators {
            bottom: 8px;

            gap: 5px;
          }

          .indicator {
            width: 20px;
            height: 3px;
          }

          .indicatorActive {
            width: 28px;
          }
        }

        /* =====================================================
           ACESSIBILIDADE
        ===================================================== */

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          .bannerTrack {
            transition: none;
          }
        }
      `}</style>
    </section>
  );
}