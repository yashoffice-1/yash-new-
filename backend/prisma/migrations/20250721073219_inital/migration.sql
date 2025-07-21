-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "key_value" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_library" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[],
    "asset_type" TEXT NOT NULL,
    "asset_url" TEXT NOT NULL,
    "gif_url" TEXT,
    "content" TEXT,
    "instruction" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "favorited" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "original_asset_id" TEXT,

    CONSTRAINT "asset_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_configs" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "client_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_template_assignments" (
    "id" TEXT NOT NULL,
    "client_config_id" TEXT,
    "template_id" TEXT NOT NULL,
    "template_name" TEXT,
    "assigned_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "client_template_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_assets" (
    "id" TEXT NOT NULL,
    "inventory_id" TEXT,
    "channel" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "instruction" TEXT,
    "approved" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30),
    "sku" TEXT,
    "category" TEXT,
    "brand" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_fallback_variables" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "variable_name" TEXT NOT NULL,
    "variable_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_fallback_variables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_configs_client_id_key" ON "client_configs"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_sku_key" ON "inventory"("sku");

-- AddForeignKey
ALTER TABLE "asset_library" ADD CONSTRAINT "asset_library_original_asset_id_fkey" FOREIGN KEY ("original_asset_id") REFERENCES "generated_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_template_assignments" ADD CONSTRAINT "client_template_assignments_client_config_id_fkey" FOREIGN KEY ("client_config_id") REFERENCES "client_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
