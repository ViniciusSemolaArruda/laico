import AdminShell from "@/app/components/admin/AdminShell";
import EditProductForm from "@/app/components/admin/EditProductForm";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function isValidProductId(
  id: string
) {
  return /^[a-zA-Z0-9_-]{10,100}$/.test(
    id
  );
}

export default async function EditProductPage({
  params,
}: Props) {
  /*
   * AUTORIZAÇÃO
   */

  try {
    await requireAdminPermission(
      "PRODUCTS",
      "EDIT"
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "ADMIN_UNAUTHORIZED"
    ) {
      redirect(
        "/admin/login"
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "ADMIN_FORBIDDEN"
    ) {
      redirect(
        "/admin/acesso-negado?redirect=/admin/produtos"
      );
    }

    throw error;
  }

  const {
    id,
  } =
    await params;

  if (
    !id ||
    !isValidProductId(
      id
    )
  ) {
    notFound();
  }

  /*
   * Consulta somente depois da autorização.
   */

  const product =
    await prisma.product.findFirst({
      where: {
        id,

        archivedAt:
          null,
      },

      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,

        shortDescription:
          true,

        description:
          true,

        price: true,
        salePrice: true,
        cost: true,

        category: true,

        religion: true,
        religions: true,

        stock: true,

        minimumStock:
          true,

        weight: true,
        height: true,
        width: true,
        length: true,

        featured: true,
        active: true,

        seoTitle: true,
        seoDescription:
          true,

        image: true,

        images: {
          select: {
            id: true,
            url: true,
            publicId: true,
            position: true,
            isPrimary: true,
          },

          orderBy: {
            position:
              "asc",
          },
        },
      },
    });

  if (!product) {
    notFound();
  }

  /*
   * Somente imagens gerenciadas pelo Cloudinary
   * entram na nova galeria.
   */

  const gallery =
    product.images
      .filter(
        (
          image
        ): image is typeof image & {
          publicId: string;
        } =>
          Boolean(
            image.publicId
          )
      )
      .map(
        (image) => ({
          id:
            image.id,

          url:
            image.url,

          publicId:
            image.publicId,

          isPrimary:
            image.isPrimary,
        })
      );

  return (
    <AdminShell
      title="Editar produto"
      description={`Editando ${product.name}`}
    >
      <EditProductForm
        initialProduct={{
          id:
            product.id,

          name:
            product.name,

          slug:
            product.slug,

          sku:
            product.sku,

          shortDescription:
            product.shortDescription,

          description:
            product.description,

          price:
            String(
              product.price
            ),

          salePrice:
            product.salePrice
              ? String(
                  product.salePrice
                )
              : "",

          cost:
            product.cost
              ? String(
                  product.cost
                )
              : "",

          category:
            product.category,

          religions:
            product.religions.length
              ? product.religions
              : [
                  product.religion,
                ],

          stock:
            String(
              product.stock
            ),

          minimumStock:
            String(
              product.minimumStock
            ),

          weight:
            product.weight
              ? String(
                  product.weight
                )
              : "",

          height:
            product.height
              ? String(
                  product.height
                )
              : "",

          width:
            product.width
              ? String(
                  product.width
                )
              : "",

          length:
            product.length
              ? String(
                  product.length
                )
              : "",

          featured:
            product.featured,

          active:
            product.active,

          seoTitle:
            product.seoTitle,

          seoDescription:
            product.seoDescription,

          legacyImage:
            product.image,

          images:
            gallery,
        }}
      />
    </AdminShell>
  );
}