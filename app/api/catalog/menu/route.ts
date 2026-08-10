import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MENU_CATEGORIES = [
  "Acessórios",
  "Vestuário",
  "Imagem Religiosa",
] as const;

export async function GET() {
  try {
    const rows = await prisma.product.findMany({
      where: {
        active: true,
        archivedAt: null,
        category: {
          in: [...MENU_CATEGORIES],
        },
      },
      select: {
        category: true,
      },
      distinct: ["category"],
    });

    const available = new Set(rows.map((row) => row.category));

    const categories = MENU_CATEGORIES.filter((category) =>
      available.has(category),
    );

    return NextResponse.json(
      {
        success: true,
        categories,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=300",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    console.error(
      "Erro ao carregar categorias do catálogo:",
      error instanceof Error ? error.name : "UnknownError",
    );

    return NextResponse.json(
      {
        success: false,
        categories: [],
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
}