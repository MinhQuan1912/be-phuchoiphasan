import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const NOTICE_CATEGORIES = [
  { slug: 'mo-thu-tuc-pha-san', name: 'Thông báo mở thủ tục phá sản' },
  { slug: 'thong-bao-tong-dat', name: 'Thông báo tống đạt' },
  {
    slug: 'danh-sach-chu-no-nguoi-mac-no',
    name: 'Thông báo danh sách chủ nợ, người mắc nợ',
  },
  { slug: 'tuyen-bo-doanh-nghiep-pha-san', name: 'Tuyên bố phá sản' },
  {
    slug: 'lua-chon-to-chuc-dau-gia-tai-san',
    name: 'Lựa chọn tổ chức đấu giá tài sản',
  },
];

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Thiếu ADMIN_USERNAME hoặc ADMIN_PASSWORD. Ví dụ:\n' +
        '  ADMIN_USERNAME="admin@congty.vn" ADMIN_PASSWORD="<mật khẩu mạnh>" pnpm prisma db seed',
    );
  }

  const hashed = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { username },
    update: {},
    create: { username, password: hashed, name: 'Administrator' },
  });
  console.log('Seeded admin:', username);

  for (const c of NOTICE_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, kind: 'NOTICE' },
      create: { name: c.name, slug: c.slug, kind: 'NOTICE' },
    });
  }
  console.log('Seeded notice categories:', NOTICE_CATEGORIES.map((c) => c.slug).join(', '));

  await prisma.category.upsert({
    where: { slug: 'su-kien' },
    update: { name: 'Sự kiện', kind: 'EVENT' },
    create: { name: 'Sự kiện', slug: 'su-kien', kind: 'EVENT' },
  });
  console.log('Seeded event category: su-kien');

  await prisma.category.upsert({
    where: { slug: 'cau-hoi-thuong-gap' },
    update: { name: 'Câu hỏi thường gặp', kind: 'FAQ' },
    create: {
      name: 'Câu hỏi thường gặp',
      slug: 'cau-hoi-thuong-gap',
      kind: 'FAQ',
    },
  });
  console.log('Seeded FAQ category: cau-hoi-thuong-gap');

  await prisma.category.upsert({
    where: { slug: 'van-ban-phap-luat' },
    update: { name: 'Văn bản pháp luật', kind: 'LEGAL' },
    create: {
      name: 'Văn bản pháp luật',
      slug: 'van-ban-phap-luat',
      kind: 'LEGAL',
    },
  });
  console.log('Seeded legal category: van-ban-phap-luat');
}

main()
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
