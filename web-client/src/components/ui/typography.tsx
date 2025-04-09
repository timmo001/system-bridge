import { cn } from "~/lib/utils";

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
  withBorder?: boolean;
};

export function H1({ className, withBorder, ...props }: HeadingProps) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-4xl font-bold tracking-tight lg:text-5xl",
        withBorder && "border-border border-b pb-2",
        className,
      )}
      {...props}
    />
  );
}

export function H2({ className, withBorder, ...props }: HeadingProps) {
  return (
    <h2
      className={cn(
        "scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0",
        withBorder && "border-border border-b pb-2",
        className,
      )}
      {...props}
    />
  );
}

export function H3({ className, withBorder, ...props }: HeadingProps) {
  return (
    <h3
      className={cn(
        "mt-4 scroll-m-20 text-2xl font-semibold tracking-tight",
        withBorder && "border-border border-b pb-2",
        className,
      )}
      {...props}
    />
  );
}

export function H4({ className, withBorder, ...props }: HeadingProps) {
  return (
    <h4
      className={cn(
        "mt-4 scroll-m-20 text-xl font-semibold tracking-tight",
        withBorder && "border-border border-b pb-2",
        className,
      )}
      {...props}
    />
  );
}

type ParagraphProps = React.HTMLAttributes<HTMLParagraphElement>;

export function P({ className, ...props }: ParagraphProps) {
  return (
    <p
      className={cn(
        "leading-7 last:mb-0 [&:not(:first-child)]:mt-6",
        className,
      )}
      {...props}
    />
  );
}
