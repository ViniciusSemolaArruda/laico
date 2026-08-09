import type {
  Prisma,
} from "@prisma/client";

type RestoreOrderStockOptions = {
  transaction:
    Prisma.TransactionClient;

  orderId: string;

  actorId?:
    | string
    | null;

  reason: string;

  note?:
    | string
    | null;
};

type RestoreOrderStockResult = {
  restoredProducts: number;
  restoredUnits: number;
};

/**
 * Devolve apenas o estoque que foi realmente
 * reservado pelo checkout para este pedido.
 *
 * Pedidos antigos que não possuem uma movimentação
 * ORDER_RESERVATION não terão o estoque aumentado.
 *
 * A restrição única:
 *
 * orderId + productId + type
 *
 * impede que o mesmo produto seja devolvido duas vezes.
 */
export async function restoreOrderReservedStock({
  transaction,
  orderId,
  actorId = null,
  reason,
  note = null,
}: RestoreOrderStockOptions): Promise<RestoreOrderStockResult> {
  /*
   * Localizamos exclusivamente as reservas
   * registradas durante a criação do pedido.
   */
  const reservations =
    await transaction.productStockMovement.findMany({
      where: {
        orderId,

        type:
          "ORDER_RESERVATION",
      },

      select: {
        productId:
          true,

        quantity:
          true,
      },
    });

  let restoredProducts =
    0;

  let restoredUnits =
    0;

  for (
    const reservation of
    reservations
  ) {
    /*
     * Defesa explícita contra uma devolução
     * já realizada anteriormente.
     */
    const previousRestore =
      await transaction.productStockMovement.findFirst({
        where: {
          orderId,

          productId:
            reservation.productId,

          type:
            "ORDER_RESTORE",
        },

        select: {
          id:
            true,
        },
      });

    if (
      previousRestore
    ) {
      continue;
    }

    /*
     * increment é uma operação atômica do banco.
     *
     * O valor retornado representa o saldo real
     * depois desta devolução.
     */
    const updatedProduct =
      await transaction.product.update({
        where: {
          id:
            reservation.productId,
        },

        data: {
          stock: {
            increment:
              reservation.quantity,
          },
        },

        select: {
          stock:
            true,
        },
      });

    const newStock =
      updatedProduct.stock;

    const previousStock =
      newStock -
      reservation.quantity;

    /*
     * Registramos a devolução no histórico
     * permanente de estoque.
     *
     * Se outra transação tentar criar a mesma
     * devolução, a restrição única do banco
     * rejeitará a operação e toda a transação
     * será revertida.
     */
    await transaction.productStockMovement.create({
      data: {
        productId:
          reservation.productId,

        actorId,

        orderId,

        type:
          "ORDER_RESTORE",

        quantity:
          reservation.quantity,

        previousStock,

        newStock,

        reason,

        note,
      },
    });

    restoredProducts +=
      1;

    restoredUnits +=
      reservation.quantity;
  }

  return {
    restoredProducts,
    restoredUnits,
  };
}