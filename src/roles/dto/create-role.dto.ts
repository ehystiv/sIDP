import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'editor' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Can edit content', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
