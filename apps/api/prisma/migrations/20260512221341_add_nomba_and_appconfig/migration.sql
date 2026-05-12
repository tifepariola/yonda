-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'DELIVERED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('ALIPAY', 'WECHAT_PAY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "whatsappPhone" TEXT NOT NULL,
    "name" TEXT,
    "bvn" TEXT,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "kycReviewedAt" TIMESTAMP(3),
    "kycReviewedBy" TEXT,
    "kycRejectionReason" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderRef" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ngnAmount" DECIMAL(18,2) NOT NULL,
    "cnyAmount" DECIMAL(18,4) NOT NULL,
    "fxRateId" TEXT NOT NULL,
    "exchangeRate" DECIMAL(18,6) NOT NULL,
    "marginRate" DECIMAL(5,4) NOT NULL,
    "deliveryType" "DeliveryType" NOT NULL,
    "deliveryAccountId" TEXT NOT NULL,
    "paymentGateway" TEXT NOT NULL DEFAULT 'paystack',
    "paystackRef" TEXT,
    "paystackLink" TEXT,
    "nombaOrderRef" TEXT,
    "nombaCheckoutLink" TEXT,
    "paidAt" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "deliveredAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "paymentExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "FxRate" (
    "id" TEXT NOT NULL,
    "baseRateCnyToNgn" DECIMAL(18,6) NOT NULL,
    "marginPercent" DECIMAL(5,4) NOT NULL,
    "effectiveRateCnyToNgn" DECIMAL(18,6) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "setByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_whatsappPhone_key" ON "User"("whatsappPhone");

-- CreateIndex
CREATE INDEX "User_whatsappPhone_idx" ON "User"("whatsappPhone");

-- CreateIndex
CREATE INDEX "User_kycStatus_idx" ON "User"("kycStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderRef_key" ON "Order"("orderRef");

-- CreateIndex
CREATE UNIQUE INDEX "Order_paystackRef_key" ON "Order"("paystackRef");

-- CreateIndex
CREATE UNIQUE INDEX "Order_nombaOrderRef_key" ON "Order"("nombaOrderRef");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_paystackRef_idx" ON "Order"("paystackRef");

-- CreateIndex
CREATE INDEX "Order_nombaOrderRef_idx" ON "Order"("nombaOrderRef");

-- CreateIndex
CREATE INDEX "Order_orderRef_idx" ON "Order"("orderRef");

-- CreateIndex
CREATE INDEX "FxRate_isActive_idx" ON "FxRate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BotSession_userId_key" ON "BotSession"("userId");

-- CreateIndex
CREATE INDEX "BotSession_userId_idx" ON "BotSession"("userId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_fxRateId_fkey" FOREIGN KEY ("fxRateId") REFERENCES "FxRate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotSession" ADD CONSTRAINT "BotSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
