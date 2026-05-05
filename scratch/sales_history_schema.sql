-- Create Table: Customer
CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "doctorName" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Table: Sale
CREATE TABLE IF NOT EXISTS "Sale" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "customerId" TEXT REFERENCES "Customer"("id") ON DELETE SET NULL,
    "doctorName" TEXT,
    "invoiceNo" TEXT NOT NULL UNIQUE,
    "saleDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMode" TEXT NOT NULL DEFAULT 'cash',
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Table: SaleItem
CREATE TABLE IF NOT EXISTS "SaleItem" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "saleId" TEXT NOT NULL REFERENCES "Sale"("id") ON DELETE CASCADE,
    "batchId" TEXT NOT NULL, -- Assuming Batch table exists or will be created
    "medicineId" TEXT NOT NULL, -- Assuming Medicine table exists or will be created
    "medicineName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "mrp" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstPercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS "idx_customer_tenant" ON "Customer"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_sale_tenant" ON "Sale"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_sale_customer" ON "Sale"("customerId");
CREATE INDEX IF NOT EXISTS "idx_sale_date" ON "Sale"("saleDate");
CREATE INDEX IF NOT EXISTS "idx_saleitem_sale" ON "SaleItem"("saleId");
CREATE INDEX IF NOT EXISTS "idx_saleitem_medicine" ON "SaleItem"("medicineId");
