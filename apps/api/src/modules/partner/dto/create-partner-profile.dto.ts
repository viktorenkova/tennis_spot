import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartnerTypeKey } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePartnerProfileDto {
  @ApiProperty()
  @IsDefined({ message: 'Р®СЂРёРґРёС‡РµСЃРєРѕРµ РЅР°Р·РІР°РЅРёРµ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ.' })
  @IsString({ message: 'Р®СЂРёРґРёС‡РµСЃРєРѕРµ РЅР°Р·РІР°РЅРёРµ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ СЃС‚СЂРѕРєРѕР№.' })
  @IsNotEmpty({ message: 'Р®СЂРёРґРёС‡РµСЃРєРѕРµ РЅР°Р·РІР°РЅРёРµ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ.' })
  @MaxLength(255, { message: 'Р®СЂРёРґРёС‡РµСЃРєРѕРµ РЅР°Р·РІР°РЅРёРµ РЅРµ РґРѕР»Р¶РЅРѕ РїСЂРµРІС‹С€Р°С‚СЊ 255 СЃРёРјРІРѕР»РѕРІ.' })
  legalName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'РќР°Р·РІР°РЅРёРµ Р±СЂРµРЅРґР° РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ СЃС‚СЂРѕРєРѕР№.' })
  @MaxLength(255, { message: 'РќР°Р·РІР°РЅРёРµ Р±СЂРµРЅРґР° РЅРµ РґРѕР»Р¶РЅРѕ РїСЂРµРІС‹С€Р°С‚СЊ 255 СЃРёРјРІРѕР»РѕРІ.' })
  brandName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'РћРїРёСЃР°РЅРёРµ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ СЃС‚СЂРѕРєРѕР№.' })
  @MaxLength(2000, { message: 'РћРїРёСЃР°РЅРёРµ РЅРµ РґРѕР»Р¶РЅРѕ РїСЂРµРІС‹С€Р°С‚СЊ 2000 СЃРёРјРІРѕР»РѕРІ.' })
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'РљРѕРЅС‚Р°РєС‚РЅС‹Р№ С‚РµР»РµС„РѕРЅ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ СЃС‚СЂРѕРєРѕР№.' })
  @MaxLength(32, { message: 'РљРѕРЅС‚Р°РєС‚РЅС‹Р№ С‚РµР»РµС„РѕРЅ РЅРµ РґРѕР»Р¶РµРЅ РїСЂРµРІС‹С€Р°С‚СЊ 32 СЃРёРјРІРѕР»Р°.' })
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'РЈРєР°Р¶РёС‚Рµ РєРѕСЂСЂРµРєС‚РЅС‹Р№ email РґР»СЏ СЃРІСЏР·Рё.' })
  @MaxLength(255, { message: 'РљРѕРЅС‚Р°РєС‚РЅС‹Р№ email РЅРµ РґРѕР»Р¶РµРЅ РїСЂРµРІС‹С€Р°С‚СЊ 255 СЃРёРјРІРѕР»РѕРІ.' })
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'РРќРќ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ СЃС‚СЂРѕРєРѕР№.' })
  @MaxLength(32, { message: 'РРќРќ РЅРµ РґРѕР»Р¶РµРЅ РїСЂРµРІС‹С€Р°С‚СЊ 32 СЃРёРјРІРѕР»Р°.' })
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Р®СЂРёРґРёС‡РµСЃРєРёР№ Р°РґСЂРµСЃ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ СЃС‚СЂРѕРєРѕР№.' })
  @MaxLength(500, { message: 'Р®СЂРёРґРёС‡РµСЃРєРёР№ Р°РґСЂРµСЃ РЅРµ РґРѕР»Р¶РµРЅ РїСЂРµРІС‹С€Р°С‚СЊ 500 СЃРёРјРІРѕР»РѕРІ.' })
  legalAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Р¤Р°РєС‚РёС‡РµСЃРєРёР№ Р°РґСЂРµСЃ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ СЃС‚СЂРѕРєРѕР№.' })
  @MaxLength(500, { message: 'Р¤Р°РєС‚РёС‡РµСЃРєРёР№ Р°РґСЂРµСЃ РЅРµ РґРѕР»Р¶РµРЅ РїСЂРµРІС‹С€Р°С‚СЊ 500 СЃРёРјРІРѕР»РѕРІ.' })
  actualAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'РРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РіРѕСЂРѕРґР° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РєРѕСЂСЂРµРєС‚РЅС‹Рј UUID.' })
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'РРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ СЂР°Р№РѕРЅР° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РєРѕСЂСЂРµРєС‚РЅС‹Рј UUID.' })
  districtId?: string;

  @ApiProperty({ type: [String], enum: ['club', 'school', 'organizer', 'store', 'mixed'] })
  @IsDefined({ message: 'РўРёРїС‹ РїР°СЂС‚РЅРµСЂР° РѕР±СЏР·Р°С‚РµР»СЊРЅС‹.' })
  @IsArray({ message: 'РЎРїРёСЃРѕРє С‚РёРїРѕРІ РїР°СЂС‚РЅРµСЂР° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РјР°СЃСЃРёРІРѕРј.' })
  @ArrayMinSize(1, { message: 'Р’С‹Р±РµСЂРёС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ С‚РёРї РїР°СЂС‚РЅРµСЂР°.' })
  @IsEnum(PartnerTypeKey, {
    each: true,
    message: 'РљР°Р¶РґС‹Р№ С‚РёРї РїР°СЂС‚РЅРµСЂР° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РѕРґРЅРёРј РёР· РґРѕРїСѓСЃС‚РёРјС‹С… Р·РЅР°С‡РµРЅРёР№.',
  })
  partnerTypes!: PartnerTypeKey[];
}
