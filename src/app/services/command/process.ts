import execa from "execa";

export interface ProcessCommand {
  command: string;
  arguments: string[];
}

export interface CommandResponse {
  success: boolean;
  message: string;
}

export default class ProcessCommandService {
  async create(data: ProcessCommand): Promise<CommandResponse> {
    const { stdout, stderr } = await execa(data.command, data.arguments);
    console.log({ stdout, stderr });
    return {
      success: stderr ? false : true,
      message: stdout,
    };
  }
}
