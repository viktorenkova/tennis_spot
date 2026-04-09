import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReferenceService } from './reference.service';

@ApiTags('Reference')
@Controller('reference')
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Get('cities')
  @ApiOkResponse({ description: 'Fetch supported cities with districts.' })
  getCities() {
    return this.referenceService.getCities();
  }

  @Get('cities/:cityId/districts')
  getDistricts(@Param('cityId') cityId: string) {
    return this.referenceService.getDistricts(cityId);
  }

  @Get('enums')
  getEnums() {
    return this.referenceService.getEnums();
  }
}
