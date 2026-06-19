import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'N3w!Strong',
    description:
      'Min 8 chars, with at least one lowercase, one uppercase, one number and one symbol',
  })
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  newPassword!: string;
}
