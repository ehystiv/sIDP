import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';
import { User } from 'src/users/entities/user.entity';
import { CreateRoleDto } from './dto/create-role.dto';

describe('RolesService', () => {
  let service: RolesService;
  let roleRepository: jest.Mocked<Repository<Role>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockRole: Role = {
    id: 'role-id',
    name: 'editor',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser: User = {
    id: 'user-id',
    name: 'John Doe',
    username: 'johndoe',
    email: null,
    password: 'hashed-password',
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null as unknown as Date,
    roles: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
            findOneBy: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    roleRepository = module.get(getRepositoryToken(Role));
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates and saves a new role', async () => {
      const dto: CreateRoleDto = { name: 'editor' };
      roleRepository.create.mockReturnValue(mockRole);
      roleRepository.save.mockResolvedValue(mockRole);

      const result = await service.create(dto);

      expect(roleRepository.create).toHaveBeenCalledWith(dto);
      expect(roleRepository.save).toHaveBeenCalledWith(mockRole);
      expect(result).toEqual(mockRole);
    });
  });

  describe('findAll', () => {
    it('returns a paginated result ordered by name', async () => {
      roleRepository.findAndCount.mockResolvedValue([[mockRole], 1]);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(roleRepository.findAndCount).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
        order: { name: 'ASC' },
      });
      expect(result).toEqual({
        data: [mockRole],
        total: 1,
        page: 2,
        limit: 10,
      });
    });
  });

  describe('findOne', () => {
    it('returns the role when found', async () => {
      roleRepository.findOneBy.mockResolvedValue(mockRole);

      const result = await service.findOne('role-id');

      expect(roleRepository.findOneBy).toHaveBeenCalledWith({
        id: 'role-id',
      });
      expect(result).toEqual(mockRole);
    });

    it('throws NotFoundException when the role does not exist', async () => {
      roleRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('merges the dto into the role and saves it', async () => {
      roleRepository.findOneBy.mockResolvedValue(mockRole);
      roleRepository.save.mockResolvedValue({
        ...mockRole,
        description: 'Updated',
      });

      const result = await service.update('role-id', {
        description: 'Updated',
      });

      expect(roleRepository.save).toHaveBeenCalledWith({
        ...mockRole,
        description: 'Updated',
      });
      expect(result.description).toBe('Updated');
    });

    it('throws NotFoundException when the role does not exist', async () => {
      roleRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { description: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the role when found', async () => {
      roleRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

      const result = await service.remove('role-id');

      expect(roleRepository.delete).toHaveBeenCalledWith({ id: 'role-id' });
      expect(result).toBe(true);
    });

    it('throws NotFoundException when no rows are affected', async () => {
      roleRepository.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.remove('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignToUser', () => {
    it('adds the role to the user when not already assigned', async () => {
      const user = { ...mockUser, roles: [] };
      userRepository.findOne.mockResolvedValue(user);
      roleRepository.findOneBy.mockResolvedValue(mockRole);
      userRepository.save.mockResolvedValue({
        ...user,
        roles: [mockRole],
      });

      const result = await service.assignToUser('user-id', 'role-id');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        relations: { roles: true },
      });
      expect(userRepository.save).toHaveBeenCalledWith({
        ...user,
        roles: [mockRole],
      });
      expect(result.roles).toEqual([mockRole]);
    });

    it('does not duplicate the role when already assigned', async () => {
      const user = { ...mockUser, roles: [mockRole] };
      userRepository.findOne.mockResolvedValue(user);
      roleRepository.findOneBy.mockResolvedValue(mockRole);

      await service.assignToUser('user-id', 'role-id');

      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignToUser('missing-id', 'role-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the role does not exist', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser, roles: [] });
      roleRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.assignToUser('user-id', 'missing-role-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeFromUser', () => {
    it('removes the role from the user', async () => {
      const user = { ...mockUser, roles: [mockRole] };
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({ ...user, roles: [] });

      const result = await service.removeFromUser('user-id', 'role-id');

      expect(userRepository.save).toHaveBeenCalledWith({
        ...user,
        roles: [],
      });
      expect(result.roles).toEqual([]);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeFromUser('missing-id', 'role-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
