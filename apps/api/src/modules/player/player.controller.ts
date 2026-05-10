import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreatePlayerProfileDto } from './dto/create-player-profile.dto';
import { UpdatePlayerAvatarDto } from './dto/update-player-avatar.dto';
import { UpdatePlayerPreferencesDto } from './dto/update-player-preferences.dto';
import { UpdatePlayerProfileDto } from './dto/update-player-profile.dto';
import { UpdatePlayerVisibilityDto } from './dto/update-player-visibility.dto';
import { PlayerService } from './player.service';

@ApiTags('Player')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller()
export class PlayerController {
  constructor(@Inject(PlayerService) private readonly playerService: PlayerService) {}

  @Get('player/profile/me')
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.playerService.getMyProfile(user.sub);
  }

  @Post('player/profile')
  createProfile(@CurrentUser() user: JwtPayload, @Body() dto: CreatePlayerProfileDto) {
    return this.playerService.createProfile(user.sub, dto);
  }

  @Patch('player/profile/me')
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdatePlayerProfileDto) {
    return this.playerService.updateMyProfile(user.sub, dto);
  }

  @Patch('player/profile/me/visibility')
  updateVisibility(@CurrentUser() user: JwtPayload, @Body() dto: UpdatePlayerVisibilityDto) {
    return this.playerService.updateVisibility(user.sub, dto);
  }

  @Patch('player/profile/me/preferences')
  updatePreferences(@CurrentUser() user: JwtPayload, @Body() dto: UpdatePlayerPreferencesDto) {
    return this.playerService.updatePreferences(user.sub, dto);
  }

  @Post('player/profile/me/avatar')
  updateAvatar(@CurrentUser() user: JwtPayload, @Body() dto: UpdatePlayerAvatarDto) {
    return this.playerService.updateAvatar(user.sub, dto);
  }

  @Get('players')
  listPlayers() {
    return this.playerService.listPlayers();
  }

  @Get('players/:playerId')
  getPlayerById(@Param('playerId') playerId: string) {
    return this.playerService.getPlayerById(playerId);
  }
}
