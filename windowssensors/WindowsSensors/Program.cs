using System;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace SystemBridgeWindowsSensors
{
  class Program
  {
    static void Main(string[] args)
    {
      string json = args.Length > 0 ? args[0] : "";

      JArray hardwareData = null;
      JObject nvidiaData = null;
      try
      {
        hardwareData = new HardwareMonitor().GetData(json);
      }
      catch (Exception) { }
      try
      {
        nvidiaData = new Nvidia().GetData();
      }
      catch (Exception) { }

      JObject root = new JObject
      {
        //["hardware"] = hardwareData,
        ["nvidia"] = nvidiaData,
      };

      Console.WriteLine(root.ToString(Formatting.None));
      Console.ReadLine();
    }
  }
}
