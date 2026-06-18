import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AuthDto {
  @ApiProperty({ example: 'johndoe' })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password!: string;
}
