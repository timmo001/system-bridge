import { ButtonLink } from "~/components/ui/button-link";

export default async function HomePage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Home</h1>

      <div className="grid w-full grid-cols-2 gap-3 sm:w-sm">
        <ButtonLink buttonClassName="w-full" title="Data" href="/data" />
        <ButtonLink
          buttonClassName="w-full"
          title="Settings"
          href="/settings"
        />
      </div>

      <div className="grid w-full grid-cols-1 gap-3 sm:w-sm">
        <ButtonLink
          buttonClassName="w-full"
          title="Connection settings"
          href="/connection"
        />
      </div>
    </>
  );
}
