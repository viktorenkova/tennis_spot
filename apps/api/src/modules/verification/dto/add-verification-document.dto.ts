import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

const DOCUMENT_TYPES = ['registration_certificate', 'tax_document', 'charter', 'other'] as const;

export class AddVerificationDocumentDto {
  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsDefined({ message: 'РўРёРї РґРѕРєСѓРјРµРЅС‚Р° РѕР±СЏР·Р°С‚РµР»РµРЅ.' })
  @IsString({ message: 'РўРёРї РґРѕРєСѓРјРµРЅС‚Р° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ СЃС‚СЂРѕРєРѕР№.' })
  @IsNotEmpty({ message: 'РўРёРї РґРѕРєСѓРјРµРЅС‚Р° РѕР±СЏР·Р°С‚РµР»РµРЅ.' })
  @IsIn(DOCUMENT_TYPES, {
    message: 'РўРёРї РґРѕРєСѓРјРµРЅС‚Р° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РѕРґРЅРёРј РёР· РґРѕРїСѓСЃС‚РёРјС‹С… Р·РЅР°С‡РµРЅРёР№.',
  })
  documentType!: string;

  @ApiProperty()
  @IsDefined({ message: 'РСЃС…РѕРґРЅРѕРµ РёРјСЏ С„Р°Р№Р»Р° РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ.' })
  @IsString({ message: 'РСЃС…РѕРґРЅРѕРµ РёРјСЏ С„Р°Р№Р»Р° РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ СЃС‚СЂРѕРєРѕР№.' })
  @IsNotEmpty({ message: 'РСЃС…РѕРґРЅРѕРµ РёРјСЏ С„Р°Р№Р»Р° РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ.' })
  originalName!: string;

  @ApiProperty()
  @IsDefined({ message: 'РљР»СЋС‡ С…СЂР°РЅРµРЅРёСЏ РѕР±СЏР·Р°С‚РµР»РµРЅ.' })
  @IsString({ message: 'РљР»СЋС‡ С…СЂР°РЅРµРЅРёСЏ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ СЃС‚СЂРѕРєРѕР№.' })
  @IsNotEmpty({ message: 'РљР»СЋС‡ С…СЂР°РЅРµРЅРёСЏ РѕР±СЏР·Р°С‚РµР»РµРЅ.' })
  storageKey!: string;

  @ApiProperty()
  @IsDefined({ message: 'MIME-С‚РёРї РѕР±СЏР·Р°С‚РµР»РµРЅ.' })
  @IsString({ message: 'MIME-С‚РёРї РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ СЃС‚СЂРѕРєРѕР№.' })
  @IsNotEmpty({ message: 'MIME-С‚РёРї РѕР±СЏР·Р°С‚РµР»РµРЅ.' })
  mimeType!: string;

  @ApiProperty()
  @IsDefined({ message: 'Р Р°Р·РјРµСЂ С„Р°Р№Р»Р° РѕР±СЏР·Р°С‚РµР»РµРЅ.' })
  @Type(() => Number)
  @IsInt({ message: 'Р Р°Р·РјРµСЂ С„Р°Р№Р»Р° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ С†РµР»С‹Рј С‡РёСЃР»РѕРј.' })
  @Min(1, { message: 'Р Р°Р·РјРµСЂ С„Р°Р№Р»Р° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ РЅСѓР»СЏ.' })
  sizeBytes!: number;
}
