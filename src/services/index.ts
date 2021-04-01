import { Application } from "../declarations";
import audio from "./audio/audio.service";
import battery from "./battery/battery.service";
import bluetooth from "./bluetooth/bluetooth.service";
import command from "./command/command.service";
import cpu from "./cpu/cpu.service";
import display from "./display/display.service";
import filesystem from "./filesystem/filesystem.service";
import graphics from "./graphics/graphics.service";
import information from "./information/information.service";
import memory from "./memory/memory.service";
import network from "./network/network.service";
import notification from "./notification/notification.service";
import open from "./open/open.service";
import os from "./os/os.service";
import processes from "./processes/processes.service";
import system from "./system/system.service";

export default function (app: Application): void {
  app.configure(audio);
  app.configure(battery);
  app.configure(bluetooth);
  app.configure(command);
  app.configure(cpu);
  app.configure(display);
  app.configure(filesystem);
  app.configure(graphics);
  app.configure(information);
  app.configure(memory);
  app.configure(network);
  app.configure(notification);
  app.configure(open);
  app.configure(os);
  app.configure(processes);
  app.configure(system);
}
