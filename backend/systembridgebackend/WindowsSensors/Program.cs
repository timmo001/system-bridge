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

      JObject root = new JObject
      {
        ["hardware"] = new HardwareMonitor().GetData(json),
        ["nvidia"] = new Nvidia().GetData(),
      };

      Console.WriteLine(root.ToString(Formatting.None));
    }
  }
}
