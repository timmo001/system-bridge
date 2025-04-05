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
    setHost(data.host);
    setPort(data.port);
    setSsl(data.ssl);
    setToken(data.token);

    const ws = new WebSocket(
      `${data.ssl ? "wss" : "ws"}://${data.host}:${data.port}/api/websocket`,
    );

    ws.onopen = () => {
      console.log("WebSocket connected");
      toast.success("Connected to System Bridge!");

      if (pathname === "/connection") {
        router.push("/");
      }
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
                <Input placeholder="localhost" {...field} />
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
