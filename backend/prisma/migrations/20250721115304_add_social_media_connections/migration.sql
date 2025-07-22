-- CreateTable
CREATE TABLE "social_media_connections" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "platform_user_id" TEXT NOT NULL,
    "platform_username" TEXT,
    "platform_email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_media_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_media_connections_profile_id_platform_key" ON "social_media_connections"("profile_id", "platform");

-- AddForeignKey
ALTER TABLE "social_media_connections" ADD CONSTRAINT "social_media_connections_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
