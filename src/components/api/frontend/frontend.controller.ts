import { Controller, Get, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";

import { FrontendService } from "./frontend.service";

@Controller("app")
export class FrontendController {
  constructor(private readonly frontendService: FrontendService) {}

  @Get("_next*")
  public async assets(@Req() req: Request, @Res() res: Response) {
    await this.frontendService.handler(req, res);
  }

  @Get("favicon.ico")
  public async favicon(@Req() req: Request, @Res() res: Response) {
    await this.frontendService.handler(req, res);
  }

  @Get("data")
  public async showData(@Req() req: Request, @Res() res: Response) {
    await this.frontendService.handler(req, res);
  }

  @Get("logs")
  public async showLogs(@Req() req: Request, @Res() res: Response) {
    await this.frontendService.handler(req, res);
  }

  @Get("settings")
  public async showSettings(@Req() req: Request, @Res() res: Response) {
    await this.frontendService.handler(req, res);
  }
}
