import { NextResponse } from "next/server";

import {
  getCustomerSession,
} from "@/lib/customer-auth";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const session =
      await getCustomerSession();

    if (!session) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        {
          headers: {
            "Cache-Control":
              "private, no-store, no-cache, must-revalidate",

            Pragma:
              "no-cache",
          },
        }
      );
    }

    /*
     * O Header não precisa receber:
     *
     * - userId;
     * - e-mail;
     * - telefone;
     * - tokens;
     * - dados da sessão.
     *
     * Somente o primeiro nome.
     */
    const firstName =
      session.name
        .trim()
        .split(/\s+/)[0]
        ?.slice(0, 60) ||
      "Cliente";

    return NextResponse.json(
      {
        authenticated: true,
        firstName,
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store, no-cache, must-revalidate",

          Pragma:
            "no-cache",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store, no-cache, must-revalidate",

          Pragma:
            "no-cache",
        },
      }
    );
  }
}