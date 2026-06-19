import { Test, TestingModule } from '@nestjs/testing';
import { UserRolesController } from './user-roles.controller';
import { RolesService } from './roles.service';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

describe('UserRolesController', () => {
  let controller: UserRolesController;
  let service: jest.Mocked<RolesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserRolesController],
      providers: [
        {
          provide: RolesService,
          useValue: {
            assignToUser: jest.fn(),
            removeFromUser: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserRolesController>(UserRolesController);
    service = module.get(RolesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('assign', () => {
    it('delegates to the service', async () => {
      service.assignToUser.mockResolvedValue({} as never);

      await controller.assign('user-id', 'role-id');

      expect(service.assignToUser).toHaveBeenCalledWith('user-id', 'role-id');
    });
  });

  describe('remove', () => {
    it('delegates to the service', async () => {
      service.removeFromUser.mockResolvedValue({} as never);

      await controller.remove('user-id', 'role-id');

      expect(service.removeFromUser).toHaveBeenCalledWith('user-id', 'role-id');
    });
  });
});
