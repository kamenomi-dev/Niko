import { Client, MessageEvent, Segment } from "onebot-client-next";

import { Plugin, PluginInstance } from "core/plugin_manager";
import { DEFAULT_HTML_TEMPLATE, Generate } from "core/pretty_feedback";

import os from "node:os";
import fs from "node:fs";
import si from "systeminformation";
import path from "node:path";

export default class extends Plugin implements PluginInstance {
  public PLUGIN_NAME: string = "StatusInformation";
  public PLUGIN_VERSION: string = "v1.0.0-dev";

  public constructor() {
    super();

    this.RegisterCommand({
      name: "唧唧状态",
      callback: this.fn,
    });
  }

  private async fn(this: Client, args: any, event: MessageEvent.TGroupMessageEvent) {
    const memInfo = await si.mem();

    memInfo.used /= 1073741824;
    memInfo.total /= 1073741824;

    Generate(
      `status_info.${event.group_id}`,
      DEFAULT_HTML_TEMPLATE(
        "机体状态",
        /* html */ `
    <div id="status_info">
      <style>
        * {
          margin: 0;
          font-family: "Segoe UI";
        }

        div#status_info {
          top: 0;
          left: 0;
          width: calc(1920px - 32px);

          font-size: larger;
          text-align: center;
        }
      </style>
      <div>
        <p> System: ${systemName} </p>
        <p> CPU: ${cpuName} ${
          (await si.cpuTemperature()).main
        }℃ —— 使用率 <progress value="${cpuUsage}"></progress> </p>
        <p>
          RAM: ${memInfo.used.toFixed(2)}GB / ${memInfo.total.toFixed(2)}GB —— 占用率
          <progress max=${memInfo.total} value=${memInfo.used}></progress
        ></p>
      </div>
    </div>
  `,
      ),
    ).then((buffer) => {
      const tempImage = path.resolve(process.cwd(), "temp/temp.1.png");
      fs.writeFileSync(tempImage, Uint8Array.from(buffer));
      event.reply(Segment.segment.Image(`file://${tempImage}`));
    });
  }
}

const cpuInfo = await si.cpu();
const cpuName = `${cpuInfo.manufacturer} ${cpuInfo.brand} ${cpuInfo.speed}GHz`;

const osInfo = await si.osInfo();
const systemName = `${osInfo.distro} ${osInfo.arch}`;

var cpuUsage = 0;
{
  let __lastStatus = {} as ReturnType<typeof GetCPUStatus>;
  setInterval(() => {
    var currCpuStatus = GetCPUStatus();

    const idle = currCpuStatus.idle - __lastStatus.idle;
    const total = currCpuStatus.total - __lastStatus.total;

    cpuUsage = 1 - idle / total;

    __lastStatus = currCpuStatus;
  }, 1000);
}

function GetCPUStatus() {
  const { idle, total } = os.cpus().reduce(
    (acc, { times }) => {
      acc.idle += times.idle;
      acc.total += times.user + times.nice + times.sys + times.idle + times.irq;
      return acc;
    },
    { idle: 0, total: 0 },
  );

  return { idle, total };
}