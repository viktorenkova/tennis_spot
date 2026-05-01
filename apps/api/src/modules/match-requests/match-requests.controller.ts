import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { Roles } from '../auth/roles.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { BookingService } from '../booking/booking.service';
import { CreateBookingFromMatchRequestDto } from '../booking/dto/create-booking-from-match-request.dto';
import { CreateMatchRequestDto } from './dto/create-match-request.dto';
import { MatchRequestsService } from './match-requests.service';

@ApiTags('Match requests')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('player')
@Controller('match-requests')
export class MatchRequestsController {
  constructor(
    @Inject(MatchRequestsService)
    private readonly matchRequestsService: MatchRequestsService,
    @Inject(BookingService)
    private readonly bookingService: BookingService,
  ) {}

  @Post()
  createMatchRequest(@CurrentUser() user: JwtPayload, @Body() dto: CreateMatchRequestDto) {
    return this.matchRequestsService.createMatchRequest(user.sub, dto);
  }

  @Get('incoming')
  listIncoming(@CurrentUser() user: JwtPayload) {
    return this.matchRequestsService.listIncoming(user.sub);
  }

  @Get('outgoing')
  listOutgoing(@CurrentUser() user: JwtPayload) {
    return this.matchRequestsService.listOutgoing(user.sub);
  }

  @Post(':id/accept')
  accept(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.matchRequestsService.accept(user.sub, id);
  }

  @Post(':id/decline')
  decline(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.matchRequestsService.decline(user.sub, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.matchRequestsService.cancel(user.sub, id);
  }

  @Post(':id/create-booking')
  createBookingFromMatchRequest(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateBookingFromMatchRequestDto,
  ) {
    return this.bookingService.createBookingFromMatchRequest(user.sub, id, dto);
  }
}
