"use client";
import { Fragment, useState } from "react";
import { useForm, type SubmitHandler, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

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
import {
  SettingsScriptDefinitionSchema,
  type Settings,
  type SettingsScriptDefinition,
} from "~/lib/system-bridge/types-settings";
import { generateUUID } from "~/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export function ScriptManagement({
  form: parentForm,
  onSubmit,
}: {
  form: UseFormReturn<Settings>;
  onSubmit: SubmitHandler<Settings>;
}) {
  const { token } = useSystemBridgeConnectionStore();
  const scriptForm = useForm<SettingsScriptDefinition>({
    resolver: zodResolver(SettingsScriptDefinitionSchema),
    defaultValues: {
      id: "",
      name: "",
      command: "",
      workingDir: "",
      arguments: [],
    },
  });

  const [scriptError, setScriptError] = useState<string | null>(null);
  const [argumentsInput, setArgumentsInput] = useState<string>("");

  async function handleAddScript(data: SettingsScriptDefinition) {
    setScriptError(null);

    // Generate ID if not provided
    const scriptData: SettingsScriptDefinition = {
      ...data,
      id: data.id || generateUUID(),
      arguments: argumentsInput
        ? argumentsInput.split(",").map((arg) => arg.trim()).filter(Boolean)
        : [],
    };

    // Validate
    const isValid = await scriptForm.trigger();
    if (!isValid) {
      toast.error("Validation failed. Please check the form fields.");
      setScriptError("Validation failed. Please check the form fields.");
      return;
    }

    // Check for duplicate IDs
    const existingScripts = parentForm.getValues("scripts.allowlist") ?? [];
    if (existingScripts.some((s) => s.id === scriptData.id)) {
      setScriptError("A script with this ID already exists.");
      toast.error("A script with this ID already exists.");
      return;
    }

    try {
      const newScripts = [...existingScripts, scriptData];
      parentForm.setValue("scripts.allowlist", newScripts);
      const parentIsValid = await parentForm.trigger("scripts.allowlist");

      if (parentIsValid) {
        toast.success("Script added successfully");
        await onSubmit(parentForm.getValues());
        scriptForm.reset();
        setArgumentsInput("");
      } else {
        toast.error("Failed to add script");
        setScriptError("Failed to add script");
      }
    } catch (error) {
      console.error("Failed to add script:", error);
      setScriptError("Failed to add script.");
    }

    scriptForm.setFocus("name");
  }

  async function handleRemoveScript(script: SettingsScriptDefinition) {
    setScriptError(null);

    parentForm.setValue(
      "scripts.allowlist",
      (parentForm.getValues("scripts.allowlist") ?? []).filter(
        (s: SettingsScriptDefinition) => s.id !== script.id,
      ),
    );

    const parentIsValid = await parentForm.trigger("scripts.allowlist");
    if (parentIsValid) {
      toast.success("Script removed successfully");
      await onSubmit(parentForm.getValues());
    } else {
      toast.error("Failed to submit form due to validation errors");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Script Allowlist</CardTitle>
          <CardDescription>
            Manage scripts that are allowed to be executed. Scripts must be explicitly allowlisted for security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={parentForm.control}
            name="scripts.allowlist"
            render={({ field: scriptsField }) => (
              <FormItem>
                <Form {...scriptForm}>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={scriptForm.control}
                        name="id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ID</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="auto-generated if empty"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={scriptForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter script name"
                                required
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={scriptForm.control}
                      name="command"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Command</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter full path to executable"
                              required
                            />
                          </FormControl>
                          <FormDescription>
                            Full path to the script or executable (e.g., /usr/local/bin/backup.sh)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={scriptForm.control}
                      name="workingDir"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Working Directory</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter working directory"
                              required
                            />
                          </FormControl>
                          <FormDescription>
                            Directory to execute the script from (e.g., /home/user)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <FormLabel>Arguments</FormLabel>
                      <Input
                        value={argumentsInput}
                        onChange={(e) => setArgumentsInput(e.target.value)}
                        placeholder="Enter arguments separated by commas"
                      />
                      <FormDescription>
                        Comma-separated list of arguments (e.g., --verbose, --output, /tmp)
                      </FormDescription>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={() => handleAddScript(scriptForm.getValues())}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Script
                    </Button>
                  </div>
                </Form>

                {scriptError && (
                  <FormDescription className="text-red-500">
                    {scriptError}
                  </FormDescription>
                )}

                {(scriptsField.value ?? []).length === 0 ? (
                  <div className="text-muted-foreground mt-4 text-center text-sm">
                    No scripts in allowlist. Add a script above to get started.
                  </div>
                ) : (
                  <ul className="mt-4 list-none space-y-2">
                    {(scriptsField.value ?? []).map(
                      (script: SettingsScriptDefinition, index: number) => (
                        <Fragment key={script.id}>
                          <li className="border-muted flex flex-col gap-2 rounded-lg border p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{script.name}</span>
                                  <code className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">
                                    {script.id}
                                  </code>
                                </div>
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Command:</span>{" "}
                                  <code className="bg-muted rounded px-1 py-0.5 text-xs">
                                    {script.command}
                                  </code>
                                </div>
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Working Dir:</span>{" "}
                                  <code className="bg-muted rounded px-1 py-0.5 text-xs">
                                    {script.workingDir}
                                  </code>
                                </div>
                                {script.arguments.length > 0 && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Arguments:</span>{" "}
                                    <code className="bg-muted rounded px-1 py-0.5 text-xs">
                                      {script.arguments.join(", ")}
                                    </code>
                                  </div>
                                )}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveScript(script)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </li>
                          {index < (scriptsField.value ?? []).length - 1 && (
                            <li className="bg-muted h-px w-full" />
                          )}
                        </Fragment>
                      ),
                    )}
                  </ul>
                )}
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
