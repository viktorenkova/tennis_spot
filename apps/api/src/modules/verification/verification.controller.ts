import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { AddVerificationDocumentDto } from './dto/add-verification-document.dto';
import { VerificationService } from './verification.service';

@ApiTags('Partner Verification')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('partner/verification')
export class VerificationController {
  constructor(@Inject(VerificationService) private readonly verificationService: VerificationService) {}

  @Post('documents')
  addDocument(@CurrentUser() user: JwtPayload, @Body() dto: AddVerificationDocumentDto) {
    return this.verificationService.addDocument(user.sub, dto);
  }

  @Post('submit')
  submit(@CurrentUser() user: JwtPayload) {
    return this.verificationService.submit(user.sub);
  }

  @Get('me')
  getMyRequest(@CurrentUser() user: JwtPayload) {
    return this.verificationService.getMyRequest(user.sub);
  }
}
