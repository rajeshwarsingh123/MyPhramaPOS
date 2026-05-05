-- 1. Suppliers Table
CREATE TABLE IF NOT EXISTS "suppliers" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "gst_number" TEXT,
    "tenant_id" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Medicines Table (if not exists)
CREATE TABLE IF NOT EXISTS "medicines" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "generic_name" TEXT,
    "company_name" TEXT,
    "composition" TEXT,
    "strength" TEXT,
    "category" TEXT,
    "unit_type" TEXT DEFAULT 'tablet',
    "gst_percent" DOUBLE PRECISION DEFAULT 5,
    "selling_price" DOUBLE PRECISION DEFAULT 0,
    "total_stock" INTEGER DEFAULT 0,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Batches Table (if not exists)
CREATE TABLE IF NOT EXISTS "batches" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "medicine_id" TEXT NOT NULL REFERENCES "medicines"("id") ON DELETE CASCADE,
    "batch_number" TEXT NOT NULL,
    "expiry_date" TIMESTAMPTZ NOT NULL,
    "mfg_date" TIMESTAMPTZ,
    "purchase_price" DOUBLE PRECISION NOT NULL,
    "mrp" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER DEFAULT 0,
    "initial_quantity" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Purchase Bills Table
CREATE TABLE IF NOT EXISTS "purchase_bills" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "supplier_id" TEXT NOT NULL REFERENCES "suppliers"("id") ON DELETE RESTRICT,
    "invoice_no" TEXT NOT NULL,
    "invoice_date" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "payment_type" TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'credit', 'upi'
    "total_amount" DOUBLE PRECISION DEFAULT 0,
    "total_gst" DOUBLE PRECISION DEFAULT 0,
    "notes" TEXT,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("invoice_no", "tenant_id")
);

-- 5. Purchase Items Table
CREATE TABLE IF NOT EXISTS "purchase_items" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "bill_id" TEXT NOT NULL REFERENCES "purchase_bills"("id") ON DELETE CASCADE,
    "medicine_id" TEXT NOT NULL REFERENCES "medicines"("id"),
    "batch_id" TEXT NOT NULL REFERENCES "batches"("id"),
    "quantity" INTEGER NOT NULL,
    "purchase_price" DOUBLE PRECISION NOT NULL,
    "mrp" DOUBLE PRECISION NOT NULL,
    "gst_percent" DOUBLE PRECISION DEFAULT 5,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_purchase_bills_tenant" ON "purchase_bills"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_purchase_items_bill" ON "purchase_items"("bill_id");
CREATE INDEX IF NOT EXISTS "idx_batches_medicine" ON "batches"("medicine_id");
CREATE INDEX IF NOT EXISTS "idx_medicines_tenant" ON "medicines"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_suppliers_tenant" ON "suppliers"("tenant_id");
