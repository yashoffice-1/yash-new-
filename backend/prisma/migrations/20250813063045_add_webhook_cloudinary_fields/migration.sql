-- AlterTable
ALTER TABLE "public"."generated_assets" ADD COLUMN     "cloudinaryData" JSONB DEFAULT '{}',
ADD COLUMN     "metadata" JSONB DEFAULT '{}';
