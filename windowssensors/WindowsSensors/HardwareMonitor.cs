using LibreHardwareMonitor.Hardware;
using Newtonsoft.Json.Linq;

namespace SystemBridgeWindowsSensors
{
  public class HardwareMonitor
  {
    public HardwareMonitor()
    {
    }

    public JArray GetData(string json)
    {
      Computer computer = new Computer();

      if (json.StartsWith("{") && json.EndsWith("}"))
      {
        JObject objArgs = JObject.Parse(json);

        computer.IsControllerEnabled = objArgs.SelectToken("controller") != null && (bool)objArgs["controller"];
        computer.IsCpuEnabled = objArgs.SelectToken("cpu") != null && (bool)objArgs["cpu"];
        computer.IsGpuEnabled = objArgs.SelectToken("gpu") != null && (bool)objArgs["gpu"];
        computer.IsMemoryEnabled = objArgs.SelectToken("memory") != null && (bool)objArgs["memory"];
        computer.IsMotherboardEnabled = objArgs.SelectToken("motherboard") != null && (bool)objArgs["motherboard"];
        computer.IsNetworkEnabled = objArgs.SelectToken("network") != null && (bool)objArgs["network"];
        computer.IsStorageEnabled = objArgs.SelectToken("storage") != null && (bool)objArgs["storage"];
      }
      else
      {
        computer.IsControllerEnabled = true;
        computer.IsCpuEnabled = true;
        computer.IsGpuEnabled = true;
        computer.IsMemoryEnabled = true;
        computer.IsMotherboardEnabled = true;
        computer.IsNetworkEnabled = true;
        computer.IsStorageEnabled = true;
      }

      computer.Open();
      computer.Accept(new UpdateVisitor());

      JArray arrRoot = new JArray();

      foreach (IHardware hardware in computer.Hardware)
      {
        JObject objHardware = new JObject
        {
          ["id"] = hardware.Identifier.ToString(),
          ["name"] = hardware.Name,
          ["type"] = hardware.HardwareType.ToString(),
        };

        JArray arrSubHardware = new JArray();

        foreach (IHardware subhardware in hardware.SubHardware)
        {
          JObject objSubHardware = new JObject
          {
            ["id"] = hardware.Identifier.ToString(),
            ["name"] = hardware.Name,
            ["type"] = hardware.HardwareType.ToString(),
          };

          JArray arrSubHardwareSensors = new JArray();

          foreach (ISensor sensor in subhardware.Sensors)
          {
            arrSubHardwareSensors.Add(new JObject
            {
              ["id"] = sensor.Identifier.ToString(),
              ["name"] = sensor.Name,
              ["type"] = sensor.SensorType.ToString(),
              ["value"] = sensor.Value,
            });
          }
          objSubHardware["sensors"] = arrSubHardwareSensors;
          arrSubHardware.Add(objSubHardware);
        }

        objHardware["subhardware"] = arrSubHardware;

        JArray arrSensors = new JArray();

        foreach (ISensor sensor in hardware.Sensors)
        {
          arrSensors.Add(new JObject
          {
            ["id"] = sensor.Identifier.ToString(),
            ["name"] = sensor.Name,
            ["type"] = sensor.SensorType.ToString(),
            ["value"] = sensor.Value,
          });
        }

        objHardware["sensors"] = arrSensors;

        arrRoot.Add(objHardware);
      }

      return arrRoot;
    }
  }
}
