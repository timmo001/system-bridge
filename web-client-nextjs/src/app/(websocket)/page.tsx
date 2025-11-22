"use client";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";

import { ButtonLink } from "~/components/ui/button-link";
import { useSystemBridgeConnectionStore } from "~/components/hooks/use-system-bridge-connection";

export default function HomePage() {
  const [hostInput] = useQueryState("host", parseAsString);
  const [portInput] = useQueryState("port", parseAsInteger);
  const [apiKeyInput] = useQueryState("apiKey", parseAsString);

  const { host, port, token, ssl } = useSystemBridgeConnectionStore();

  return (
    <>
      <h1 className="text-2xl font-bold">Welcome to System Bridge</h1>

      <div className="grid w-full grid-cols-2 gap-3 sm:w-sm">
        <ButtonLink buttonClassName="w-full" title="Data" href="/data" />
        <ButtonLink
          buttonClassName="w-full"
          title="Settings"
          href="/settings"
        />
      </div>

      <div className="grid w-full grid-cols-1 gap-3 sm:w-sm">
        {hostInput && portInput && apiKeyInput ? (
          <></>
        ) : (
          <ButtonLink
            buttonClassName="w-full"
            title="Connection settings"
            href="/connection"
          />
        )}
        <p className="text-muted-foreground bg-muted rounded-md p-4 text-base">
          <span className="text-foreground mb-2 block text-lg font-bold">
            Your connection details
          </span>
          <br />
          <span className="text-foreground font-bold">Host:</span>
          <br />
          {host}
          <br />
          <br />
          <span className="text-foreground font-bold">Port:</span>
          <br />
          {port}
          <br />
          <br />
          <span className="text-foreground font-bold">API Key:</span>
          <br />
          {token}
          <br />
          <br />
          <span className="text-foreground font-bold">SSL:</span>
          <br />
          {ssl ? "Yes" : "No"}
        </p>
      </div>
    </>
  );
}
