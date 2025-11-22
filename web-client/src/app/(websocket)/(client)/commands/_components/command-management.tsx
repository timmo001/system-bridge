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
  SettingsCommandDefinitionSchema,
  type Settings,
  type SettingsCommandDefinition,
} from "~/lib/system-bridge/types-settings";
import { generateUUID } from "~/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export function CommandManagement({
  form: parentForm,
  onSubmit,
}: {
  form: UseFormReturn<Settings>;
  onSubmit: SubmitHandler<Settings>;
}) {
  const { token } = useSystemBridgeConnectionStore();
  const commandForm = useForm<SettingsCommandDefinition>({
    resolver: zodResolver(SettingsCommandDefinitionSchema),
    defaultValues: {
      id: "",
      name: "",
      command: "",
      workingDir: "",
      arguments: [],
    },
  });

  const [commandError, setCommandError] = useState<string | null>(null);
  const [argumentsInput, setArgumentsInput] = useState<string>("");

  async function handleAddCommand(data: SettingsCommandDefinition) {
    setCommandError(null);

    // Generate ID if not provided
    const commandData: SettingsCommandDefinition = {
      ...data,
      id: data.id || generateUUID(),
      arguments: argumentsInput
        ? argumentsInput.split(",").map((arg) => arg.trim()).filter(Boolean)
        : [],
    };

    // Validate
    const isValid = await commandForm.trigger();
    if (!isValid) {
      toast.error("Validation failed. Please check the form fields.");
      setCommandError("Validation failed. Please check the form fields.");
      return;
    }

    // Check for duplicate IDs
    const existingCommands = parentForm.getValues("commands.allowlist") ?? [];
    if (existingCommands.some((s) => s.id === commandData.id)) {
      setCommandError("A command with this ID already exists.");
      toast.error("A command with this ID already exists.");
      return;
    }

    try {
      const newCommands = [...existingCommands, commandData];
      parentForm.setValue("commands.allowlist", newCommands);
      const parentIsValid = await parentForm.trigger("commands.allowlist");

      if (parentIsValid) {
        toast.success("Command added successfully");
        await onSubmit(parentForm.getValues());
        commandForm.reset();
        setArgumentsInput("");
      } else {
        toast.error("Failed to add command");
        setCommandError("Failed to add command");
      }
    } catch (error) {
      console.error("Failed to add command:", error);
      setCommandError("Failed to add command.");
    }

    commandForm.setFocus("name");
  }

  async function handleRemoveCommand(command: SettingsCommandDefinition) {
    setCommandError(null);

    parentForm.setValue(
      "commands.allowlist",
      (parentForm.getValues("commands.allowlist") ?? []).filter(
        (s: SettingsCommandDefinition) => s.id !== command.id,
      ),
    );

    const parentIsValid = await parentForm.trigger("commands.allowlist");
    if (parentIsValid) {
      toast.success("Command removed successfully");
      await onSubmit(parentForm.getValues());
    } else {
      toast.error("Failed to submit form due to validation errors");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Command Allowlist</CardTitle>
          <CardDescription>
            Manage commands that are allowed to be executed. Commands must be explicitly allowlisted for security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={parentForm.control}
            name="commands.allowlist"
            render={({ field: commandsField }) => (
              <FormItem>
                <Form {...commandForm}>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={commandForm.control}
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
                        control={commandForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter command name"
                                required
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={commandForm.control}
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
                            Full path to the command or executable (e.g., /usr/local/bin/backup.sh)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={commandForm.control}
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
                            Directory to execute the command from (e.g., /home/user)
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
                      onClick={() => handleAddCommand(commandForm.getValues())}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Command
                    </Button>
                  </div>
                </Form>

                {commandError && (
                  <FormDescription className="text-red-500">
                    {commandError}
                  </FormDescription>
                )}

                {(commandsField.value ?? []).length === 0 ? (
                  <div className="text-muted-foreground mt-4 text-center text-sm">
                    No commands in allowlist. Add a command above to get started.
                  </div>
                ) : (
                  <ul className="mt-4 list-none space-y-2">
                    {(commandsField.value ?? []).map(
                      (command: SettingsCommandDefinition, index: number) => (
                        <Fragment key={command.id}>
                          <li className="border-muted flex flex-col gap-2 rounded-lg border p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{command.name}</span>
                                  <code className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">
                                    {command.id}
                                  </code>
                                </div>
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Command:</span>{" "}
                                  <code className="bg-muted rounded px-1 py-0.5 text-xs">
                                    {command.command}
                                  </code>
                                </div>
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Working Dir:</span>{" "}
                                  <code className="bg-muted rounded px-1 py-0.5 text-xs">
                                    {command.workingDir}
                                  </code>
                                </div>
                                {command.arguments.length > 0 && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Arguments:</span>{" "}
                                    <code className="bg-muted rounded px-1 py-0.5 text-xs">
                                      {command.arguments.join(", ")}
                                    </code>
                                  </div>
                                )}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveCommand(command)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </li>
                          {index < (commandsField.value ?? []).length - 1 && (
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
