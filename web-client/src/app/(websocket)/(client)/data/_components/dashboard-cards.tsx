"use client";

import {
  Cpu,
  HardDrive,
  MemoryStick,
  Monitor,
  Wifi,
  Battery,
  Thermometer,
  Activity,
  Zap,
  Server,
  Gauge
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";

interface DashboardCardsProps {
  data: any;
}

export function DashboardCards({ data }: DashboardCardsProps) {
  return (
    <div className="grid gap-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SystemCard title="CPU Usage" data={data?.cpu} icon={Cpu} />
        <SystemCard title="Memory" data={data?.memory} icon={MemoryStick} />
        <SystemCard title="Battery" data={data?.battery} icon={Battery} />
        <SystemCard title="Network" data={data?.networks} icon={Wifi} />
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CPUDetails data={data?.cpu} />
        <MemoryDetails data={data?.memory} />
        <DiskDetails data={data?.disks} />
        <NetworkDetails data={data?.networks} />
        <DisplayDetails data={data?.displays} />
        <SensorDetails data={data?.sensors} />
      </div>
    </div>
  );
}

function SystemCard({ title, data, icon: Icon }: { title: string; data: any; icon: any }) {
  const getUsagePercentage = () => {
    if (title === "CPU Usage" && data?.usage !== undefined) {
      return Math.round(data.usage);
    }
    if (title === "Memory" && data?.usage !== undefined) {
      return Math.round(data.usage);
    }
    if (title === "Battery" && data?.percentage !== undefined) {
      return Math.round(data.percentage);
    }
    return null;
  };

  const usage = getUsagePercentage();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {usage !== null ? (
          <div className="space-y-2">
            <div className="text-2xl font-bold">{usage}%</div>
            <Progress value={usage} className="h-2" />
          </div>
        ) : (
          <div className="text-2xl font-bold">
            {data ? "Connected" : "N/A"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CPUDetails({ data }: { data: any }) {
  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          <CardTitle>CPU Information</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.name && (
          <div>
            <p className="text-sm font-medium">Processor</p>
            <p className="text-sm text-muted-foreground">{data.name}</p>
          </div>
        )}
        {data.cores && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Cores</p>
              <p className="text-sm text-muted-foreground">{data.cores}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Logical Cores</p>
              <p className="text-sm text-muted-foreground">{data.logicalCores || data.cores}</p>
            </div>
          </div>
        )}
        {data.usage !== undefined && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>CPU Usage</span>
              <span>{Math.round(data.usage)}%</span>
            </div>
            <Progress value={data.usage} />
          </div>
        )}
        {data.frequency && (
          <div>
            <p className="text-sm font-medium">Frequency</p>
            <p className="text-sm text-muted-foreground">{Math.round(data.frequency)} MHz</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MemoryDetails({ data }: { data: any }) {
  if (!data) return null;

  const totalGB = data.total ? (data.total / (1024 ** 3)).toFixed(1) : null;
  const usedGB = data.used ? (data.used / (1024 ** 3)).toFixed(1) : null;
  const availableGB = data.available ? (data.available / (1024 ** 3)).toFixed(1) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MemoryStick className="h-5 w-5" />
          <CardTitle>Memory Information</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalGB && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm font-medium">Total</p>
              <p className="text-lg font-bold">{totalGB} GB</p>
            </div>
            <div>
              <p className="text-sm font-medium">Used</p>
              <p className="text-lg font-bold text-orange-600">{usedGB} GB</p>
            </div>
            <div>
              <p className="text-sm font-medium">Available</p>
              <p className="text-lg font-bold text-green-600">{availableGB} GB</p>
            </div>
          </div>
        )}
        {data.usage !== undefined && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Memory Usage</span>
              <span>{Math.round(data.usage)}%</span>
            </div>
            <Progress value={data.usage} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DiskDetails({ data }: { data: any }) {
  if (!data || !Array.isArray(data)) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          <CardTitle>Storage Information</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.slice(0, 3).map((disk: any, index: number) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {disk.name || disk.device || `Disk ${index + 1}`}
              </span>
              {disk.usage !== undefined && (
                <span className="text-sm text-muted-foreground">
                  {Math.round(disk.usage)}%
                </span>
              )}
            </div>
            {disk.total && (
              <p className="text-xs text-muted-foreground">
                {(disk.total / (1024 ** 3)).toFixed(1)} GB total
              </p>
            )}
            {disk.usage !== undefined && (
              <Progress value={disk.usage} className="h-1" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function NetworkDetails({ data }: { data: any }) {
  if (!data) return null;

  const networks = Array.isArray(data) ? data.slice(0, 2) : [data];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          <CardTitle>Network Information</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {networks.map((network: any, index: number) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {network.name || network.interface || `Network ${index + 1}`}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                network.isUp ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {network.isUp ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {network.ip && (
              <p className="text-xs text-muted-foreground">IP: {network.ip}</p>
            )}
            {network.speed && (
              <p className="text-xs text-muted-foreground">Speed: {network.speed} Mbps</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DisplayDetails({ data }: { data: any }) {
  if (!data || !Array.isArray(data)) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          <CardTitle>Display Information</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.slice(0, 2).map((display: any, index: number) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {display.name || `Display ${index + 1}`}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                display.primary ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {display.primary ? 'Primary' : 'Secondary'}
              </span>
            </div>
            {display.resolution && (
              <p className="text-xs text-muted-foreground">
                {display.resolution.width} × {display.resolution.height}
              </p>
            )}
            {display.refreshRate && (
              <p className="text-xs text-muted-foreground">
                {display.refreshRate} Hz
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SensorDetails({ data }: { data: any }) {
  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Thermometer className="h-5 w-5" />
          <CardTitle>Sensor Information</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.temperature && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Temperature</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(data.temperature)}°C
              </span>
            </div>
            <Progress 
              value={Math.min((data.temperature / 100) * 100, 100)} 
              className="h-2"
            />
          </div>
        )}
        {data.fanSpeed && (
          <div>
            <p className="text-sm font-medium">Fan Speed</p>
            <p className="text-sm text-muted-foreground">{data.fanSpeed} RPM</p>
          </div>
        )}
        {data.voltage && (
          <div>
            <p className="text-sm font-medium">Voltage</p>
            <p className="text-sm text-muted-foreground">{data.voltage}V</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}