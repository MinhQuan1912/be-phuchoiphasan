-- CreateEnum
CREATE TYPE "Court" AS ENUM ('KV2_HA_NOI', 'KV1_DA_NANG', 'KV1_HCM');

-- Đổi cột court từ chuỗi tự do sang enum, map dữ liệu cũ theo tên tòa; giá trị lạ về NULL
ALTER TABLE "Article"
ALTER COLUMN "court" TYPE "Court"
USING (
  CASE "court"
    WHEN 'TAND khu vực 2 - Hà Nội' THEN 'KV2_HA_NOI'::"Court"
    WHEN 'TAND khu vực 1 - Đà Nẵng' THEN 'KV1_DA_NANG'::"Court"
    WHEN 'TAND khu vực 1 - TP. Hồ Chí Minh' THEN 'KV1_HCM'::"Court"
    ELSE NULL
  END
);
