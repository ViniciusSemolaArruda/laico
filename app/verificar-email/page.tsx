import type { Metadata } from "next";

import VerifyEmailClient from "@/app/verificar-email/VerifyEmailClient";

export const dynamic =
  "force-dynamic";

export const metadata: Metadata = {
  title:
    "Confirmar e-mail | Laico",

  description:
    "Confirmação segura do endereço de e-mail da sua conta.",

  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const token =
    typeof params.token ===
      "string"
      ? params.token
          .trim()
          .slice(0, 200)
      : "";

  return (
    <VerifyEmailClient
      token={token}
    />
  );
}