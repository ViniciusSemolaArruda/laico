import { NextResponse } from "next/server";
import { cancelExpiredOrders } from "@/lib/orders/cancelExpiredOrders";

export async function GET() {
  const canceled = await cancelExpiredOrders();

  return NextResponse.json({
    success: true,
    canceled,
  });
}