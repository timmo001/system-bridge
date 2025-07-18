"use client";
import { Fragment, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

import { useSystemBridgeWS } from "~/components/hooks/use-system-bridge-ws";
import { useSystemBridgeConnectionStore } from "~/components/hooks/use-system-bridge-connection";
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
  type SettingsMediaDirectory,
} from "~/lib/system-bridge/types-settings";
import { generateUUID } from "~/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  ValidateDirectoryResponseSchema,
  type ValidateDirectoryResponse,
} from "~/lib/system-bridge/types-websocket";

export function Settings() {
  const { token } = useSystemBridgeConnectionStore();
  const { settings, sendRequestWithResponse } = useSystemBridgeWS();

  const form = useForm<Settings>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: settings ?? {
      autostart: false,
      hotkeys: [],
      logLevel: "info",
      media: {
        directories: [],
      },
    },
  });

  const validateDirectoryMutation = useMutation({
    mutationFn: async (path: string) => {
      const id = generateUUID();
      const response = await sendRequestWithResponse<ValidateDirectoryResponse>(
        {
          id,
          event: "VALIDATE_DIRECTORY",
          data: { path },
          token: token ?? "",
        },
        ValidateDirectoryResponseSchema,
      );
      return response;
    },
  });

  // Media settings state
  const [mediaInputValue, setMediaInputValue] = useState("");
  const [mediaError, setMediaError] = useState(""); // always a string

  async function handleAddDirectory(field: {
    value: SettingsMediaDirectory[];
    onChange: (val: SettingsMediaDirectory[]) => void;
  }) {
    setMediaError("");
    if (!mediaInputValue.trim()) return;
    try {
      const response = await validateDirectoryMutation.mutateAsync(
        mediaInputValue.trim(),
      );
      console.log("Mutation response:", response);
      if (response?.valid) {
        const newDir: SettingsMediaDirectory = {
          path: mediaInputValue.trim(),
          name: mediaInputValue.trim(),
        };
        field.onChange([...(field.value ?? []), newDir]);
        setMediaInputValue("");
      } else {
        setMediaError("Directory does not exist or is not accessible.");
      }
    } catch (error) {
      console.error("Failed to validate directory:", error);
      setMediaError("Failed to validate directory.");
    }
  }

  function handleRemoveDirectory(
    field: {
      value: SettingsMediaDirectory[];
      onChange: (val: SettingsMediaDirectory[]) => void;
    },
    dir: SettingsMediaDirectory,
  ) {
    field.onChange(
      (field.value ?? []).filter(
        (d: SettingsMediaDirectory) => d.path !== dir.path,
      ),
    );
  }

  async function onSubmit(data: Settings) {
    if (!token) {
      console.error("No token found");
      toast.error("No token found");
      return;
    }

    try {
      await sendRequestWithResponse<Settings>(
        {
          id: generateUUID(),
          event: "UPDATE_SETTINGS",
          data,
          token: token ?? "",
        },
        SettingsSchema,
      );
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

        {/* Media settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Media Settings</h2>
          <FormField
            control={form.control}
            name="media.directories"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Media Directories</FormLabel>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Input
                      value={mediaInputValue}
                      onChange={(e) => setMediaInputValue(e.target.value)}
                      placeholder="Enter directory path"
                      disabled={validateDirectoryMutation.isPending}
                    />
                    <Button
                      type="button"
                      onClick={() =>
                        handleAddDirectory(
                          field as {
                            value: SettingsMediaDirectory[];
                            onChange: (val: SettingsMediaDirectory[]) => void;
                          },
                        )
                      }
                      disabled={
                        validateDirectoryMutation.isPending ||
                        !mediaInputValue.trim()
                      }
                      variant="secondary"
                    >
                      {validateDirectoryMutation.isPending
                        ? "Validating..."
                        : "Add"}
                    </Button>
                  </div>
                  <FormDescription>
                    Add directories to be used for media scanning. Only existing
                    directories are allowed.
                  </FormDescription>
                  <FormMessage />
                  {mediaError && (
                    <FormDescription className="text-red-500">
                      {mediaError}
                    </FormDescription>
                  )}
                  <ul className="my-2 list-none space-y-2">
                    {(field.value ?? []).map(
                      (dir: SettingsMediaDirectory, index: number) => (
                        <Fragment key={index}>
                          <li key={index} className="flex items-center gap-2">
                            <span className="flex-1 break-all">{dir.path}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                handleRemoveDirectory(
                                  field as {
                                    value: SettingsMediaDirectory[];
                                    onChange: (
                                      val: SettingsMediaDirectory[],
                                    ) => void;
                                  },
                                  dir,
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </li>
                          {index < (field.value ?? []).length - 1 && (
                            <li key={index} className="bg-muted h-px w-full" />
                          )}
                        </Fragment>
                      ),
                    )}
                  </ul>
                </div>
              </FormItem>
            )}
          />
        </div>

        <Button disabled={!form.formState.isDirty} type="submit">
          Save Settings
        </Button>
      </form>
    </Form>
  );
}
