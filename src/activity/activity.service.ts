import { Injectable, Logger } from '@nestjs/common';
import {
  ActivityAction,
  ActivityTarget,
  CategoryKind,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListActivityQueryDto } from './dto/activity.dto';

export interface Actor {
  id: string;
  username: string;
}

export interface LogEntry {
  actor: Actor;
  action: ActivityAction;
  targetType: ActivityTarget;
  targetId?: string | null;
  targetTitle: string;
  targetKind?: CategoryKind | null;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const VISIBLE_ACTIONS: ActivityAction[] = [
  ActivityAction.UPDATE,
  ActivityAction.DELETE,
  ActivityAction.PUBLISH,
  ActivityAction.UNPUBLISH,
];

const activitySelect = {
  id: true,
  adminId: true,
  adminName: true,
  action: true,
  targetType: true,
  targetId: true,
  targetTitle: true,
  targetKind: true,
  createdAt: true,
} satisfies Prisma.ActivityLogSelect;

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private prisma: PrismaService) {}

  async log(entry: LogEntry): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          adminId: entry.actor.id,
          adminName: entry.actor.username,
          action: entry.action,
          targetType: entry.targetType,
          targetId: entry.targetId ?? null,
          targetTitle: entry.targetTitle,
          targetKind: entry.targetKind ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Không ghi được nhật ký hoạt động (${entry.action} ${entry.targetType}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async findAll(query: ListActivityQueryDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    const where: Prisma.ActivityLogWhereInput = {
      action: { in: VISIBLE_ACTIONS },
    };
    if (query.adminId) where.adminId = query.adminId;
    if (query.kind) where.targetKind = query.kind;

    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (to) to.setDate(to.getDate() + 1);
    if (from || to) {
      where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: activitySelect,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    };
  }

  async findActors() {
    const rows = await this.prisma.activityLog.groupBy({
      by: ['adminId', 'adminName'],
      where: { action: { in: VISIBLE_ACTIONS } },
      orderBy: { adminName: 'asc' },
    });
    return rows.map((r) => ({ id: r.adminId, name: r.adminName }));
  }
}
