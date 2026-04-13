import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateCourtDto {
  @ApiProperty()
  @IsString({ message: 'Название корта должно быть строкой.' })
  @MaxLength(120, { message: 'Название корта не должно превышать 120 символов.' })
  name!: string;

  @ApiProperty()
  @IsString({ message: 'Тип покрытия должен быть строкой.' })
  @MaxLength(80, { message: 'Тип покрытия не должен превышать 80 символов.' })
  surfaceType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'Признак крытого корта должен быть булевым значением.' })
  isIndoor?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'Признак освещения должен быть булевым значением.' })
  hasLighting?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Примечание к корту должно быть строкой.' })
  @MaxLength(500, { message: 'Примечание к корту не должно превышать 500 символов.' })
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt({ message: 'Порядок сортировки корта должен быть целым числом.' })
  @Min(0, { message: 'Порядок сортировки корта не может быть отрицательным.' })
  @Max(999, { message: 'Порядок сортировки корта не должен превышать 999.' })
  sortOrder?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'РџСЂРёР·РЅР°Рє Р°РєС‚РёРІРЅРѕСЃС‚Рё РєРѕСЂС‚Р° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ Р±СѓР»РµРІС‹Рј Р·РЅР°С‡РµРЅРёРµРј.' })
  isActive?: boolean;
}
