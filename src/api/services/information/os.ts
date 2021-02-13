import si, { Systeminformation } from "systeminformation";

export interface OsInfo extends Systeminformation.OsData {
  users: Systeminformation.UserData[];
}

export default class OsInfoService {
  async find(): Promise<OsInfo> {
    return {
      ...(await si.osInfo()),
      users: await si.users(),
    };
  }
}
