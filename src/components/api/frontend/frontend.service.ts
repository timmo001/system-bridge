import { Injectable, OnModuleInit } from "@nestjs/common";
import { NextServer } from "next/dist/server/next";
import { Request, Response } from "express";
import next from "next";

@Injectable()
export class FrontendService implements OnModuleInit {
  private server: NextServer;

  async onModuleInit(): Promise<void> {
    try {
      this.server = next({
        dev: false,
        dir: "./frontend",
      });
      await this.server.prepare();
    } catch (error) {
      console.error(error);
    }
  }

  handler(req: Request, res: Response) {
    return this.server.getRequestHandler()(req, res);
  }
}
