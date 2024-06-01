import { useEffect, useRef } from "react";

export function handleCopyToClipboard(value: string) {
  navigator.permissions
    .query({ name: "clipboard-write" as PermissionName })
    .then((result) => {
      if (result.state === "granted" || result.state === "prompt") {
        navigator.clipboard.writeText(value);
      }
    });
}

export function usePrevious(value: any): unknown {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
