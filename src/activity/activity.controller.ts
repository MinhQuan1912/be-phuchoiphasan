import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ListActivityQueryDto } from './dto/activity.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivityController {
  constructor(private service: ActivityService) {}

  @Get('actors')
  async findActors() {
    return {
      message: 'Lấy danh sách người thao tác thành công',
      data: await this.service.findActors(),
    };
  }

  @Get()
  async findAll(@Query() query: ListActivityQueryDto) {
    return {
      message: 'Lấy danh sách hoạt động thành công',
      data: await this.service.findAll(query),
    };
  }
}
