-- DropForeignKey
ALTER TABLE "social_media_uploads" DROP CONSTRAINT "social_media_uploads_asset_id_fkey";

-- AddForeignKey
ALTER TABLE "social_media_uploads" ADD CONSTRAINT "social_media_uploads_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "asset_library"("id") ON DELETE SET NULL ON UPDATE CASCADE; 