import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DemoLoginDto } from './dto/demo-login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestPhoneCodeDto } from './dto/request-phone-code.dto';
import { VerifyPhoneCodeDto } from './dto/verify-phone-code.dto';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthService } from './auth.service';
import { JwtPayload } from './types/jwt-payload.type';

@ApiTags('Авторизация')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('phone/request-code')
  @ApiOkResponse({ description: 'Создать challenge для подтверждения телефона в dev-режиме.' })
  requestCode(@Body() dto: RequestPhoneCodeDto) {
    return this.authService.requestPhoneCode(dto);
  }

  @Post('phone/verify-code')
  @ApiOkResponse({ description: 'Проверить код подтверждения телефона и выдать JWT-токены.' })
  verifyCode(@Body() dto: VerifyPhoneCodeDto) {
    return this.authService.verifyPhoneCode(dto);
  }

  @Post('demo/login')
  @ApiOkResponse({ description: 'Dev-only быстрый вход для seeded demo-пользователей.' })
  demoLogin(@Body() dto: DemoLoginDto) {
    return this.authService.demoLogin(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.sub);
  }
}
