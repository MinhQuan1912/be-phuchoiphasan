import { Body, Controller, Post } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private service: ContactService) {}

  @Post()
  send(@Body() dto: CreateContactDto) {
    return {
      message: 'Đã gửi yêu cầu tư vấn thành công',
      data: this.service.send(dto),
    };
  }
}
