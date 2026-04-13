import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { Roles } from '../auth/roles.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { BookingService } from './booking.service';
import { CreateBookingRequestDto } from './dto/create-booking-request.dto';
import { PartnerBookingActionDto } from './dto/partner-booking-action.dto';
import { PlayerBookingActionDto } from './dto/player-booking-action.dto';

@ApiTags('Booking requests')
@Controller()
export class BookingController {
  constructor(@Inject(BookingService) private readonly bookingService: BookingService) {}

  @Post('booking-requests')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('player')
  createBookingRequest(@CurrentUser() user: JwtPayload, @Body() dto: CreateBookingRequestDto) {
    return this.bookingService.createBookingRequest(user.sub, dto);
  }

  @Get('booking-requests/me')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('player')
  listMyBookingRequests(@CurrentUser() user: JwtPayload) {
    return this.bookingService.listMyBookingRequests(user.sub);
  }

  @Get('booking-requests/:id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('player')
  getMyBookingRequest(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.bookingService.getMyBookingRequest(user.sub, id);
  }

  @Post('booking-requests/:id/cancel')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('player')
  cancelMyBookingRequest(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PlayerBookingActionDto,
  ) {
    return this.bookingService.cancelByPlayer(user.sub, id, dto.commentFromPlayer);
  }

  @Get('partner/booking-requests')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  listIncomingBookingRequests(@CurrentUser() user: JwtPayload) {
    return this.bookingService.listPartnerBookingRequests(user.sub);
  }

  @Post('partner/booking-requests/:id/confirm')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  confirmBookingRequest(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PartnerBookingActionDto,
  ) {
    return this.bookingService.confirmByPartner(user.sub, id, dto.commentFromPartner);
  }

  @Post('partner/booking-requests/:id/reject')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  rejectBookingRequest(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PartnerBookingActionDto,
  ) {
    return this.bookingService.rejectByPartner(user.sub, id, dto.commentFromPartner);
  }

  @Post('partner/booking-requests/:id/cancel')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  cancelBookingRequestByPartner(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PartnerBookingActionDto,
  ) {
    return this.bookingService.cancelByPartner(user.sub, id, dto.commentFromPartner);
  }

  @Post('partner/booking-requests/:id/complete')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  completeBookingRequest(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PartnerBookingActionDto,
  ) {
    return this.bookingService.completeByPartner(user.sub, id, dto.commentFromPartner);
  }
}
