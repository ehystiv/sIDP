import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

const mockedArgon2 = argon2 as jest.Mocked<typeof argon2>;

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

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
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            findOneBy: jest.fn(),
            existsBy: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            restore: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates and saves a new user', async () => {
      const dto: CreateUserDto = {
        name: 'John Doe',
        username: 'johndoe',
        password: 'password123',
      };
      repository.create.mockReturnValue(mockUser);
      repository.save.mockResolvedValue(mockUser);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(repository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('returns a paginated, non-deleted result by default', async () => {
      repository.findAndCount.mockResolvedValue([[mockUser], 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(repository.findAndCount).toHaveBeenCalledWith({
        withDeleted: false,
        relations: { roles: true },
        skip: 0,
        take: 20,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({
        data: [mockUser],
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('includes soft-deleted users when trashed is true and paginates', async () => {
      repository.findAndCount.mockResolvedValue([[mockUser], 1]);

      await service.findAll({ page: 2, limit: 10 }, true);

      expect(repository.findAndCount).toHaveBeenCalledWith({
        withDeleted: true,
        relations: { roles: true },
        skip: 10,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('returns the user when found', async () => {
      repository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.findOne('user-id');

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'user-id' });
      expect(result).toEqual(mockUser);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByUsername', () => {
    it('returns the user when found', async () => {
      repository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.findByUsername('johndoe');

      expect(repository.findOneBy).toHaveBeenCalledWith({
        username: 'johndoe',
      });
      expect(result).toEqual(mockUser);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.findByUsername('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('existsUsername', () => {
    it('delegates to the repository existsBy', async () => {
      repository.existsBy.mockResolvedValue(true);

      const result = await service.existsUsername('johndoe');

      expect(repository.existsBy).toHaveBeenCalledWith({
        username: 'johndoe',
      });
      expect(result).toBe(true);
    });
  });

  describe('update', () => {
    it('updates the user without hashing when no password is provided', async () => {
      repository.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      await service.update('user-id', { name: 'New Name' });

      expect(repository.update).toHaveBeenCalledWith(
        { id: 'user-id' },
        { name: 'New Name' },
      );
    });
  });

  describe('changePassword', () => {
    const dto = {
      currentPassword: 'Curr3nt!Pass',
      newPassword: 'N3w!Strong',
    };

    it('rejects when the current password is incorrect', async () => {
      repository.findOneBy.mockResolvedValue(mockUser);
      mockedArgon2.verify.mockResolvedValue(false as never);

      await expect(service.changePassword('user-id', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('hashes the new password and clears the refresh token', async () => {
      repository.findOneBy.mockResolvedValue(mockUser);
      mockedArgon2.verify.mockResolvedValue(true as never);
      mockedArgon2.hash.mockResolvedValue('new-hashed-password' as never);
      repository.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      await service.changePassword('user-id', dto);

      expect(mockedArgon2.hash).toHaveBeenCalledWith(dto.newPassword);
      expect(repository.update).toHaveBeenCalledWith(
        { id: 'user-id' },
        { password: 'new-hashed-password', refreshToken: null },
      );
    });
  });

  describe('updateRefreshToken', () => {
    it('updates the stored refresh token', async () => {
      repository.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      await service.updateRefreshToken('user-id', 'hashed-token');

      expect(repository.update).toHaveBeenCalledWith(
        { id: 'user-id' },
        { refreshToken: 'hashed-token' },
      );
    });

    it('clears the refresh token when given null', async () => {
      repository.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      await service.updateRefreshToken('user-id', null);

      expect(repository.update).toHaveBeenCalledWith(
        { id: 'user-id' },
        { refreshToken: null },
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes the user when found', async () => {
      repository.softDelete.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      const result = await service.remove('user-id');

      expect(repository.softDelete).toHaveBeenCalledWith({
        id: 'user-id',
      });
      expect(result).toBe(true);
    });

    it('throws NotFoundException when no rows are affected', async () => {
      repository.softDelete.mockResolvedValue({
        affected: 0,
        raw: [],
        generatedMaps: [],
      });

      await expect(service.remove('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removePermanently', () => {
    it('hard-deletes the user when found', async () => {
      repository.delete.mockResolvedValue({
        affected: 1,
        raw: [],
      });

      const result = await service.removePermanently('user-id');

      expect(repository.delete).toHaveBeenCalledWith({ id: 'user-id' });
      expect(result).toBe(true);
    });

    it('throws NotFoundException when no rows are affected', async () => {
      repository.delete.mockResolvedValue({
        affected: 0,
        raw: [],
      });

      await expect(service.removePermanently('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
