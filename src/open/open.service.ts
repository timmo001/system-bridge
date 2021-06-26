import { Injectable } from "@nestjs/common";
import open from "open";

import { CreateOpenDto } from "./dto/create-open.dto";

@Injectable()
export class OpenService {
  async create(createOpenDto: CreateOpenDto): Promise<CreateOpenDto> {
    open(createOpenDto.path);
    return createOpenDto;
  }
}
