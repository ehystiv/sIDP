import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import * as argon2 from 'argon2';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);

    return this.userRepository.save(user);
  }

  findAll(trashed = false): Promise<User[]> {
    if (trashed) return this.userRepository.find({ withDeleted: true });
    else return this.userRepository.find();
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

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UpdateResult> {
    const data = { ...updateUserDto };

    if (data.password) {
      data.password = await argon2.hash(data.password);
    }

    return this.userRepository.update({ id }, data);
  }

  updateRefreshToken(
    id: string,
    refreshToken: string | null,
  ): Promise<UpdateResult> {
    return this.userRepository.update({ id }, { refreshToken });
  }

  async remove(id: string): Promise<boolean> {
    const result: UpdateResult = await this.userRepository.softDelete({
      id,
      deletedAt: undefined,
    });

    if (result.affected == 0) throw new NotFoundException('User not found');

    return true;
  }

  async removePermanently(id: string): Promise<boolean> {
    const result = await this.userRepository.delete({ id });

    if (result.affected == 0) throw new NotFoundException('User not found');

    return true;
  }
}
