/* eslint-disable react-hooks/set-state-in-effect */
"use client";

/* eslint-disable @next/next/no-img-element */

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

import type {
  TouchEvent,
} from "react";

type Banner = {
  id: string;
  title: string;
  image: string;
  mobileImage: string;
  alt: string;
  href: string | null;
  sortOrder: number;
};

type BannersResponse = {
  success?: boolean;
  banners?: Banner[];
  error?: string;
};

const AUTOPLAY_TIME =
  5000;

export default function BannerCarousel() {
  const [
    banners,
    setBanners,
  ] = useState<Banner[]>(
    []
  );

  const [
    currentBanner,
    setCurrentBanner,
  ] = useState(0);

  const [
    paused,
    setPaused,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    failed,
    setFailed,
  ] = useState(false);

  const touchStartX =
    useRef<number | null>(
      null
    );

  /*
   * =====================================================
   * CARREGAR BANNERS
   * =====================================================
   */

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadBanners() {
      try {
        setLoading(
          true
        );

        setFailed(
          false
        );

        const response =
          await fetch(
            "/api/banners",
            {
              method:
                "GET",

              cache:
                "no-store",

              signal:
                controller.signal,
            }
          );

        if (!response.ok) {
          throw new Error(
            "Não foi possível carregar os banners."
          );
        }

        const data =
          (await response.json()) as BannersResponse;

        if (
          !data.success ||
          !Array.isArray(
            data.banners
          )
        ) {
          throw new Error(
            data.error ||
              "Não foi possível carregar os banners."
          );
        }

        setBanners(
          data.banners
        );

        setCurrentBanner(
          0
        );
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        setFailed(
          true
        );

        setBanners(
          []
        );
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setLoading(
            false
          );
        }
      }
    }

    void loadBanners();

    return () => {
      controller.abort();
    };
  }, []);

  /*
   * Garante que o índice continue válido
   * se a quantidade de banners mudar.
   */

  useEffect(() => {
    if (
      banners.length ===
      0
    ) {
      setCurrentBanner(
        0
      );

      return;
    }

    setCurrentBanner(
      (current) =>
        Math.min(
          current,
          banners.length -
            1
        )
    );
  }, [banners.length]);

  /*
   * =====================================================
   * PRÓXIMO BANNER
   * =====================================================
   */

  const nextBanner =
    useCallback(() => {
      if (
        banners.length <=
        1
      ) {
        return;
      }

      setCurrentBanner(
        (current) =>
          (current + 1) %
          banners.length
      );
    }, [banners.length]);

  /*
   * =====================================================
   * BANNER ANTERIOR
   * =====================================================
   */

  const previousBanner =
    useCallback(() => {
      if (
        banners.length <=
        1
      ) {
        return;
      }

      setCurrentBanner(
        (current) =>
          (current -
            1 +
            banners.length) %
          banners.length
      );
    }, [banners.length]);

  /*
   * =====================================================
   * AUTOPLAY
   * =====================================================
   */

  useEffect(() => {
    if (
      paused ||
      banners.length <=
        1
    ) {
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
    banners.length,
  ]);

  /*
   * Pausa o carrossel quando a aba do
   * navegador não estiver visível.
   */

  useEffect(() => {
    function handleVisibilityChange() {
      setPaused(
        document.hidden
      );
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, []);

  /*
   * =====================================================
   * TOUCH / SWIPE
   * =====================================================
   */

  function handleTouchStart(
    event: TouchEvent<HTMLElement>
  ) {
    touchStartX.current =
      event.touches[0]
        ?.clientX ??
      null;
  }

  function handleTouchEnd(
    event: TouchEvent<HTMLElement>
  ) {
    if (
      touchStartX.current ===
        null ||
      banners.length <=
        1
    ) {
      touchStartX.current =
        null;

      return;
    }

    const touchEndX =
      event.changedTouches[0]
        ?.clientX;

    if (
      touchEndX ===
      undefined
    ) {
      touchStartX.current =
        null;

      return;
    }

    const difference =
      touchStartX.current -
      touchEndX;

    if (
      Math.abs(
        difference
      ) < 50
    ) {
      touchStartX.current =
        null;

      return;
    }

    if (
      difference > 0
    ) {
      nextBanner();
    } else {
      previousBanner();
    }

    touchStartX.current =
      null;
  }

  /*
   * =====================================================
   * ESTADOS INICIAIS
   * =====================================================
   */

  if (loading) {
    return (
      <section
        className="bannerLoading"
        aria-label="Carregando banners"
        aria-busy="true"
      >
        <div className="loadingGlow" />

        <style jsx>{`
          .bannerLoading {
            position: relative;

            width: 100%;

            /*
             * Área panorâmica usada no desktop.
             * A imagem original continua em alta resolução,
             * mas é enquadrada como um banner horizontal.
             */
            aspect-ratio:
              1920 / 500;

            max-height:
              500px;

            overflow: hidden;

            background:
              #f3ecdf;
          }

          .loadingGlow {
            position: absolute;

            inset: 0;

            background:
              linear-gradient(
                105deg,
                transparent
                  25%,
                rgba(
                    255,
                    255,
                    255,
                    0.65
                  )
                  45%,
                transparent
                  65%
              );

            transform:
              translateX(
                -100%
              );

            animation:
              loading
              1.4s
              infinite;
          }

          @keyframes loading {
            100% {
              transform:
                translateX(
                  100%
                );
            }
          }

          @media (
            min-width:
              1920px
          ) {
            .bannerLoading {
              height:
                500px;
            }
          }

          @media (
            max-width:
              600px
          ) {
            .bannerLoading {
              aspect-ratio:
                1 / 1;

              max-height:
                none;
            }
          }

          @media (
            prefers-reduced-motion:
              reduce
          ) {
            .loadingGlow {
              animation: none;
            }
          }
        `}</style>
      </section>
    );
  }

  /*
   * Se não existir nenhum banner ativo,
   * a seção não ocupa espaço na página.
   */

  if (
    failed ||
    banners.length ===
      0
  ) {
    return null;
  }

  const hasNavigation =
    banners.length > 1;

  return (
    <section
      className="bannerCarousel"
      aria-label="Banners promocionais"
      aria-roledescription="carrossel"
      onMouseEnter={() =>
        setPaused(true)
      }
      onMouseLeave={() =>
        setPaused(false)
      }
      onFocus={() =>
        setPaused(true)
      }
      onBlur={() =>
        setPaused(false)
      }
      onTouchStart={
        handleTouchStart
      }
      onTouchEnd={
        handleTouchEnd
      }
    >
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
            (
              banner,
              index
            ) => {
              const image = (
                <picture className="bannerPicture">
                  <source
                    media="(max-width: 600px)"
                    srcSet={
                      banner.mobileImage
                    }
                  />

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
                    loading={
                      index === 0
                        ? "eager"
                        : "lazy"
                    }
                    fetchPriority={
                      index === 0
                        ? "high"
                        : "auto"
                    }
                    className="bannerImage"
                  />
                </picture>
              );

              return (
                <div
                  key={
                    banner.id
                  }
                  className="bannerSlide"
                  aria-hidden={
                    currentBanner !==
                    index
                  }
                >
                  {banner.href ? (
                    <Link
                      href={
                        banner.href
                      }
                      className="bannerLink"
                      tabIndex={
                        currentBanner ===
                        index
                          ? 0
                          : -1
                      }
                      aria-label={
                        banner.title
                      }
                    >
                      {
                        image
                      }
                    </Link>
                  ) : (
                    image
                  )}
                </div>
              );
            }
          )}
        </div>
      </div>

      {hasNavigation && (
        <>
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
              strokeWidth={
                2
              }
            />
          </button>

          <button
            type="button"
            className="arrow arrowRight"
            onClick={
              nextBanner
            }
            aria-label="Próximo banner"
          >
            <ChevronRight
              size={30}
              strokeWidth={
                2
              }
            />
          </button>

          <div
            className="indicators"
            aria-label="Selecionar banner"
          >
            {banners.map(
              (
                banner,
                index
              ) => (
                <button
                  type="button"
                  key={
                    banner.id
                  }
                  aria-label={`Ir para o banner ${
                    index +
                    1
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
        </>
      )}

      <style jsx>{`
        .bannerCarousel {
          position: relative;

          width: 100%;

          /*
           * Formato panorâmico exibido no desktop,
           * igual ao layout anterior do site.
           */
          aspect-ratio:
            1920 / 500;

          max-height:
            500px;

          overflow: hidden;

          background:
            #f5efe3;

          user-select: none;

          isolation: isolate;
        }

        .bannerViewport {
          position: absolute;

          inset: 0;

          width: 100%;
          height: 100%;

          overflow: hidden;
        }

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

        .bannerSlide {
          position: relative;

          flex:
            0 0 100%;

          width: 100%;
          height: 100%;

          overflow: hidden;
        }

        .bannerLink {
          display: block;

          width: 100%;
          height: 100%;

          color: inherit;

          text-decoration:
            none;
        }

        .bannerPicture {
          display: block;

          width: 100%;
          height: 100%;
        }

        .bannerImage {
          display: block;

          width: 100%;
          height: 100%;

          /*
           * As dimensões e a proporção já são
           * validadas antes do cadastro.
           */
          object-fit: cover;

          object-position:
            center;

          pointer-events:
            none;

          -webkit-user-drag:
            none;
        }

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
            translateY(
              -50%
            );

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

        .arrow:focus-visible,
        .indicator:focus-visible,
        .bannerLink:focus-visible {
          outline:
            3px solid
            #b98218;

          outline-offset:
            -3px;
        }

        .arrow:active {
          transform:
            translateY(
              -50%
            )
            scale(
              0.94
            );
        }

        .arrowLeft {
          left: 0;

          border-radius:
            0 14px 14px 0;
        }

        .arrowRight {
          right: 0;

          border-radius:
            14px 0 0 14px;
        }

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
            translateX(
              -50%
            );
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

        @media (
          min-width:
            1920px
        ) {
          .bannerCarousel {
            height:
              500px;
          }
        }

        @media (
          max-width:
            1100px
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

        @media (
          max-width:
            600px
        ) {
          .bannerCarousel {
            /*
             * A versão mobile possui
             * exatamente 1254 × 1254 px.
             */
            aspect-ratio:
              1 / 1;

            max-height:
              none;
          }

          .bannerImage {
            object-fit: cover;

            object-position:
              center;
          }

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
            border-radius:
              0 12px 12px 0;
          }

          .arrowRight {
            border-radius:
              12px 0 0 12px;
          }

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

        @media (
          max-width:
            380px
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

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          .bannerTrack {
            transition: none;
          }

          .arrow,
          .indicator {
            transition: none;
          }
        }
      `}</style>
    </section>
  );
}