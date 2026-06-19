import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { User } from 'src/users/entities/user.entity';
import {
  Paginated,
  PaginationQueryDto,
} from 'src/common/dto/pagination-query.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  create(createRoleDto: CreateRoleDto): Promise<Role> {
    const role = this.roleRepository.create(createRoleDto);

    return this.roleRepository.save(role);
  }

  async findAll({
    page = 1,
    limit = 20,
  }: PaginationQueryDto): Promise<Paginated<Role>> {
    const [data, total] = await this.roleRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { name: 'ASC' },
    });

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepository.findOneBy({ id });

    if (!role) throw new NotFoundException('Role not found');

    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    Object.assign(role, updateRoleDto);

    return this.roleRepository.save(role);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.roleRepository.delete({ id });

    if (result.affected == 0) throw new NotFoundException('Role not found');

    return true;
  }

  async assignToUser(userId: string, roleId: string): Promise<User> {
    const user = await this.findUserWithRoles(userId);
    const role = await this.findOne(roleId);

    if (!user.roles.some((r) => r.id === role.id)) {
      user.roles.push(role);
      await this.userRepository.save(user);
    }

    return user;
  }

  async removeFromUser(userId: string, roleId: string): Promise<User> {
    const user = await this.findUserWithRoles(userId);

    user.roles = user.roles.filter((role) => role.id !== roleId);
    await this.userRepository.save(user);

    return user;
  }

  private async findUserWithRoles(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { roles: true },
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }
}
