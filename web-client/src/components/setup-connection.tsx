"use client";
import { useRouter, usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { 
  Monitor, 
  Hash, 
  Shield, 
  Key, 
  Wifi,
  Loader2
} from "lucide-react";

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

const ConnectionSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.coerce.number().min(1, "Port must be a positive number").max(65535, "Port must be less than 65536"),
  ssl: z.boolean(),
  token: z.string().min(1, "API token is required"),
});

type Connection = z.infer<typeof ConnectionSchema>;

export function SetupConnection() {
  const router = useRouter();
  const pathname = usePathname();

  const { host, port, ssl, token, setHost, setPort, setSsl, setToken } =
    useSystemBridgeConnectionStore();

  const form = useForm<Connection>({
    resolver: zodResolver(ConnectionSchema),
    defaultValues: {
      host: host || "localhost",
      port: port || 9170,
      ssl: ssl || false,
      token: token || "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  function onSubmit(data: Connection) {
    const ws = new WebSocket(
      `${data.ssl ? "wss" : "ws"}://${data.host}:${data.port}/api/websocket`,
    );

    // Set connection timeout
    const timeout = setTimeout(() => {
      ws.close();
      toast.error(
        "Connection timeout. Please check your host, port, and network connection.",
      );
    }, 10000);

    ws.onopen = () => {
      console.log("WebSocket connected");
      clearTimeout(timeout);

      // Test token by sending an auth request
      ws.send(
        JSON.stringify({
          id: "test-connection",
          event: "GET_SETTINGS",
          token: data.token,
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as {
          type?: string;
          subtype?: string;
          id?: string;
        };

        if (message.type === "ERROR" && message.subtype === "BAD_TOKEN") {
          toast.error(
            "Invalid API token. Please check your token and try again.",
          );
          ws.close();
          return;
        }

        if (
          message.type === "SETTINGS_RESULT" ||
          message.id === "test-connection"
        ) {
          // Token is valid, save connection settings
          setHost(data.host);
          setPort(data.port);
          setSsl(data.ssl);
          setToken(data.token);

          toast.success("Connected to System Bridge!");
          ws.close();

          if (pathname === "/connection") {
            router.push("/");
          }
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
        toast.error("Received invalid response from server.");
      }
    };

    ws.onclose = (event) => {
      clearTimeout(timeout);
      if (event.code === 1006) {
        toast.error(
          "Connection failed. Please check your host and port settings.",
        );
      } else if (event.code === 1002) {
        toast.error("Connection failed due to protocol error.");
      } else if (event.code === 1003) {
        toast.error("Connection rejected by server. Please check your token.");
      } else if (event.code !== 1000 && event.code !== 1001) {
        toast.error(
          `Connection failed with code ${event.code}: ${event.reason ?? "Unknown reason"}`,
        );
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      toast.error(
        "Connection failed. Please check your host, port, and network connection.",
      );
    };
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="host"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <FormLabel>Host</FormLabel>
                </div>
                <FormControl>
                  <Input placeholder="localhost or 192.168.1.100" {...field} />
                </FormControl>
                <FormDescription>
                  The hostname or IP address of your System Bridge server
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="port"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <FormLabel>Port</FormLabel>
                </div>
                <FormControl>
                  <Input type="number" placeholder="9170" {...field} />
                </FormControl>
                <FormDescription>
                  The port number (default: 9170)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="ssl"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <FormLabel className="text-base">Enable SSL</FormLabel>
                  </div>
                  <FormDescription>
                    Use secure connection (HTTPS/WSS). Keep disabled for local networks.
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
          name="token"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <FormLabel>API Token</FormLabel>
              </div>
              <FormControl>
                <Input 
                  type="password"
                  placeholder="ab12-34cd-ef56-78gh-ij34" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Your API token from System Bridge logs or settings file
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4" />
              Connect to System Bridge
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
