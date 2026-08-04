import {
  jwtVerify,
  SignJWT,
  type JWTPayload,
} from "jose";

const COOKIE_PREFIX = "laico_order_access_";
const TOKEN_ISSUER = "laico-ecommerce";
const TOKEN_AUDIENCE = "order-details";
const TOKEN_DURATION = "30d";

type OrderAccessPayload = JWTPayload & {
  orderId: string;
  userId: string;
};

function getSecret() {
  const secret =
    process.env.ORDER_ACCESS_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "ORDER_ACCESS_SECRET precisa ter pelo menos 32 caracteres."
    );
  }

  return new TextEncoder().encode(secret);
}

export function getOrderAccessCookieName(
  orderId: string
) {
  const safeOrderId = orderId.replace(
    /[^a-zA-Z0-9_-]/g,
    ""
  );

  return `${COOKIE_PREFIX}${safeOrderId}`;
}

export async function createOrderAccessToken({
  orderId,
  userId,
}: {
  orderId: string;
  userId: string;
}) {
  return new SignJWT({
    orderId,
    userId,
  })
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(TOKEN_DURATION)
    .sign(getSecret());
}

export async function verifyOrderAccessToken({
  token,
  expectedOrderId,
}: {
  token: string;
  expectedOrderId: string;
}): Promise<OrderAccessPayload | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      getSecret(),
      {
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
      }
    );

    if (
      typeof payload.orderId !== "string" ||
      typeof payload.userId !== "string" ||
      payload.orderId !== expectedOrderId
    ) {
      return null;
    }

    return payload as OrderAccessPayload;
  } catch {
    return null;
  }
}