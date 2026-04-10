import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber } from 'class-validator';

export class RequestPhoneCodeDto {
  @ApiProperty({ example: '+79991234567' })
  @IsPhoneNumber('RU', { message: 'Телефон должен быть указан в корректном российском формате.' })
  phone!: string;
}
