import { Injectable } from "@nestjs/common";
import { shell } from "electron";

import { CreateOpenDto } from "./dto/create-open.dto";

@Injectable()
export class OpenService {
  async create(createOpenDto: CreateOpenDto): Promise<CreateOpenDto> {
    if (createOpenDto.path.includes("://"))
      shell.openExternal(createOpenDto.path);
    else shell.openPath(createOpenDto.path);
    return createOpenDto;
  }
}
