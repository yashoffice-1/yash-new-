-- CreateTable
CREATE TABLE "social_media_uploads" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "upload_url" TEXT NOT NULL,
    "platform_id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "asset_id" TEXT,

    CONSTRAINT "social_media_uploads_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "social_media_uploads" ADD CONSTRAINT "social_media_uploads_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "generated_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_media_uploads" ADD CONSTRAINT "social_media_uploads_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
