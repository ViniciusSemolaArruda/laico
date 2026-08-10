-- CreateTable
CREATE TABLE "ShippingIntegrationCredential" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refreshedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingIntegrationCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShippingIntegrationCredential_provider_key" ON "ShippingIntegrationCredential"("provider");

-- CreateIndex
CREATE INDEX "ShippingIntegrationCredential_accessTokenExpiresAt_idx" ON "ShippingIntegrationCredential"("accessTokenExpiresAt");

-- CreateIndex
CREATE INDEX "ShippingIntegrationCredential_refreshTokenExpiresAt_idx" ON "ShippingIntegrationCredential"("refreshTokenExpiresAt");
