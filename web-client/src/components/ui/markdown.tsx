"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypePrism from "rehype-prism-plus";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "~/components/ui/code-block";
import { H1, H2, H3, H4, P } from "~/components/ui/typography";
import { Callout } from "~/components/ui/callout";

type CodeProps = {
  node?: unknown;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
};

type ReactElementWithChildren = {
  props: {
    children: React.ReactNode;
  };
};

function safeStringify(value: React.ReactNode): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(safeStringify).join("");
  if (value === null || value === undefined) return "";
  if (
    typeof value === "object" &&
    value !== null &&
    "props" in value &&
    typeof (value as ReactElementWithChildren).props === "object" &&
    (value as ReactElementWithChildren).props !== null &&
    "children" in (value as ReactElementWithChildren).props
  ) {
    return safeStringify((value as ReactElementWithChildren).props.children);
  }

  // Use JSON.stringify to avoid '[object Object]' default stringification
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

// Process alert syntax before rendering
function processAlerts(markdown: string): string {
  // Handle GitHub-style alerts - replace the alert syntax with custom Callout component HTML
  const githubAlertRegex =
    />(?: *)\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](.*?)(?:\n(?!>)|\n$|$)/gs;
  markdown = markdown.replace(
    githubAlertRegex,
    (match: string, type: string, content: string) => {
      const alertType = type.toLowerCase();
      const calloutType =
        alertType === "caution"
          ? "error"
          : alertType === "tip"
            ? "success"
            : alertType === "note" || alertType === "important"
              ? "info"
              : "warning";

      // Clean up the content by removing leading ">" characters from each line
      const cleanContent = content
        .split("\n")
        .map((line) => line.replace(/^>\s*/, "").trim())
        .join("\n");

      // Convert the content to JSX-friendly format for the Callout component
      // We'll use a custom data attribute to mark this for post-processing
      return `<div data-callout-type="${calloutType}">${cleanContent}</div>`;
    },
  );

  // Handle bracket-style alerts [NOTE], [TIP], etc.
  const bracketAlertRegex =
    /^(?:>|\s*>) *\[(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](.*?)$/gm;
  markdown = markdown.replace(
    bracketAlertRegex,
    (match: string, type: string, content: string) => {
      const alertType = type.toLowerCase();
      const calloutType =
        alertType === "caution"
          ? "error"
          : alertType === "tip"
            ? "success"
            : alertType === "note" || alertType === "important"
              ? "info"
              : "warning";

      // Clean up the content by removing any ">" prefix
      const cleanContent = content.replace(/^>\s*/, "").trim();

      // Convert the content to JSX-friendly format for the Callout component
      // We'll use a custom data attribute to mark this for post-processing
      return `<div data-callout-type="${calloutType}">${cleanContent}</div>`;
    },
  );

  return markdown;
}

export function Markdown({ children }: { children: string }) {
  const [mounted, setMounted] = useState(false);
  // Process the markdown to handle alerts
  const processedMarkdown = processAlerts(children);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and initial client render, show a simplified version
  if (!mounted) {
    return (
      <div className="prose prose-sm dark:prose-invert prose-hr:my-6 prose-hr:border-t prose-hr:border-border max-h-full max-w-none">
        <div className="font-mono text-sm whitespace-pre-wrap">{children}</div>
      </div>
    );
  }

  // After mounting, show the full markdown with syntax highlighting
  return (
    <div className="prose prose-sm dark:prose-invert prose-hr:my-6 prose-hr:border-t prose-hr:border-border prose-p:text-gray-700 dark:prose-p:text-gray-300 max-h-full max-w-none">
      <ReactMarkdown
        components={{
          // Process custom callout divs and convert them to Callout components
          div: ({
            children,
            "data-callout-type": calloutType,
            ...props
          }: React.HTMLAttributes<HTMLDivElement> & {
            "data-callout-type"?: string;
          }) => {
            if (calloutType) {
              return (
                <Callout
                  type={calloutType as "info" | "warning" | "success" | "error"}
                >
                  {children}
                </Callout>
              );
            }
            return <div {...props}>{children}</div>;
          },
          code({
            node: _node,
            inline,
            className,
            children,
            ...props
          }: CodeProps) {
            const match = /language-(\w+)/.exec(className ?? "");
            const language = match ? match[1] : undefined;
            const content = children ? safeStringify(children) : "";
            return !inline && match ? (
              <CodeBlock language={language} className={className} {...props}>
                {content}
              </CodeBlock>
            ) : (
              <code className={className} {...props}>
                {content}
              </code>
            );
          },
          h1: ({ children, ...props }) => (
            <H1 withBorder {...props}>
              {children}
            </H1>
          ),
          h2: ({ children, ...props }) => (
            <H2 withBorder {...props}>
              {children}
            </H2>
          ),
          h3: ({ children, ...props }) => <H3 {...props}>{children}</H3>,
          h4: ({ children, ...props }) => <H4 {...props}>{children}</H4>,
          hr: () => <hr className="border-border my-6 border-t" />,
          p: ({ children, ...props }) => <P {...props}>{children}</P>,
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-border bg-muted/50 text-muted-foreground my-4 border-l-4 pl-6 italic"
              {...props}
            >
              {children}
            </blockquote>
          ),
        }}
        rehypePlugins={[
          rehypeRaw,
          rehypeSlug,
          [rehypePrism, { ignoreMissing: true }],
        ]}
        remarkPlugins={[remarkGfm]}
      >
        {processedMarkdown}
      </ReactMarkdown>
    </div>
  );
}
