-- CreateTable
CREATE TABLE "MetadataAccount" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "mintAddress" TEXT NOT NULL,
    "updateAuthorityAddress" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "editionNonce" INTEGER,
    "tokenStandard" TEXT NOT NULL,
    "collection" JSONB,

    CONSTRAINT "MetadataAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MetadataAccount_address_key" ON "MetadataAccount"("address");
