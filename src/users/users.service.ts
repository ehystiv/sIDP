import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import * as argon2 from 'argon2';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from './entities/user.entity';
import {
  Paginated,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);

    return this.userRepository.save(user);
  }

  async findAll(
    { page = 1, limit = 20 }: PaginationQueryDto,
    trashed = false,
  ): Promise<Paginated<User>> {
    const [data, total] = await this.userRepository.findAndCount({
      withDeleted: trashed,
      relations: { roles: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async findOneWithRoles(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { roles: true },
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ username });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  existsUsername(username: string): Promise<boolean> {
    return this.userRepository.existsBy({ username });
  }

  existsEmail(email: string): Promise<boolean> {
    return this.userRepository.existsBy({ email });
  }

  update(id: string, updateUserDto: UpdateUserDto): Promise<UpdateResult> {
    return this.userRepository.update({ id }, updateUserDto);
  }

  async changePassword(
    id: string,
    { currentPassword, newPassword }: ChangePasswordDto,
  ): Promise<boolean> {
    const user = await this.findOne(id);

    const matches = await argon2.verify(user.password, currentPassword);
    if (!matches) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashed = await argon2.hash(newPassword);
    // Invalidate existing sessions on password change by clearing the refresh token.
    await this.userRepository.update(
      { id },
      { password: hashed, refreshToken: null },
    );

    return true;
  }

  updateRefreshToken(
    id: string,
    refreshToken: string | null,
  ): Promise<UpdateResult> {
    return this.userRepository.update({ id }, { refreshToken });
  }

  // --- Admin-only operations ---

  async adminCreate(createUserDto: CreateUserDto): Promise<User> {
    const exists = await this.existsUsername(createUserDto.username);
    if (exists) {
      throw new BadRequestException('Username already exists');
    }

    if (createUserDto.email && (await this.existsEmail(createUserDto.email))) {
      throw new BadRequestException('Email already exists');
    }

    const user = this.userRepository.create({
      ...createUserDto,
      password: await argon2.hash(createUserDto.password),
    });

    return this.userRepository.save(user);
  }

  async resetPassword(id: string, newPassword: string): Promise<boolean> {
    await this.findOne(id);

    const hashed = await argon2.hash(newPassword);
    // Clear the refresh token so existing sessions are invalidated.
    await this.userRepository.update(
      { id },
      { password: hashed, refreshToken: null },
    );

    return true;
  }

  async restore(id: string): Promise<boolean> {
    const result = await this.userRepository.restore({ id });

    if (result.affected == 0) throw new NotFoundException('User not found');

    return true;
  }

  async remove(id: string): Promise<boolean> {
    const result: UpdateResult = await this.userRepository.softDelete({ id });

    if (result.affected == 0) throw new NotFoundException('User not found');

    return true;
  }

  async removePermanently(id: string): Promise<boolean> {
    const result = await this.userRepository.delete({ id });

    if (result.affected == 0) throw new NotFoundException('User not found');

    return true;
  }
}
