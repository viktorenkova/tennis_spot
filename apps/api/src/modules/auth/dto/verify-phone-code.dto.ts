import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, Length, IsUUID } from 'class-validator';

export class VerifyPhoneCodeDto {
  @ApiProperty({ example: '+79991234567' })
  @IsPhoneNumber('RU')
  phone!: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @Length(4, 8)
  code!: string;

  @ApiProperty({ example: '3a69a67d-971e-4d4a-9b76-7f1a0497b67c' })
  @IsUUID()
  challengeId!: string;
}
