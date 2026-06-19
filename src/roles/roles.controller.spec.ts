import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

describe('RolesController', () => {
  let controller: RolesController;
  let service: jest.Mocked<RolesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RolesController>(RolesController);
    service = module.get(RolesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to the service', async () => {
      const dto = { name: 'editor' };
      service.create.mockResolvedValue({} as never);

      await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('delegates to the service with pagination', async () => {
      const pagination = { page: 1, limit: 20 };
      service.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await controller.findAll(pagination);

      expect(service.findAll).toHaveBeenCalledWith(pagination);
    });
  });

  describe('findOne', () => {
    it('delegates to the service', async () => {
      service.findOne.mockResolvedValue({} as never);

      await controller.findOne('role-id');

      expect(service.findOne).toHaveBeenCalledWith('role-id');
    });
  });

  describe('update', () => {
    it('delegates to the service', async () => {
      const dto = { description: 'Updated' };
      service.update.mockResolvedValue({} as never);

      await controller.update('role-id', dto);

      expect(service.update).toHaveBeenCalledWith('role-id', dto);
    });
  });

  describe('remove', () => {
    it('delegates to the service', async () => {
      service.remove.mockResolvedValue(true);

      await controller.remove('role-id');

      expect(service.remove).toHaveBeenCalledWith('role-id');
    });
  });
});
