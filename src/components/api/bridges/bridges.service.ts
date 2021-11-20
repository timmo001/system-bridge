import { DeleteResult, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Service } from "mdns";

import { Bridge } from "./entities/bridges.entity";
import { CreateBridgeDto } from "./dto/create-bridge.dto";
import { MDNSBrowser } from "../../mdns/browser";
import { MDNSTextRecord } from "../../mdns/mdnsTextRecord";
import { UpdateBridgeDto } from "./dto/update-bridge.dto";

@Injectable()
export class BridgesService {
  constructor(
    @InjectRepository(Bridge)
    private readonly bridgeRepository: Repository<Bridge>
  ) {
    const mdnsBrowser = new MDNSBrowser(async (services: Array<Service>) => {
      for (const service of services) {
        const mdnsTextRecord = service.txtRecord as MDNSTextRecord;
        await this.create({
          key: mdnsTextRecord.uuid,
          name: `${mdnsTextRecord.host} (${mdnsTextRecord.ip})`,
          host: mdnsTextRecord.host,
          port: mdnsTextRecord.port,
        });
      }
    });
    (async () => {
      await mdnsBrowser.startBrowser();
    })();
  }

  async findAll(): Promise<Array<Bridge>> {
    return await this.bridgeRepository.find();
  }

  async findOne(key: string): Promise<Bridge> {
    return await this.bridgeRepository.findOne(key);
  }

  async create(bridge: CreateBridgeDto): Promise<Bridge> {
    return await this.bridgeRepository.save(bridge);
  }

  async remove(key: string): Promise<DeleteResult> {
    return await this.bridgeRepository.delete(key);
  }

  async update(key: string, bridge: UpdateBridgeDto): Promise<Bridge> {
    await this.bridgeRepository.update(key, bridge);
    return await this.bridgeRepository.findOne(key);
  }
}
