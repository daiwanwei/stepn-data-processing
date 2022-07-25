-- CreateTable
CREATE TABLE "TokenAccount" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "mintAddress" TEXT NOT NULL,
    "amount" TEXT NOT NULL,

    CONSTRAINT "TokenAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenAccount_address_key" ON "TokenAccount"("address");
