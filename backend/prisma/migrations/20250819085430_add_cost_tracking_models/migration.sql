-- AlterTable
ALTER TABLE "public"."generated_assets" ADD COLUMN     "generation_cost" DECIMAL(10,4),
ADD COLUMN     "processing_time" INTEGER;

-- CreateTable
CREATE TABLE "public"."generation_cost_records" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "base_cost" DECIMAL(10,4) NOT NULL,
    "processing_cost" DECIMAL(10,4) NOT NULL,
    "storage_cost" DECIMAL(10,4) NOT NULL,
    "total_cost" DECIMAL(10,4) NOT NULL,
    "processing_time" INTEGER NOT NULL,
    "tokens_used" INTEGER,
    "quality" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generation_cost_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_pricing" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "base_price" DECIMAL(10,4) NOT NULL,
    "per_second_price" DECIMAL(10,4),
    "per_token_price" DECIMAL(10,4),
    "max_duration" INTEGER,
    "max_tokens" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "generation_cost_records_asset_id_key" ON "public"."generation_cost_records"("asset_id");

-- CreateIndex
CREATE INDEX "generation_cost_records_profile_id_created_at_idx" ON "public"."generation_cost_records"("profile_id", "created_at");

-- CreateIndex
CREATE INDEX "generation_cost_records_source_system_created_at_idx" ON "public"."generation_cost_records"("source_system", "created_at");

-- CreateIndex
CREATE INDEX "generation_cost_records_asset_type_created_at_idx" ON "public"."generation_cost_records"("asset_type", "created_at");

-- CreateIndex
CREATE INDEX "generation_cost_records_total_cost_idx" ON "public"."generation_cost_records"("total_cost");

-- CreateIndex
CREATE INDEX "platform_pricing_platform_asset_type_idx" ON "public"."platform_pricing"("platform", "asset_type");

-- CreateIndex
CREATE UNIQUE INDEX "platform_pricing_platform_asset_type_quality_key" ON "public"."platform_pricing"("platform", "asset_type", "quality");

-- CreateIndex
CREATE INDEX "generated_assets_generation_cost_idx" ON "public"."generated_assets"("generation_cost");

-- AddForeignKey
ALTER TABLE "public"."generation_cost_records" ADD CONSTRAINT "generation_cost_records_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."generated_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."generation_cost_records" ADD CONSTRAINT "generation_cost_records_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
