/*
  Warnings:

  - You are about to drop the column `key_value` on the `api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `api_keys` table. All the data in the column will be lost.
  - You are about to drop the `asset_library` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `template_fallback_variables` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[key]` on the table `api_keys` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `key` to the `api_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `api_keys` table without a default value. This is not possible if the table is not empty.
  - Made the column `updated_at` on table `client_configs` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `profile_id` to the `generated_assets` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."asset_library" DROP CONSTRAINT "asset_library_original_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."social_media_uploads" DROP CONSTRAINT "social_media_uploads_asset_id_fkey";

-- AlterTable
ALTER TABLE "public"."api_keys" DROP COLUMN "key_value",
DROP COLUMN "provider",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "key" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "permissions" TEXT[];

-- AlterTable
ALTER TABLE "public"."client_configs" ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."generated_assets" ADD COLUMN     "description" TEXT,
ADD COLUMN     "favorited" BOOLEAN DEFAULT false,
ADD COLUMN     "profile_id" TEXT NOT NULL,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "template_access_id" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "variables" JSONB;

-- DropTable
DROP TABLE "public"."asset_library";

-- DropTable
DROP TABLE "public"."template_fallback_variables";

-- CreateTable
CREATE TABLE "public"."user_template_access" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "template_description" TEXT,
    "thumbnail_url" TEXT,
    "category" TEXT,
    "aspect_ratio" TEXT,
    "can_use" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "selected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_template_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."template_variables" (
    "id" TEXT NOT NULL,
    "template_access_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "defaultValue" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_variables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_template_access_user_id_source_system_external_id_key" ON "public"."user_template_access"("user_id", "source_system", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "public"."api_keys"("key");

-- AddForeignKey
ALTER TABLE "public"."generated_assets" ADD CONSTRAINT "generated_assets_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."generated_assets" ADD CONSTRAINT "generated_assets_template_access_id_fkey" FOREIGN KEY ("template_access_id") REFERENCES "public"."user_template_access"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_template_access" ADD CONSTRAINT "user_template_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."template_variables" ADD CONSTRAINT "template_variables_template_access_id_fkey" FOREIGN KEY ("template_access_id") REFERENCES "public"."user_template_access"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."social_media_uploads" ADD CONSTRAINT "social_media_uploads_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."generated_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
