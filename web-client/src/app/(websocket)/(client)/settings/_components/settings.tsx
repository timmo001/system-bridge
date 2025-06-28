"use client";
import { useEffect } from "react";
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
import { useSystemBridgeConnectionStore } from "~/components/hooks/use-system-bridge-connection";

export function Settings() {
  const { token } = useSystemBridgeConnectionStore();
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
    if (!token) {
      console.error("No token found");
      toast.error("No token found");
      return;
    }

    try {
      sendRequest({
        id: generateUUID(),
        event: "UPDATE_SETTINGS",
        data,
        token,
      });
      toast.success("Settings updated successfully!");
    } catch (error) {
      toast.error("Failed to update settings");
      console.error(error);
    }
  }

  useEffect(() => {
    if (!settings) return;

    form.reset(settings);
  }, [form, settings]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">General Settings</h2>
          <FormField
            control={form.control}
            name="autostart"
            render={({ field }) => (
              <FormItem className="flex w-full flex-row items-center justify-center gap-3 rounded-lg">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="w-full space-y-0.5">
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
              <FormItem className="flex w-full flex-row items-center justify-center gap-3 rounded-lg">
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-[120px] max-w-[120px] min-w-[120px]">
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
                <div className="w-full space-y-0.5">
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

        {/* TODO: Media settings */}

        <Button disabled={!form.formState.isDirty} type="submit">
          Save Settings
        </Button>
      </form>
    </Form>
  );
}
