"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { useSystemBridgeWS } from "~/components/hooks/use-system-bridge-ws";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import {
  SettingsSchema,
  type Settings,
} from "~/lib/system-bridge/types-settings";
import { generateUUID } from "~/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function Settings() {
  const { settings, sendRequest } = useSystemBridgeWS();

  const form = useForm<Settings>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: settings ?? {
      api: {
        token: "",
        port: 9170,
      },
      autostart: false,
      hotkeys: [],
      logLevel: "info",
      media: {
        directories: [],
      },
    },
  });

  function onSubmit(data: Settings) {
    try {
      sendRequest({
        id: generateUUID(),
        event: "UPDATE_SETTINGS",
        data,
        token: data.api.token,
      });
      toast.success("Settings updated successfully!");
    } catch (error) {
      toast.error("Failed to update settings");
      console.error(error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">API Settings</h2>
          <FormField
            disabled
            control={form.control}
            name="api.token"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API Token</FormLabel>
                <FormControl>
                  <Input placeholder="Enter API token" {...field} />
                </FormControl>
                <FormDescription>
                  The token used to authenticate with the API
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="api.port"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API Port</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="9170"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  The port that the API server runs on
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">General Settings</h2>
          <FormField
            control={form.control}
            name="autostart"
            render={({ field }) => (
              <FormItem className="grid w-full grid-cols-6 items-center justify-center gap-3 rounded-lg">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="col-span-5 w-full space-y-0.5">
                  <FormLabel>Autostart</FormLabel>
                  <FormDescription>
                    Start System Bridge automatically on system startup
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logLevel"
            render={({ field }) => (
              <FormItem className="grid w-full grid-cols-6 items-center justify-center gap-3 rounded-lg">
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select log level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warn">Warn</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="debug">Debug</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <div className="col-span-5 w-full space-y-0.5">
                  <FormLabel>Log Level</FormLabel>
                  <FormDescription>
                    The level of logging to use (error, warn, info, debug)
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit">Save Settings</Button>
      </form>
    </Form>
  );
}
