import React, { ReactElement, useMemo } from "react";
import { ReactMarkdownProps } from "react-markdown/lib/ast-to-react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/cjs/styles/hljs";

function Code({
  className,
  children,
  inline,
}: JSX.IntrinsicElements["code"] &
  ReactMarkdownProps & {
    inline?: boolean;
  }): ReactElement {
  const language = useMemo<string>(
    () => className?.replace("language-", ""),
    []
  );
  // return !inline && language ? (
  return (
    <SyntaxHighlighter
      style={atomOneDark}
      customStyle={
        inline && !language ? { display: "inline", padding: "0.2em" } : {}
      }
      language={language || "text"}
      children={String(children).replace(/\n$/, "")}
    />
  );
  // ) : (
  //   <code {...props} className={className} children={children} />
  // );
}

export default Code;
