"use client";

import {
  Gift,
  Heart,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

const messages = [
  {
    icon: Truck,
    text: "Frete Grátis acima de R$1000* para todo o Brasil",
  },
  {
    icon: Sparkles,
    text: "Artigos religiosos selecionados com carinho e qualidade",
  },
  {
    icon: Heart,
    text: "Produtos especiais para fortalecer e expressar a sua fé",
  },
  {
    icon: Gift,
    text: "Presentes religiosos para momentos e pessoas especiais",
  },
  {
    icon: ShieldCheck,
    text: "Compra segura e envio para todo o Brasil",
  },
];

export default function PromotionalBar() {
  return (
    <div
      className="promotionalBar"
      role="region"
      aria-label="Informações e benefícios da loja"
    >
      <div className="promotionalTrack">
        {/* ===============================================
            PRIMEIRA CÓPIA
        ================================================ */}

        <div className="promotionalGroup">
          {messages.map(
            (message) => {
              const Icon =
                message.icon;

              return (
                <div
                  key={`first-${message.text}`}
                  className="promotionalItem"
                >
                  <Icon
                    size={18}
                    strokeWidth={2.7}
                    className="promotionalIcon"
                  />

                  <span className="promotionalText">
                    {message.text}
                  </span>

                  <span
                    className="promotionalSeparator"
                    aria-hidden="true"
                  >
                    •
                  </span>
                </div>
              );
            }
          )}
        </div>

        {/* ===============================================
            SEGUNDA CÓPIA

            Garante loop perfeitamente contínuo.
        ================================================ */}

        <div
          className="promotionalGroup"
          aria-hidden="true"
        >
          {messages.map(
            (message) => {
              const Icon =
                message.icon;

              return (
                <div
                  key={`second-${message.text}`}
                  className="promotionalItem"
                >
                  <Icon
                    size={18}
                    strokeWidth={2.7}
                    className="promotionalIcon"
                  />

                  <span className="promotionalText">
                    {message.text}
                  </span>

                  <span
                    className="promotionalSeparator"
                    aria-hidden="true"
                  >
                    •
                  </span>
                </div>
              );
            }
          )}
        </div>
      </div>

      <style jsx>{`
        /* =====================================================
           FAIXA
        ===================================================== */

        .promotionalBar {
          position: relative;

          display: flex;
          align-items: center;

          width: 100%;
          height: 38px;
          min-height: 38px;

          overflow: hidden;

          background: linear-gradient(
            90deg,
            #b8872b 0%,
            #c99a37 20%,
            #ddb954 50%,
            #c99a37 80%,
            #b8872b 100%
          );

          color: #ffffff;

          /*
           * Impede problemas de renderização
           * em alguns navegadores mobile.
           */
          transform: translateZ(0);

          -webkit-transform:
            translateZ(0);

          contain: paint;
        }


        /* =====================================================
           TRILHO
        ===================================================== */

        .promotionalTrack {
          display: flex;
          align-items: center;

          flex: none;

          width: max-content;
          min-width: max-content;
          height: 100%;

          white-space: nowrap;

          /*
           * Animação.
           */
          animation-name:
            promotionalScroll;

          animation-duration:
            34s;

          animation-timing-function:
            linear;

          animation-iteration-count:
            infinite;

          /*
           * Ajuda Safari, iPhone e Android.
           */
          will-change: transform;

          transform:
            translate3d(
              0,
              0,
              0
            );

          -webkit-transform:
            translate3d(
              0,
              0,
              0
            );

          backface-visibility:
            hidden;

          -webkit-backface-visibility:
            hidden;
        }


        /* =====================================================
           GRUPO

           São duas cópias exatamente iguais.
        ===================================================== */

        .promotionalGroup {
          display: flex;
          align-items: center;

          flex: none;

          width: max-content;
          height: 100%;
        }


        /* =====================================================
           ITEM
        ===================================================== */

        .promotionalItem {
          display: flex;
          align-items: center;

          flex: none;

          height: 100%;

          gap: 9px;

          padding:
            0
            30px;
        }


        /* =====================================================
           TEXTO
        ===================================================== */

        .promotionalText {
          flex: none;

          color: #ffffff;

          font-size: 15px;
          font-weight: 800;

          line-height: 1;

          letter-spacing:
            0.35px;

          text-transform:
            uppercase;

          white-space:
            nowrap;

          -webkit-text-stroke:
            0.25px
            rgba(
              66,
              43,
              9,
              0.8
            );

          text-shadow:
            0 1px 1px
              rgba(
                59,
                38,
                6,
                0.75
              ),
            0 0 1px
              rgba(
                0,
                0,
                0,
                0.5
              );
        }


        /* =====================================================
           ÍCONE
        ===================================================== */

        .promotionalIcon {
          flex: none;

          color: #ffffff;

          filter:
            drop-shadow(
              0
              1px
              0
              rgba(
                59,
                38,
                6,
                0.95
              )
            )
            drop-shadow(
              0
              0
              1px
              rgba(
                0,
                0,
                0,
                0.7
              )
            );
        }


        /* =====================================================
           SEPARADOR
        ===================================================== */

        .promotionalSeparator {
          flex: none;

          margin-left:
            22px;

          color: #ffffff;

          font-size: 17px;
          font-weight: 900;

          line-height: 1;

          text-shadow:
            0
            1px
            1px
            rgba(
              59,
              38,
              6,
              0.8
            );
        }


        /* =====================================================
           ANIMAÇÃO

           Move exatamente uma das duas cópias.
        ===================================================== */

        @keyframes promotionalScroll {
          0% {
            transform:
              translate3d(
                0,
                0,
                0
              );
          }

          100% {
            transform:
              translate3d(
                -50%,
                0,
                0
              );
          }
        }


        /* =====================================================
           HOVER SOMENTE EM COMPUTADOR

           Isso é importante.

           Em celular/tablet, :hover pode ficar travado.
        ===================================================== */

        @media
          (hover: hover) and
          (pointer: fine) {

          .promotionalBar:hover
            .promotionalTrack {
            animation-play-state:
              paused;
          }
        }


        /* =====================================================
           TABLET / CELULAR
        ===================================================== */

        @media (max-width: 768px) {
          .promotionalBar {
            height: 36px;
            min-height: 36px;
          }

          .promotionalItem {
            gap: 7px;

            padding:
              0
              22px;
          }

          .promotionalText {
            font-size:
              13px;

            letter-spacing:
              0.25px;

            -webkit-text-stroke:
              0.2px
              rgba(
                66,
                43,
                9,
                0.8
              );
          }

          .promotionalSeparator {
            margin-left:
              16px;

            font-size:
              15px;
          }

          .promotionalTrack {
            animation-duration:
              30s;
          }
        }


        /* =====================================================
           CELULARES PEQUENOS
        ===================================================== */

        @media (max-width: 420px) {
          .promotionalBar {
            height: 35px;
            min-height: 35px;
          }

          .promotionalItem {
            padding:
              0
              18px;
          }

          .promotionalText {
            font-size:
              12.5px;

            font-weight:
              800;
          }

          .promotionalTrack {
            animation-duration:
              27s;
          }
        }
      `}</style>
    </div>
  );
}