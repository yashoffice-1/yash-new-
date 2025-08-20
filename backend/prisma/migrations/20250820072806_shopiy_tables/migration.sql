-- CreateTable
CREATE TABLE "public"."shopify_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "shop_domain" TEXT NOT NULL,
    "shop_name" TEXT,
    "shop_email" TEXT,
    "shop_plan" TEXT,
    "access_token" TEXT,
    "scope" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "last_sync_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopify_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30),
    "sku" TEXT,
    "category" TEXT,
    "brand" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "shopify_product_id" TEXT,
    "shopify_handle" TEXT,
    "shopify_status" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shopify_connections_user_id_status_idx" ON "public"."shopify_connections"("user_id", "status");

-- CreateIndex
CREATE INDEX "shopify_connections_shop_domain_idx" ON "public"."shopify_connections"("shop_domain");

-- CreateIndex
CREATE UNIQUE INDEX "shopify_connections_user_id_shop_domain_key" ON "public"."shopify_connections"("user_id", "shop_domain");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_shopify_product_id_key" ON "public"."inventory_items"("shopify_product_id");

-- CreateIndex
CREATE INDEX "inventory_items_user_id_status_idx" ON "public"."inventory_items"("user_id", "status");

-- CreateIndex
CREATE INDEX "inventory_items_shopify_product_id_idx" ON "public"."inventory_items"("shopify_product_id");

-- CreateIndex
CREATE INDEX "inventory_items_category_idx" ON "public"."inventory_items"("category");

-- CreateIndex
CREATE INDEX "inventory_items_brand_idx" ON "public"."inventory_items"("brand");

-- AddForeignKey
ALTER TABLE "public"."shopify_connections" ADD CONSTRAINT "shopify_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_items" ADD CONSTRAINT "inventory_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
