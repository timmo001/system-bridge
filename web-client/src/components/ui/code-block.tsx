import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function CodeBlock({
  children,
  className,
  language,
}: {
  children: string;
  className?: string;
  language?: string;
}) {
  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(children);
    toast.success("Code copied to clipboard");
  };

  return (
    <div className="group bg-muted/50 relative my-4 overflow-hidden rounded-lg border">
      <div
        className="flex items-center justify-between border-b px-4 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-muted-foreground font-mono text-sm">
            {language ?? "plaintext"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={copyToClipboard}
          >
            <CopyIcon className="size-4" />
          </Button>
        </div>
      </div>
      <div className="relative">
        <div className={cn("overflow-hidden transition-all duration-200")}>
          <pre className="!m-0 !bg-transparent">
            <code
              className={cn(
                "block p-4 font-mono break-words whitespace-pre-wrap",
                className,
              )}
            >
              {children}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
