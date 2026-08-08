-- CreateTable
CREATE TABLE "AdminTwoFactorChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminTwoFactorChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminTwoFactorChallenge_tokenHash_key" ON "AdminTwoFactorChallenge"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminTwoFactorChallenge_userId_idx" ON "AdminTwoFactorChallenge"("userId");

-- CreateIndex
CREATE INDEX "AdminTwoFactorChallenge_userId_usedAt_idx" ON "AdminTwoFactorChallenge"("userId", "usedAt");

-- CreateIndex
CREATE INDEX "AdminTwoFactorChallenge_expiresAt_idx" ON "AdminTwoFactorChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "AdminTwoFactorChallenge_usedAt_idx" ON "AdminTwoFactorChallenge"("usedAt");

-- AddForeignKey
ALTER TABLE "AdminTwoFactorChallenge" ADD CONSTRAINT "AdminTwoFactorChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
