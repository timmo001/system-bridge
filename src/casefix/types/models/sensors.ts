export interface SensorsWindowsSensor {
  id: string;
  name: string;
  type: string;
  value?: number | string;
}

export interface SensorsWindowsHardware {
  id: string;
  name: string;
  type: string;
  subhardware: SensorsWindowsHardware[];
  sensors: SensorsWindowsSensor[];
}

export interface SensorsWindows {
  hardware?: SensorsWindowsHardware[];
  nvidia?: any;
}

export interface Sensors {
  fans?: any;
  temperatures?: any;
  windows_sensors?: SensorsWindows;
}
