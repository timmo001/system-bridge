using Newtonsoft.Json.Linq;
using NvAPIWrapper;
using NvAPIWrapper.Display;
using NvAPIWrapper.GPU;

namespace SystemBridgeWindowsSensors
{
  public class Nvidia
  {
    public Nvidia()
    {
    }

    public JObject GetData()
    {
      NVIDIA.Initialize();

      JObject chipset = new JObject
      {
        ["id"] = NVIDIA.ChipsetInfo.DeviceId,
        ["name"] = NVIDIA.ChipsetInfo.ChipsetName,
        ["flags"] = NVIDIA.ChipsetInfo.Flags.ToString(),
        ["vendor_id"] = NVIDIA.ChipsetInfo.VendorId,
        ["vendor_name"] = NVIDIA.ChipsetInfo.VendorName,
      };

      JArray displaysArr = new JArray();
      foreach (Display display in Display.GetDisplays())
      {
        displaysArr.Add(new JObject
        {
          ["id"] = display.DisplayDevice.DisplayId,
          ["name"] = display.Name,
          ["active"] = display.DisplayDevice.IsActive,
          ["avaliable"] = display.DisplayDevice.IsAvailable,
          ["connected"] = display.DisplayDevice.IsConnected,
          ["dynamic"] = display.DisplayDevice.IsDynamic,
          ["aspect_horizontal"] = display.DisplayDevice.CurrentTiming.Extra.HorizontalAspect,
          ["aspect_vertical"] = display.DisplayDevice.CurrentTiming.Extra.VerticalAspect,
          ["brightness_current"] = display.DigitalVibranceControl.CurrentLevel,
          ["brightness_default"] = display.DigitalVibranceControl.DefaultLevel,
          ["brightness_max"] = display.DigitalVibranceControl.MaximumLevel,
          ["brightness_min"] = display.DigitalVibranceControl.MinimumLevel,
          ["color_depth"] = display.DisplayDevice.CurrentColorData.ColorDepth.Value.ToString(),
          ["connection_type"] = display.DisplayDevice.ConnectionType.ToString(),
          ["pixel_clock"] = display.DisplayDevice.CurrentTiming.PixelClockIn10KHertz,
          ["refresh_rate"] = display.DisplayDevice.CurrentTiming.Extra.RefreshRate,
          ["resolution_horizontal"] = display.DisplayDevice.CurrentTiming.HorizontalVisible,
          ["resolution_vertical"] = display.DisplayDevice.CurrentTiming.VerticalVisible,
        });
      }

      JObject driver = new JObject
      {
        ["branch_version"] = NVIDIA.DriverBranchVersion,
        ["interface_version"] = NVIDIA.InterfaceVersionString,
        ["version"] = NVIDIA.DriverVersion,
      };

      JArray gpusArr = new JArray();
      foreach (PhysicalGPU gpu in PhysicalGPU.GetPhysicalGPUs())
      {
        gpusArr.Add(new JObject
        {
          ["id"] = gpu.GPUId,
          ["name"] = gpu.FullName,
          ["bios_oem_revision"] = gpu.Bios.OEMRevision,
          ["bios_revision"] = gpu.Bios.Revision,
          ["bios_version"] = gpu.Bios.VersionString,
          ["current_fan_speed_level"] = gpu.CoolerInformation.CurrentFanSpeedLevel,
          ["current_fan_speed_rpm"] = gpu.CoolerInformation.CurrentFanSpeedInRPM,
          ["current_temperature"] = gpu.ThermalInformation.CurrentThermalLevel,
          ["driver_model"] = gpu.DriverModel,
          ["memory_avaliable"] = gpu.MemoryInformation.CurrentAvailableDedicatedVideoMemoryInkB,
          ["memory_capacity"] = gpu.MemoryInformation.DedicatedVideoMemoryInkB,
          ["memory_maker"] = gpu.MemoryInformation.RAMMaker.ToString(),
          ["serial"] = gpu.Board.SerialNumber,
          ["system_type"] = gpu.SystemType.ToString(),
          ["type"] = gpu.GPUType.ToString(),
        });
      }


      return new JObject
      {
        ["chipset"] = chipset,
        ["displays"] = displaysArr,
        ["driver"] = driver,
        ["gpus"] = gpusArr,
      };
    }

  }
}
