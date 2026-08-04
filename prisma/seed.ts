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

type AdminSeed = { username: string; password: string; name: string };


function readAdminAccounts(): AdminSeed[] {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Thiếu ADMIN_USERNAME hoặc ADMIN_PASSWORD. Ví dụ:\n' +
        '  ADMIN_USERNAME="admin@congty.vn" ADMIN_PASSWORD="<mật khẩu mạnh>" pnpm prisma db seed',
    );
  }

  const accounts: AdminSeed[] = [
    { username, password, name: 'Administrator' },
  ];

  for (const entry of (process.env.ADMIN_ACCOUNTS ?? '').split(',')) {
    const raw = entry.trim();
    if (!raw) continue;

    const at = raw.indexOf(':');
    const user = at > 0 ? raw.slice(0, at).trim() : '';
    const pass = at > 0 ? raw.slice(at + 1).trim() : '';

    if (!user || !pass) {
      throw new Error(
        `ADMIN_ACCOUNTS sai định dạng ở "${raw}" — cần dạng username:password`,
      );
    }
    if (accounts.some((a) => a.username === user)) {
      throw new Error(`ADMIN_ACCOUNTS có username trùng: "${user}"`);
    }

    accounts.push({ username: user, password: pass, name: user });
  }

  return accounts;
}

async function main() {
  for (const account of readAdminAccounts()) {
    const hashed = await bcrypt.hash(account.password, 10);

    await prisma.admin.upsert({
      where: { username: account.username },
      update: {},
      create: {
        username: account.username,
        password: hashed,
        name: account.name,
      },
    });
    console.log('Seeded admin:', account.username);
  }

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
