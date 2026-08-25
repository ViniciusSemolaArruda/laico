import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

function jsonResponse(
  body: Record<
    string,
    unknown
  >,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        /*
         * Garante que alterações feitas no painel
         * apareçam imediatamente na página inicial.
         */
        "Cache-Control":
          "no-store, no-cache, must-revalidate",

        Pragma:
          "no-cache",

        "X-Content-Type-Options":
          "nosniff",
      },
    }
  );
}

/*
 * =========================================================
 * GET
 * Retorna somente os banners ativos da área pública.
 * =========================================================
 */

export async function GET() {
  try {
    const banners =
      await prisma.banner.findMany({
        where: {
          active: true,
        },

        orderBy: [
          {
            sortOrder:
              "asc",
          },

          {
            createdAt:
              "asc",
          },
        ],

        /*
         * A API pública expõe somente os campos
         * necessários para montar o carrossel.
         *
         * PublicIds do Cloudinary não são enviados.
         */
        select: {
          id: true,

          title: true,
          alt: true,

          desktopImageUrl:
            true,

          mobileImageUrl:
            true,

          href: true,
          sortOrder: true,
        },
      });

    return jsonResponse({
      success: true,

      banners:
        banners.map(
          (banner) => ({
            id:
              banner.id,

            title:
              banner.title,

            alt:
              banner.alt,

            image:
              banner.desktopImageUrl,

            mobileImage:
              banner.mobileImageUrl,

            href:
              banner.href,

            sortOrder:
              banner.sortOrder,
          })
        ),
    });
  } catch (error) {
    console.error(
      "Erro ao carregar banners públicos:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        success:
          false,

        error:
          "Não foi possível carregar os banners.",

        banners: [],
      },
      500
    );
  }
}