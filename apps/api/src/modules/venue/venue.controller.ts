import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateCourtDto } from './dto/create-court.dto';
import { CreateVenueDto } from './dto/create-venue.dto';
import { ListPublicVenuesQueryDto } from './dto/list-public-venues-query.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { VenueService } from './venue.service';

@ApiTags('Venues')
@Controller()
export class VenueController {
  constructor(@Inject(VenueService) private readonly venueService: VenueService) {}

  @Post('partner/venues')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  createVenue(@CurrentUser() user: JwtPayload, @Body() dto: CreateVenueDto) {
    return this.venueService.createVenue(user.sub, dto);
  }

  @Get('partner/venues')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  listMyVenues(@CurrentUser() user: JwtPayload) {
    return this.venueService.listMyVenues(user.sub);
  }

  @Get('partner/venues/:venueId')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  getMyVenue(@CurrentUser() user: JwtPayload, @Param('venueId') venueId: string) {
    return this.venueService.getMyVenue(user.sub, venueId);
  }

  @Patch('partner/venues/:venueId')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  updateVenue(
    @CurrentUser() user: JwtPayload,
    @Param('venueId') venueId: string,
    @Body() dto: UpdateVenueDto,
  ) {
    return this.venueService.updateVenue(user.sub, venueId, dto);
  }

  @Post('partner/venues/:venueId/courts')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  createCourt(
    @CurrentUser() user: JwtPayload,
    @Param('venueId') venueId: string,
    @Body() dto: CreateCourtDto,
  ) {
    return this.venueService.createCourt(user.sub, venueId, dto);
  }

  @Patch('partner/venues/:venueId/courts/:courtId')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  updateCourt(
    @CurrentUser() user: JwtPayload,
    @Param('venueId') venueId: string,
    @Param('courtId') courtId: string,
    @Body() dto: UpdateCourtDto,
  ) {
    return this.venueService.updateCourt(user.sub, venueId, courtId, dto);
  }

  @Get('venues')
  listPublicVenues(@Query() query: ListPublicVenuesQueryDto) {
    return this.venueService.listPublicVenues(query);
  }

  @Get('venues/:venueId')
  getPublicVenue(@Param('venueId') venueId: string) {
    return this.venueService.getPublicVenue(venueId);
  }
}
