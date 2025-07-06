"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { 
  Settings as SettingsIcon, 
  Play, 
  FileText, 
  Folder,
  Save,
  RotateCcw 
} from "lucide-react";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
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

  function onReset() {
    if (settings) {
      form.reset(settings);
      toast.info("Settings reset to last saved values");
    }
  }

  useEffect(() => {
    if (!settings) return;

    form.reset(settings);
  }, [form, settings]);

  const isDirty = form.formState.isDirty;

  return (
    <div className="container max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <SettingsIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure System Bridge preferences and behavior
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* General Settings Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                <CardTitle>General Settings</CardTitle>
              </div>
              <CardDescription>
                Basic configuration options for System Bridge
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="autostart"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Play className="h-4 w-4 text-muted-foreground" />
                          <FormLabel className="text-base">Autostart</FormLabel>
                        </div>
                        <FormDescription>
                          Automatically start System Bridge when your system boots up
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logLevel"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <FormLabel className="text-base">Log Level</FormLabel>
                      </div>
                      <FormDescription>
                        Control the verbosity of System Bridge logging
                      </FormDescription>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full max-w-xs">
                            <SelectValue placeholder="Select log level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="error">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                Error - Only show errors
                              </div>
                            </SelectItem>
                            <SelectItem value="warn">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                Warn - Show errors and warnings
                              </div>
                            </SelectItem>
                            <SelectItem value="info">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                Info - Show general information
                              </div>
                            </SelectItem>
                            <SelectItem value="debug">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gray-500" />
                                Debug - Show all messages
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Media Settings Card (Placeholder for future features) */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5" />
                <CardTitle>Media Settings</CardTitle>
              </div>
              <CardDescription>
                Configure media directories and preferences (Coming Soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Media settings will be available in a future update</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              disabled={!isDirty}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Changes
            </Button>
            
            <Button 
              type="submit" 
              disabled={!isDirty}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </div>

          {isDirty && (
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <strong>Unsaved Changes:</strong> You have unsaved changes. Don't forget to save your settings.
              </p>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
