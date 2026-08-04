import "dotenv/config";

// Adjusted import path to resolvedule from this file's location
import { prisma } from "../lib/prisma";

const productSlug =
  "kit-12-enfeite-metal-nossa-senhora-aparecida";

async function main() {
  const product = await prisma.product.findUnique({
    where: {
      slug: productSlug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
    },
  });

  if (!product) {
    throw new Error(
      `Produto não encontrado: ${productSlug}`
    );
  }

  console.log("Produto encontrado:", {
    name: product.name,
    currentPrice: product.price.toString(),
  });

  const updatedProduct =
    await prisma.product.update({
      where: {
        slug: productSlug,
      },
      data: {
        price: 10,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
      },
    });

  console.log("Preço atualizado:", {
    name: updatedProduct.name,
    newPrice:
      updatedProduct.price.toString(),
  });
}

main()
  .catch((error) => {
    console.error(
      "Erro ao atualizar produto:",
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });