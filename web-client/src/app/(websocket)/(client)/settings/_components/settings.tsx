"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  useForm,
  type SubmitHandler,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";
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
  SettingsMediaDirectorySchema,
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
      <form
        className="flex flex-col items-center gap-8"
        onSubmit={form.handleSubmit(onSubmit)}
      >
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
                  <FormMessage />
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
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>

        <MediaDirectoryForm form={form} onSubmit={onSubmit} />

        <Button disabled={!form.formState.isDirty}>Save Settings</Button>
      </form>
    </Form>
  );
}

function MediaDirectoryForm({
  form: parentForm,
  onSubmit,
}: {
  form: UseFormReturn<Settings>;
  onSubmit: SubmitHandler<Settings>;
}) {
  const { token } = useSystemBridgeConnectionStore();
  const { sendRequestWithResponse } = useSystemBridgeWS();

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

  const mediaDirectoryForm = useForm<SettingsMediaDirectory>({
    resolver: zodResolver(SettingsMediaDirectorySchema),
    defaultValues: {
      name: "",
      path: "",
    },
  });
  const [mediaError, setMediaError] = useState<string | null>(null);

  async function handleAddDirectory(data: SettingsMediaDirectory) {
    setMediaError(null);
    const isValid = await mediaDirectoryForm.trigger();
    console.log("Media directory form is valid:", isValid);
    if (!isValid) return;
    try {
      const response = await validateDirectoryMutation.mutateAsync(
        mediaDirectoryForm.getValues("path"),
      );
      if (response?.valid) {
        const newDirectories = [
          ...(parentForm.getValues("media.directories") ?? []),
          data,
        ];
        console.log("New directories:", newDirectories);
        parentForm.setValue("media.directories", newDirectories);
        const parentIsValid = await parentForm.trigger("media.directories");
        console.log("Parent form is valid:", parentIsValid);
        if (parentIsValid) {
          toast.success("Directory added successfully");
          await parentForm.handleSubmit(onSubmit)();
        } else {
          toast.error("Failed to add directory");
          setMediaError("Failed to add directory");
        }
        mediaDirectoryForm.reset();
      } else {
        setMediaError("Directory does not exist or is not accessible.");
      }
    } catch (error) {
      console.error("Failed to validate directory:", error);
      setMediaError("Failed to validate directory.");
    }
    mediaDirectoryForm.setFocus("name");
  }

  async function handleRemoveDirectory(dir: SettingsMediaDirectory) {
    setMediaError(null);
    parentForm.setValue(
      "media.directories",
      (parentForm.getValues("media.directories") ?? []).filter(
        (d: SettingsMediaDirectory) => d.path !== dir.path,
      ),
    );
    const parentIsValid = await parentForm.trigger("media.directories");
    console.log("Parent form is valid:", parentIsValid);
    if (parentIsValid) {
      toast.success("Directory removed successfully");
      await parentForm.handleSubmit(onSubmit)();
    } else {
      toast.error("Failed to remove directory");
      setMediaError("Failed to remove directory");
    }
    mediaDirectoryForm.setFocus("name");
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Media Settings</h2>
      <FormField
        control={parentForm.control}
        name="media.directories"
        render={({ field: directoriesField }) => (
          <FormItem>
            <FormLabel>Media Directories</FormLabel>
            <Form {...mediaDirectoryForm}>
              <div className="flex flex-row gap-2">
                <FormField
                  control={mediaDirectoryForm.control}
                  name="name"
                  render={({ field: directoryField }) => (
                    <Input
                      {...directoryField}
                      placeholder="Enter directory name"
                      disabled={validateDirectoryMutation.isPending}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void mediaDirectoryForm.setFocus("path");
                        }
                      }}
                    />
                  )}
                />
                <FormField
                  control={mediaDirectoryForm.control}
                  name="path"
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Enter directory path"
                      disabled={validateDirectoryMutation.isPending}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void handleAddDirectory(
                            mediaDirectoryForm.getValues(),
                          );
                        }
                      }}
                    />
                  )}
                />

                <Button
                  type="button"
                  disabled={
                    validateDirectoryMutation.isPending ||
                    !mediaDirectoryForm.formState.isValid
                  }
                  variant="secondary"
                  onClick={() =>
                    handleAddDirectory(mediaDirectoryForm.getValues())
                  }
                >
                  {validateDirectoryMutation.isPending
                    ? "Validating..."
                    : "Add"}
                </Button>
              </div>
              <FormMessage />
            </Form>

            <FormDescription>
              Add directories to be used for media scanning. Only existing
              directories are allowed.
            </FormDescription>
            {mediaError && (
              <FormDescription className="text-red-500">
                {mediaError}
              </FormDescription>
            )}
            <ul className="my-2 list-none space-y-2">
              {(directoriesField.value ?? []).map(
                (dir: SettingsMediaDirectory, index: number) => (
                  <Fragment key={dir.path}>
                    <li className="flex items-center gap-2">
                      <span className="flex-1 break-all">{dir.name}</span>
                      <span className="text-muted-foreground flex-1 text-sm font-light break-all">
                        {dir.path}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveDirectory(dir)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                    {index < (directoriesField.value ?? []).length - 1 && (
                      <li className="bg-muted h-px w-full" />
                    )}
                  </Fragment>
                ),
              )}
            </ul>
          </FormItem>
        )}
      />
    </div>
  );
}
