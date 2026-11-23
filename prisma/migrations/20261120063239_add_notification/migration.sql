-- AlterEnum
ALTER TYPE "NotificationStatus" ADD VALUE 'READ';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_OVERDUE_REMINDER';
