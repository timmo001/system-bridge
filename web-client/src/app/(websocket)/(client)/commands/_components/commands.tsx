"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { useSystemBridgeWS } from "~/components/hooks/use-system-bridge-ws";
import { useSystemBridgeConnectionStore } from "~/components/hooks/use-system-bridge-connection";
import { Form } from "~/components/ui/form";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { SettingsSchema, type Settings } from "~/lib/system-bridge/types-settings";
import { generateUUID } from "~/lib/utils";
import { CommandManagement } from "~/app/(websocket)/(client)/commands/_components/command-management";
import { CommandExecution } from "~/app/(websocket)/(client)/commands/_components/command-execution";

export function Commands() {
  const { token } = useSystemBridgeConnectionStore();
  const { settings, sendRequest } = useSystemBridgeWS();

  const form = useForm<Settings>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: {
      autostart: false,
      hotkeys: [],
      logLevel: "INFO",
      commands: {
        allowlist: [],
      },
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
      sendRequest({
        id: generateUUID(),
        event: "UPDATE_SETTINGS",
        data,
        token: token ?? "",
      });
      toast.success("Settings update requested!");
    } catch (error) {
      toast.error("Failed to update settings");
      console.error(error);
    }
  }

  useEffect(() => {
    if (!settings) return;

    console.log("Resetting form with settings:", settings);
    form.reset(settings, { keepDirty: false });
  }, [form, settings]);

  return (
    <Form {...form}>
      <form
        className="flex w-full flex-col gap-8"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Tabs defaultValue="manage" className="container">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manage">Manage</TabsTrigger>
            <TabsTrigger value="execute">Execute</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-4">
            <CommandManagement form={form} onSubmit={onSubmit} />

            <div className="flex justify-center">
              <Button disabled={!form.formState.isDirty} type="submit">
                Save Settings
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="execute" className="space-y-4">
            <CommandExecution />
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}
