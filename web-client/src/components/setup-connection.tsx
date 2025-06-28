"use client";
import { useRouter, usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

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
  host: z.string().min(1),
  port: z.coerce.number().min(1),
  ssl: z.boolean(),
  token: z.string().min(1),
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
      host,
      port,
      ssl,
      token: token ?? "",
    },
  });

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="host"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Host</FormLabel>
              <FormControl>
                <Input placeholder="0.0.0.0" {...field} />
              </FormControl>
              <FormDescription>
                The host of the System Bridge server.
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
              <FormLabel>Port</FormLabel>
              <FormControl>
                <Input placeholder="9170" {...field} />
              </FormControl>
              <FormDescription>
                The port of the System Bridge server.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ssl"
          render={({ field }) => (
            <FormItem className="flex w-full flex-row items-center justify-center gap-3 rounded-lg">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="w-full space-y-0.5">
                <FormLabel>SSL</FormLabel>
                <FormDescription>
                  Whether to use SSL to connect to the System Bridge server.
                  <br />
                  On a local network, you should keep this off.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="token"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Token</FormLabel>
              <FormControl>
                <Input placeholder="ab12-34cd-ef56-78gh-ij34" {...field} />
              </FormControl>
              <FormDescription>
                Your api token. This can be found in the logs or settings file.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Connect</Button>
      </form>
    </Form>
  );
}
