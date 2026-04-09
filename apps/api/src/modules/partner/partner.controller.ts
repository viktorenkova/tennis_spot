import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreatePartnerProfileDto } from './dto/create-partner-profile.dto';
import { UpdatePartnerProfileDto } from './dto/update-partner-profile.dto';
import { PartnerService } from './partner.service';

@ApiTags('Partner')
@Controller()
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Post('partner/profile')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  createProfile(@CurrentUser() user: JwtPayload, @Body() dto: CreatePartnerProfileDto) {
    return this.partnerService.createProfile(user.sub, dto);
  }

  @Get('partner/profile/me')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.partnerService.getMyProfile(user.sub);
  }

  @Patch('partner/profile/me')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  updateMyProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdatePartnerProfileDto) {
    return this.partnerService.updateMyProfile(user.sub, dto);
  }

  @Get('partners')
  listPartners() {
    return this.partnerService.listPartners();
  }

  @Get('partners/:partnerId')
  getPartnerById(@Param('partnerId') partnerId: string) {
    return this.partnerService.getPartnerById(partnerId);
  }
}
