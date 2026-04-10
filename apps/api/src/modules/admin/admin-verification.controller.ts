import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { Roles } from '../auth/roles.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { AdminVerificationService } from './admin-verification.service';
import { ListVerificationRequestsDto } from './dto/list-verification-requests.dto';
import {
  ApproveVerificationRequestDto,
  NeedsCorrectionVerificationRequestDto,
  RejectVerificationRequestDto,
} from './dto/review-verification-request.dto';

@ApiTags('Админка: верификация')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('admin', 'superadmin')
@Controller('admin/verification-requests')
export class AdminVerificationController {
  constructor(
    @Inject(AdminVerificationService)
    private readonly adminVerificationService: AdminVerificationService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Получить список заявок на верификацию для модерации администратором.' })
  @ApiQuery({ name: 'status', required: false })
  getVerificationRequests(@Query() query: ListVerificationRequestsDto) {
    return this.adminVerificationService.getVerificationRequests(query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Получить детальную информацию по заявке на верификацию.' })
  getVerificationRequestById(@Param('id') id: string) {
    return this.adminVerificationService.getVerificationRequestById(id);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ApproveVerificationRequestDto,
  ) {
    return this.adminVerificationService.approve(id, user.sub, dto.comment);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RejectVerificationRequestDto,
  ) {
    return this.adminVerificationService.reject(id, user.sub, dto.comment);
  }

  @Post(':id/needs-correction')
  needsCorrection(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: NeedsCorrectionVerificationRequestDto,
  ) {
    return this.adminVerificationService.needsCorrection(id, user.sub, dto.comment);
  }
}
