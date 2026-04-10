import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, Length, IsUUID } from 'class-validator';

export class VerifyPhoneCodeDto {
  @ApiProperty({ example: '+79991234567' })
  @IsPhoneNumber('RU', { message: 'Телефон должен быть указан в корректном российском формате.' })
  phone!: string;

  @ApiProperty({ example: '1234' })
  @IsString({ message: 'Код подтверждения должен быть строкой.' })
  @Length(4, 8, { message: 'Код подтверждения должен содержать от 4 до 8 символов.' })
  code!: string;

  @ApiProperty({ example: '3a69a67d-971e-4d4a-9b76-7f1a0497b67c' })
  @IsUUID('4', { message: 'Challenge ID должен быть корректным UUID.' })
  challengeId!: string;
}
