"use client";

import { useState } from "react";
import { useFieldArray, type Control } from "react-hook-form";
import { Trash2, Plus, Edit2, Save, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import {
  type Settings,
  type SettingsCommand,
} from "~/lib/system-bridge/types-settings";

interface CommandSettingsProps {
  control: Control<Settings>;
}

export function CommandSettings({ control }: CommandSettingsProps) {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "commands.commands",
  });

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingCommand, setEditingCommand] = useState<SettingsCommand | null>(
    null,
  );

  const handleAddCommand = () => {
    const newCommand: SettingsCommand = {
      name: "",
      description: "",
      command: "",
      args: [],
      enabled: true,
    };
    append(newCommand);
    setEditingIndex(fields.length);
    setEditingCommand(newCommand);
  };

  const handleEditCommand = (index: number) => {
    setEditingIndex(index);
    setEditingCommand(fields[index] as SettingsCommand);
  };

  const handleSaveCommand = () => {
    if (editingIndex !== null && editingCommand) {
      update(editingIndex, editingCommand);
      setEditingIndex(null);
      setEditingCommand(null);
    }
  };

  const handleCancelEdit = () => {
    if (editingIndex === fields.length - 1 && !editingCommand?.name) {
      // If it's a new command that was just added and has no name, remove it
      remove(editingIndex);
    }
    setEditingIndex(null);
    setEditingCommand(null);
  };

  const handleDeleteCommand = (index: number) => {
    remove(index);
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingCommand(null);
    }
  };

  const handleArgChange = (argIndex: number, value: string) => {
    if (editingCommand) {
      const newArgs = [...editingCommand.args];
      newArgs[argIndex] = value;
      setEditingCommand({ ...editingCommand, args: newArgs });
    }
  };

  const handleAddArg = () => {
    if (editingCommand) {
      setEditingCommand({
        ...editingCommand,
        args: [...editingCommand.args, ""],
      });
    }
  };

  const handleRemoveArg = (argIndex: number) => {
    if (editingCommand) {
      const newArgs = editingCommand.args.filter((_, i) => i !== argIndex);
      setEditingCommand({ ...editingCommand, args: newArgs });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Allowed Commands</h3>
          <p className="text-muted-foreground text-sm">
            Configure commands that can be executed through System Bridge
          </p>
        </div>
        <Button onClick={handleAddCommand} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Command
        </Button>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-lg border p-4">
            {editingIndex === index ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={editingCommand?.name ?? ""}
                      onChange={(e) =>
                        setEditingCommand({
                          ...editingCommand!,
                          name: e.target.value,
                        })
                      }
                      placeholder="turn-off-monitors"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Command</label>
                    <Input
                      value={editingCommand?.command ?? ""}
                      onChange={(e) =>
                        setEditingCommand({
                          ...editingCommand!,
                          command: e.target.value,
                        })
                      }
                      placeholder="kscreen-doctor --dpms off"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={editingCommand?.description ?? ""}
                    onChange={(e) =>
                      setEditingCommand({
                        ...editingCommand!,
                        description: e.target.value,
                      })
                    }
                    placeholder="Brief description of what this command does"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium">Arguments</label>
                    <Button onClick={handleAddArg} size="sm" variant="outline">
                      <Plus className="mr-1 h-3 w-3" />
                      Add Argument
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {editingCommand?.args.map((arg, argIndex) => (
                      <div key={argIndex} className="flex gap-2">
                        <Input
                          value={arg}
                          onChange={(e) =>
                            handleArgChange(argIndex, e.target.value)
                          }
                          placeholder={`Argument ${argIndex + 1}`}
                        />
                        <Button
                          onClick={() => handleRemoveArg(argIndex)}
                          size="sm"
                          variant="outline"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingCommand?.enabled ?? false}
                    onCheckedChange={(checked) =>
                      setEditingCommand({
                        ...editingCommand!,
                        enabled: checked,
                      })
                    }
                  />
                  <label className="text-sm font-medium">Enabled</label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveCommand} size="sm">
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    size="sm"
                    variant="outline"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h4 className="font-medium">
                      {field.name || "Unnamed Command"}
                    </h4>
                    <Switch
                      checked={field.enabled}
                      onCheckedChange={(checked) => {
                        const currentField = fields[index] as SettingsCommand;
                        update(index, { ...currentField, enabled: checked });
                      }}
                    />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {field.description || "No description"}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Command: {field.command} {field.args.join(" ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEditCommand(index)}
                    size="sm"
                    variant="outline"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteCommand(index)}
                    size="sm"
                    variant="outline"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {fields.length === 0 && (
          <div className="text-muted-foreground py-8 text-center">
            <p>No commands configured yet.</p>
            <p className="text-sm">Add your first command to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
