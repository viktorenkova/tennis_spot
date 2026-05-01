import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { Roles } from '../auth/roles.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ListComplaintsQueryDto } from './dto/list-complaints-query.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';

@ApiTags('Complaints')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller()
export class ComplaintsController {
  constructor(@Inject(ComplaintsService) private readonly complaintsService: ComplaintsService) {}

  @Post('complaints')
  createComplaint(@CurrentUser() user: JwtPayload, @Body() dto: CreateComplaintDto) {
    return this.complaintsService.createComplaint(user.sub, dto);
  }

  @Get('complaints/me')
  listMyComplaints(@CurrentUser() user: JwtPayload) {
    return this.complaintsService.listMyComplaints(user.sub);
  }

  @Get('complaints/:id')
  getComplaint(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.complaintsService.getComplaintForUser(id, user.sub, user.roles ?? []);
  }

  @Get('admin/complaints')
  @Roles('admin')
  listAdminComplaints(@Query() query: ListComplaintsQueryDto) {
    return this.complaintsService.listAdminComplaints(query);
  }

  @Post('admin/complaints/:id/status')
  @Roles('admin')
  updateComplaintStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateComplaintStatusDto,
  ) {
    return this.complaintsService.updateComplaintStatus(user.sub, id, dto);
  }
}
