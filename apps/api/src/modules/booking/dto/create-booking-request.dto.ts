import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookingRequestDto {
  @ApiProperty()
  @IsDefined({ message: 'РРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РїР»РѕС‰Р°РґРєРё РѕР±СЏР·Р°С‚РµР»РµРЅ.' })
  @IsUUID('4', { message: 'РРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РїР»РѕС‰Р°РґРєРё РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РєРѕСЂСЂРµРєС‚РЅС‹Рј UUID.' })
  venueId!: string;

  @ApiProperty()
  @IsDefined({ message: 'РРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РєРѕСЂС‚Р° РѕР±СЏР·Р°С‚РµР»РµРЅ.' })
  @IsUUID('4', { message: 'РРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РєРѕСЂС‚Р° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РєРѕСЂСЂРµРєС‚РЅС‹Рј UUID.' })
  courtId!: string;

  @ApiProperty()
  @IsDefined({ message: 'Р”Р°С‚Р° Р±СЂРѕРЅРёСЂРѕРІР°РЅРёСЏ РѕР±СЏР·Р°С‚РµР»СЊРЅР°.' })
  @IsDateString({}, { message: 'Р”Р°С‚Р° Р±СЂРѕРЅРёСЂРѕРІР°РЅРёСЏ РґРѕР»Р¶РЅР° Р±С‹С‚СЊ РєРѕСЂСЂРµРєС‚РЅРѕР№ РґР°С‚РѕР№.' })
  bookingDate!: string;

  @ApiProperty()
  @IsDefined({ message: 'Р’СЂРµРјСЏ РЅР°С‡Р°Р»Р° РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ.' })
  @IsString({ message: 'Р’СЂРµРјСЏ РЅР°С‡Р°Р»Р° РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ СЃС‚СЂРѕРєРѕР№.' })
  @IsNotEmpty({ message: 'Р’СЂРµРјСЏ РЅР°С‡Р°Р»Р° РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ.' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Р’СЂРµРјСЏ РЅР°С‡Р°Р»Р° РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ РІ С„РѕСЂРјР°С‚Рµ HH:mm.' })
  timeFrom!: string;

  @ApiProperty()
  @IsDefined({ message: 'Р’СЂРµРјСЏ РѕРєРѕРЅС‡Р°РЅРёСЏ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ.' })
  @IsString({ message: 'Р’СЂРµРјСЏ РѕРєРѕРЅС‡Р°РЅРёСЏ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ СЃС‚СЂРѕРєРѕР№.' })
  @IsNotEmpty({ message: 'Р’СЂРµРјСЏ РѕРєРѕРЅС‡Р°РЅРёСЏ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ.' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Р’СЂРµРјСЏ РѕРєРѕРЅС‡Р°РЅРёСЏ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ РІ С„РѕСЂРјР°С‚Рµ HH:mm.' })
  timeTo!: string;

  @ApiProperty()
  @IsDefined({ message: 'РљРѕР»РёС‡РµСЃС‚РІРѕ РёРіСЂРѕРєРѕРІ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ.' })
  @Type(() => Number)
  @IsInt({ message: 'РљРѕР»РёС‡РµСЃС‚РІРѕ РёРіСЂРѕРєРѕРІ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ С†РµР»С‹Рј С‡РёСЃР»РѕРј.' })
  @Min(1, { message: 'РљРѕР»РёС‡РµСЃС‚РІРѕ РёРіСЂРѕРєРѕРІ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ РЅРµ РјРµРЅСЊС€Рµ 1.' })
  @Max(8, { message: 'РљРѕР»РёС‡РµСЃС‚РІРѕ РёРіСЂРѕРєРѕРІ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ РЅРµ Р±РѕР»СЊС€Рµ 8.' })
  playersCount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'РљРѕРјРјРµРЅС‚Р°СЂРёР№ РёРіСЂРѕРєР° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ СЃС‚СЂРѕРєРѕР№.' })
  @MaxLength(1000, { message: 'РљРѕРјРјРµРЅС‚Р°СЂРёР№ РёРіСЂРѕРєР° РЅРµ РґРѕР»Р¶РµРЅ РїСЂРµРІС‹С€Р°С‚СЊ 1000 СЃРёРјРІРѕР»РѕРІ.' })
  commentFromPlayer?: string;
}
