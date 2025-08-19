-- CreateIndex
CREATE INDEX "generated_assets_profile_id_created_at_idx" ON "public"."generated_assets"("profile_id", "created_at");

-- CreateIndex
CREATE INDEX "generated_assets_source_system_created_at_idx" ON "public"."generated_assets"("source_system", "created_at");

-- CreateIndex
CREATE INDEX "generated_assets_asset_type_created_at_idx" ON "public"."generated_assets"("asset_type", "created_at");

-- CreateIndex
CREATE INDEX "generated_assets_status_created_at_idx" ON "public"."generated_assets"("status", "created_at");

-- CreateIndex
CREATE INDEX "generated_assets_favorited_idx" ON "public"."generated_assets"("favorited");

-- CreateIndex
CREATE INDEX "profiles_role_idx" ON "public"."profiles"("role");

-- CreateIndex
CREATE INDEX "profiles_created_at_idx" ON "public"."profiles"("created_at");

-- CreateIndex
CREATE INDEX "profiles_updated_at_idx" ON "public"."profiles"("updated_at");

-- CreateIndex
CREATE INDEX "profiles_email_verified_idx" ON "public"."profiles"("email_verified");

-- CreateIndex
CREATE INDEX "social_media_uploads_profile_id_created_at_idx" ON "public"."social_media_uploads"("profile_id", "created_at");

-- CreateIndex
CREATE INDEX "social_media_uploads_platform_created_at_idx" ON "public"."social_media_uploads"("platform", "created_at");

-- CreateIndex
CREATE INDEX "social_media_uploads_status_created_at_idx" ON "public"."social_media_uploads"("status", "created_at");

-- CreateIndex
CREATE INDEX "user_template_access_user_id_last_used_at_idx" ON "public"."user_template_access"("user_id", "last_used_at");

-- CreateIndex
CREATE INDEX "user_template_access_template_name_idx" ON "public"."user_template_access"("template_name");

-- CreateIndex
CREATE INDEX "user_template_access_source_system_idx" ON "public"."user_template_access"("source_system");
