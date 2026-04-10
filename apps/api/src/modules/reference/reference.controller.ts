import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReferenceService } from './reference.service';

@ApiTags('Справочники')
@Controller('reference')
export class ReferenceController {
  constructor(@Inject(ReferenceService) private readonly referenceService: ReferenceService) {}

  @Get('cities')
  @ApiOkResponse({ description: 'Получить поддерживаемые города вместе с районами.' })
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
