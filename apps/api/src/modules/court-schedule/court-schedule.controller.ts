import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CourtAvailabilityService } from './court-availability.service';
import { CourtScheduleService } from './court-schedule.service';
import { CreateCourtScheduleExceptionDto } from './dto/create-court-schedule-exception.dto';
import { CreateCourtScheduleTemplateDto } from './dto/create-court-schedule-template.dto';
import { GetCourtAvailabilityDto } from './dto/get-court-availability.dto';
import { UpdateCourtScheduleExceptionDto } from './dto/update-court-schedule-exception.dto';
import { UpdateCourtScheduleTemplateDto } from './dto/update-court-schedule-template.dto';

@ApiTags('Court schedules')
@Controller()
export class CourtScheduleController {
  constructor(
    @Inject(CourtScheduleService) private readonly courtScheduleService: CourtScheduleService,
    @Inject(CourtAvailabilityService)
    private readonly courtAvailabilityService: CourtAvailabilityService,
  ) {}

  @Post('partner/courts/:courtId/schedule-templates')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  createTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('courtId') courtId: string,
    @Body() dto: CreateCourtScheduleTemplateDto,
  ) {
    return this.courtScheduleService.createTemplate(user.sub, courtId, dto);
  }

  @Get('partner/courts/:courtId/schedule-templates')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  listTemplates(@CurrentUser() user: JwtPayload, @Param('courtId') courtId: string) {
    return this.courtScheduleService.listTemplates(user.sub, courtId);
  }

  @Patch('partner/courts/:courtId/schedule-templates/:templateId')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  updateTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('courtId') courtId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateCourtScheduleTemplateDto,
  ) {
    return this.courtScheduleService.updateTemplate(user.sub, courtId, templateId, dto);
  }

  @Patch('schedule-templates/:templateId')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  updateTemplateById(
    @CurrentUser() user: JwtPayload,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateCourtScheduleTemplateDto,
  ) {
    return this.courtScheduleService.updateTemplateById(user.sub, templateId, dto);
  }

  @Delete('partner/courts/:courtId/schedule-templates/:templateId')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  deleteTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('courtId') courtId: string,
    @Param('templateId') templateId: string,
  ) {
    return this.courtScheduleService.deleteTemplate(user.sub, courtId, templateId);
  }

  @Delete('schedule-templates/:templateId')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  deleteTemplateById(
    @CurrentUser() user: JwtPayload,
    @Param('templateId') templateId: string,
  ) {
    return this.courtScheduleService.deleteTemplateById(user.sub, templateId);
  }

  @Post('partner/courts/:courtId/schedule-exceptions')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  createException(
    @CurrentUser() user: JwtPayload,
    @Param('courtId') courtId: string,
    @Body() dto: CreateCourtScheduleExceptionDto,
  ) {
    return this.courtScheduleService.createException(user.sub, courtId, dto);
  }

  @Get('partner/courts/:courtId/schedule-exceptions')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  listExceptions(@CurrentUser() user: JwtPayload, @Param('courtId') courtId: string) {
    return this.courtScheduleService.listExceptions(user.sub, courtId);
  }

  @Patch('partner/courts/:courtId/schedule-exceptions/:exceptionId')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  updateException(
    @CurrentUser() user: JwtPayload,
    @Param('courtId') courtId: string,
    @Param('exceptionId') exceptionId: string,
    @Body() dto: UpdateCourtScheduleExceptionDto,
  ) {
    return this.courtScheduleService.updateException(user.sub, courtId, exceptionId, dto);
  }

  @Patch('schedule-exceptions/:exceptionId')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  updateExceptionById(
    @CurrentUser() user: JwtPayload,
    @Param('exceptionId') exceptionId: string,
    @Body() dto: UpdateCourtScheduleExceptionDto,
  ) {
    return this.courtScheduleService.updateExceptionById(user.sub, exceptionId, dto);
  }

  @Delete('partner/courts/:courtId/schedule-exceptions/:exceptionId')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  deleteException(
    @CurrentUser() user: JwtPayload,
    @Param('courtId') courtId: string,
    @Param('exceptionId') exceptionId: string,
  ) {
    return this.courtScheduleService.deleteException(user.sub, courtId, exceptionId);
  }

  @Delete('schedule-exceptions/:exceptionId')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  deleteExceptionById(
    @CurrentUser() user: JwtPayload,
    @Param('exceptionId') exceptionId: string,
  ) {
    return this.courtScheduleService.deleteExceptionById(user.sub, exceptionId);
  }

  @Get('courts/:courtId/availability')
  getAvailability(@Param('courtId') courtId: string, @Query() query: GetCourtAvailabilityDto) {
    return this.courtAvailabilityService.getPublicCourtAvailability(courtId, query.date);
  }
}
