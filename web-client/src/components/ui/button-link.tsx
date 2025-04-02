import Link from "next/link";

import { Button } from "~/components/ui/button";

export function ButtonLink({
  buttonClassName,
  linkClassName,
  title,
  href,
}: {
  buttonClassName?: string;
  linkClassName?: string;
  title: string;
  href: string;
}) {
  return (
    <Link href={href} className={linkClassName}>
      <Button className={buttonClassName}>{title}</Button>
    </Link>
  );
}
