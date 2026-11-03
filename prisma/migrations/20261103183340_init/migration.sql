-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('PRACTICE_MANAGER', 'PRACTITIONER', 'RECEPTIONIST', 'BILLING_CLERK', 'NURSE', 'ASSISTANT', 'VIEWER');

-- CreateTable
CREATE TABLE "Practice" (
    "id" TEXT NOT NULL,
    "clerkOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Practice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Practice_clerkOrgId_key" ON "Practice"("clerkOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_clerkId_key" ON "Staff"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_clerkId_key" ON "Patient"("clerkId");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
