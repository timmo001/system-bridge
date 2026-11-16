/**
 * The credentials CI deploys the docs with, as code: a Cloudflare token scoped
 * to what the docs stack touches, written into the repository's Actions
 * secrets. Deploy it once, and again to rotate: `mise run docs:deploy:github`.
 */
import * as Cloudflare from "@alchemy.run/cloudflare";
import * as GitHub from "@alchemy.run/github";
import * as Alchemy from "alchemy";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

const repository = { owner: "timmo001", repository: "system-bridge" };

export default Alchemy.Stack(
  "system-bridge-github",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), GitHub.providers()),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const { accountId } = yield* yield* Cloudflare.CloudflareEnvironment;
    const account = `com.cloudflare.api.account.${accountId}` as const;

    const token = yield* Cloudflare.ApiToken.AccountApiToken("DeployToken", {
      accountId,
      policies: [
        {
          effect: "allow",
          permissionGroups: [
            "Workers Scripts Write",
            "Account Settings Read",
            "Secrets Store Write",
          ],
          resources: { [account]: "*" },
        },
        {
          effect: "allow",
          permissionGroups: ["Zone Read", "DNS Write", "Workers Routes Write"],
          resources: {
            [account]: { "com.cloudflare.api.account.zone.*": "*" },
          },
        },
      ],
    });

    yield* GitHub.Secret("ApiTokenSecret", {
      ...repository,
      name: "CLOUDFLARE_API_TOKEN",
      value: token.value,
    });

    yield* GitHub.Secret("AccountIdSecret", {
      ...repository,
      name: "CLOUDFLARE_ACCOUNT_ID",
      value: Redacted.make(accountId),
    });
  }),
);
