/*
  Warnings:

  - Added the required column `password` to the `profiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "password" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'verified';
