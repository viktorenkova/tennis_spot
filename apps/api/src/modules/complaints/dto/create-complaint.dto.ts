import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export const complaintTypes = [
  'no_show',
  'late_cancel',
  'bad_behavior',
  'court_issue',
  'other',
] as const;

export type CreateComplaintType = (typeof complaintTypes)[number];

export class CreateComplaintDto {
  @ApiProperty({
    enum: complaintTypes,
  })
  @IsDefined({ message: 'Тип жалобы обязателен.' })
  @IsIn(complaintTypes, {
    message: 'Тип жалобы должен быть одним из поддерживаемых значений.',
  })
  type!: CreateComplaintType;

  @ApiProperty()
  @IsDefined({ message: 'Описание жалобы обязательно.' })
  @IsString({ message: 'Описание жалобы должно быть строкой.' })
  @IsNotEmpty({ message: 'Описание жалобы не должно быть пустым.' })
  @MinLength(10, { message: 'Описание жалобы должно быть не короче 10 символов.' })
  @MaxLength(2000, { message: 'Описание жалобы не должно превышать 2000 символов.' })
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'Идентификатор пользователя должен быть корректным UUID.' })
  targetUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'Идентификатор заявки на бронь должен быть корректным UUID.' })
  relatedBookingRequestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'Идентификатор вызова на игру должен быть корректным UUID.' })
  relatedMatchRequestId?: string;
}
