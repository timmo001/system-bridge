import { uuid } from "systeminformation";
import mqtt from "mqtt";

import { getConnection, getSettingsObject } from "./common";
import { Logger } from "./logger";
export class MQTT {
  private mqttClient: mqtt.MqttClient;

  clientId: string;

  async setup(): Promise<void> {
    const connection = await getConnection();
    const settings = await getSettingsObject(connection);
    await connection.close();

    if (settings["mqtt-enabled"] === "true") {
      const { logger } = new Logger("MQTT");

      logger.info("Setup");
      this.clientId = (await uuid()).os;
      this.mqttClient = mqtt.connect(
        `mqtt://${settings["mqtt-host"] || "localhost"}:${
          Number(settings["mqtt-port"]) > 0
            ? Number(settings["mqtt-port"])
            : 1883
        }`,
        {
          username: settings["mqtt-username"],
          password: settings["mqtt-password"],
          clientId: this.clientId,
          reconnectPeriod: 10000,
        }
      );
      logger.close();
    }
  }

  async publish(topicSuffix: string, data: string): Promise<void> {
    if (this.mqttClient) {
      const { logger } = new Logger("MQTT");

      const topic = `systembridge/${this.clientId}/${topicSuffix}`;
      logger.debug(`Publishing to topic ${topic}`);
      this.mqttClient.publish(
        topic,
        data,
        { qos: 0, retain: true },
        (error?: Error) => {
          if (error) {
            const { logger } = new Logger("MQTT");
            logger.error(`Error publishing message: ${error.message}`);
            logger.close();
          }
        }
      );
      logger.close();
    }
  }
}
