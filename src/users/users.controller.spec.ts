import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { IDPRequest } from '../auth/idp-request.interface';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  const buildRequest = (sub: string): IDPRequest =>
    ({
      user: { sub, username: 'johndoe' },
    }) as unknown as IDPRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('delegates to the service with the trashed flag', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll(true);

      expect(service.findAll).toHaveBeenCalledWith(true);
    });
  });

  describe('findOne', () => {
    it('delegates to the service with the given id', async () => {
      service.findOne.mockResolvedValue({} as never);

      await controller.findOne('user-id');

      expect(service.findOne).toHaveBeenCalledWith('user-id');
    });
  });

  describe('update', () => {
    it('updates the user when the requester owns the account', async () => {
      service.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });
      const req = buildRequest('user-id');

      await controller.update('user-id', { name: 'New Name' }, req);

      expect(service.update).toHaveBeenCalledWith('user-id', {
        name: 'New Name',
      });
    });

    it('throws ForbiddenException when the requester does not own the account', async () => {
      const req = buildRequest('other-id');

      expect(() =>
        controller.update('user-id', { name: 'New Name' }, req),
      ).toThrow(ForbiddenException);
      expect(service.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes the user when the requester owns the account', async () => {
      service.remove.mockResolvedValue(true);
      const req = buildRequest('user-id');

      await controller.remove('user-id', req);

      expect(service.remove).toHaveBeenCalledWith('user-id');
    });

    it('throws ForbiddenException when the requester does not own the account', async () => {
      const req = buildRequest('other-id');

      expect(() => controller.remove('user-id', req)).toThrow(
        ForbiddenException,
      );
      expect(service.remove).not.toHaveBeenCalled();
    });
  });
});
