-- CreateTable
CREATE TABLE "social_media_cached_data" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "last_fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_media_cached_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_media_cached_data_connection_id_data_type_key" ON "social_media_cached_data"("connection_id", "data_type");

-- AddForeignKey
ALTER TABLE "social_media_cached_data" ADD CONSTRAINT "social_media_cached_data_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "social_media_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
