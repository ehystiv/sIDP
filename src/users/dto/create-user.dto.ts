import { IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name!: string;

  @IsString()
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
