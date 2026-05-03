import { Body, Controller, Get, Inject, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { SelectOnboardingRoleDto } from './dto/select-onboarding-role.dto';
import { UpdateUserAccountDto } from './dto/update-user-account.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { UsersService } from './users.service';

@ApiTags('User Settings')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('user')
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get('account')
  getAccount(@CurrentUser() user: JwtPayload) {
    return this.usersService.getAccount(user.sub);
  }

  @Patch('account')
  updateAccount(@CurrentUser() user: JwtPayload, @Body() dto: UpdateUserAccountDto) {
    return this.usersService.updateAccount(user.sub, dto);
  }

  @Post('onboarding/role')
  selectOnboardingRole(@CurrentUser() user: JwtPayload, @Body() dto: SelectOnboardingRoleDto) {
    return this.usersService.selectOnboardingRole(user.sub, dto.mode);
  }

  @Get('settings')
  getSettings(@CurrentUser() user: JwtPayload) {
    return this.usersService.getSettings(user.sub);
  }

  @Patch('settings')
  updateSettings(@CurrentUser() user: JwtPayload, @Body() dto: UpdateUserSettingsDto) {
    return this.usersService.updateSettings(user.sub, dto);
  }
}
