import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { S3Module } from './s3/s3.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { ArticleModule } from './article/article.module';
import { CategoryModule } from './category/category.module';
import { ContactModule } from './contact/contact.module';
import { ActivityModule } from './activity/activity.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    S3Module,
    MailModule,
    AuthModule,
    ArticleModule,
    CategoryModule,
    ContactModule,
    ActivityModule,
  ],
})
export class AppModule {}
