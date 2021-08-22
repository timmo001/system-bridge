import { getRepositoryToken } from "@nestjs/typeorm";
import { Test, TestingModule } from "@nestjs/testing";

import { Setting } from "./entities/setting.entity";
import { SettingsService } from "./settings.service";

describe("SettingsService", () => {
  let service: SettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getRepositoryToken(Setting),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
