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
  /*
   * Duplicação necessária para
   * criar o movimento infinito.
   */
  const repeatedMessages = [
    ...messages,
    ...messages,
  ];

  return (
    <div
      className="promotionalBar"
      role="region"
      aria-label="Informações e benefícios da loja"
    >
      <div className="promotionalTrack">
        {repeatedMessages.map(
          (message, index) => {
            const Icon =
              message.icon;

            return (
              <div
                key={`${message.text}-${index}`}
                className="promotionalItem"
                aria-hidden={
                  index >=
                  messages.length
                }
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

      <style jsx>{`
        /* =====================================================
           FAIXA PRINCIPAL
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
        }

        /* =====================================================
           TRILHO DA ANIMAÇÃO
        ===================================================== */

        .promotionalTrack {
          display: flex;
          align-items: center;

          width: max-content;
          height: 100%;

          white-space: nowrap;

          animation:
            promotionalScroll
            34s
            linear
            infinite;

          will-change: transform;
        }

        /* =====================================================
           CADA MENSAGEM
        ===================================================== */

        .promotionalItem {
          display: flex;
          align-items: center;
          flex-shrink: 0;

          height: 100%;

          gap: 9px;

          padding: 0 30px;
        }

        /* =====================================================
           TEXTO
        ===================================================== */

        .promotionalText {
          color: #ffffff;

          font-size: 15px;
          font-weight: 800;

          line-height: 1;

          letter-spacing: 0.35px;

          text-transform: uppercase;

          /*
           * Contorno escuro bem sutil.
           * Dá contraste sem deixar o
           * texto visualmente pesado.
           */
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
           ÍCONES
        ===================================================== */

        .promotionalIcon {
          flex-shrink: 0;

          color: #ffffff;

          filter:
            drop-shadow(
              0 1px 0
              rgba(
                59,
                38,
                6,
                0.95
              )
            )
            drop-shadow(
              0 0 1px
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
          margin-left: 22px;

          color: #ffffff;

          font-size: 17px;
          font-weight: 900;

          line-height: 1;

          text-shadow:
            0 1px 1px
              rgba(
                59,
                38,
                6,
                0.8
              );
        }

        /* =====================================================
           ANIMAÇÃO
        ===================================================== */

        @keyframes promotionalScroll {
          from {
            transform:
              translateX(0);
          }

          to {
            transform:
              translateX(-50%);
          }
        }

        /*
         * Pausa ao passar o mouse.
         */
        .promotionalBar:hover
          .promotionalTrack {
          animation-play-state:
            paused;
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
              0 22px;
          }

          .promotionalText {
            /*
             * Continua grande mesmo
             * no celular.
             */
            font-size: 13px;

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
            margin-left: 16px;

            font-size: 15px;
          }

          .promotionalTrack {
            animation-duration:
              30s;
          }
        }

        /* =====================================================
           TELAS MUITO PEQUENAS
        ===================================================== */

        @media (max-width: 420px) {
          .promotionalBar {
            height: 35px;
            min-height: 35px;
          }

          .promotionalItem {
            padding:
              0 18px;
          }

          .promotionalText {
            font-size: 12.5px;

            font-weight: 800;
          }
        }

        /* =====================================================
           ACESSIBILIDADE
        ===================================================== */

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          .promotionalTrack {
            animation-play-state:
              paused;
          }
        }
      `}</style>
    </div>
  );
}