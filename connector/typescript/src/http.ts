import {
  Context,
  Duration,
  Effect,
  Layer,
  Match,
  Predicate,
  Redacted,
  Schema,
} from "effect";
import {
  FetchHttpClient,
  type HttpClientError,
  type HttpClientResponse,
  HttpIncomingMessage,
} from "effect/http";
import {
  HttpApi,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
} from "effect/http-api";
import { httpUrl, type ConnectionOptions } from "./connection.js";
import {
  AuthenticationError,
  BadRequestError,
  ConnectionError,
  DataMissingError,
  DecodeError,
  NotFoundError,
  RequestTimeoutError,
} from "./errors.js";
import {
  type ModuleData,
  ModuleDataSchemas,
  ModuleName,
} from "./generated/modules.js";
import { ErrorBody, Health, KeyClient as Client, NewKey } from "./protocol.js";

export class SystemBridgeApi extends HttpApi.make("system-bridge")
  .add(
    HttpApiGroup.make("system").add(
      HttpApiEndpoint.get("health", "/api/health", { success: Health }),
    ),
  )
  .add(
    HttpApiGroup.make("data").add(
      HttpApiEndpoint.get("module", "/api/data/:module", {
        params: { module: ModuleName },
        headers: { authorization: Schema.String },
        success: Schema.Json,
      }),
    ),
  )
  .add(
    HttpApiGroup.make("keys").add(
      HttpApiEndpoint.post("exchange", "/api/keys/exchange", {
        headers: { authorization: Schema.String },
        payload: Schema.Struct({ client: Client }),
        success: NewKey,
      }),
    ),
  ) {}

export type HttpError =
  | ConnectionError
  | AuthenticationError
  | BadRequestError
  | NotFoundError
  | RequestTimeoutError
  | DecodeError;

export interface HttpOptions extends ConnectionOptions {
  /** Per-request timeout. Defaults to 20 seconds. */
  readonly timeout?: Duration.Input;
}

export interface Interface {
  /** Backend status, timestamp and version. Needs no key. */
  readonly health: Effect.Effect<Health, HttpError>;
  /** The latest data for one module. */
  readonly getModuleData: <M extends ModuleName>(
    module: M,
  ) => Effect.Effect<ModuleData[M], HttpError | DataMissingError>;
  /**
   * Trades the old shared token (the connection's `token`) for this client's
   * own key. Use the key as the `token` from then on.
   */
  readonly exchangeKey: (client: Client) => Effect.Effect<NewKey, HttpError>;
}

const fromResponse = Effect.fnUntraced(function* (
  response: HttpClientResponse.HttpClientResponse,
  cause: HttpClientError.HttpClientError,
) {
  if (response.status >= 200 && response.status < 300) {
    return yield* new DecodeError({
      message: `Unexpected response body (HTTP ${response.status})`,
      cause,
    });
  }

  const message = yield* HttpIncomingMessage.schemaBodyJson(ErrorBody)(
    response,
  ).pipe(
    Effect.map((body) => body.error),
    Effect.orElseSucceed(() => `HTTP ${response.status}`),
  );

  return yield* Match.value(response.status).pipe(
    Match.when(400, (status) => new BadRequestError({ message, status })),
    Match.whenOr(401, 403, () => new AuthenticationError({ message })),
    Match.when(404, () => new NotFoundError({ message })),
    Match.orElse(
      (status) =>
        new ConnectionError({ message: `${message} (HTTP ${status})`, cause }),
    ),
  );
});

const fromClientError = (
  error: HttpClientError.HttpClientError,
): Effect.Effect<never, HttpError> =>
  Match.value(error.reason).pipe(
    Match.tag("StatusCodeError", "DecodeError", "EmptyBodyError", (reason) =>
      fromResponse(reason.response, error),
    ),
    Match.orElse((reason) =>
      Effect.fail(
        new ConnectionError({ message: reason.message, cause: error }),
      ),
    ),
  );

export const make = Effect.fnUntraced(function* (options: HttpOptions) {
  const client = yield* HttpApiClient.make(SystemBridgeApi, {
    baseUrl: httpUrl(options),
  });

  const timeout = Duration.fromInputUnsafe(options.timeout ?? "20 seconds");

  const handle =
    (request: string) =>
    <A, R>(
      effect: Effect.Effect<
        A,
        HttpClientError.HttpClientError | Schema.SchemaError,
        R
      >,
    ): Effect.Effect<A, HttpError, R> =>
      effect.pipe(
        Effect.catchTags({
          HttpClientError: fromClientError,
          SchemaError: (cause) =>
            Effect.fail(new DecodeError({ message: cause.message, cause })),
        }),
        Effect.timeoutOrElse({
          duration: timeout,
          orElse: () =>
            Effect.fail(
              new RequestTimeoutError({
                event: request,
                timeoutMs: Duration.toMillis(timeout),
              }),
            ),
        }),
      );

  const health = client.system
    .health({})
    .pipe(
      handle("GET /api/health"),
      Effect.withSpan("SystemBridgeHttp.health"),
    );

  const getModuleData = Effect.fn("SystemBridgeHttp.getModuleData")(function* <
    M extends ModuleName,
  >(module: M) {
    const body = yield* client.data
      .module({
        params: { module },
        headers: { authorization: `Bearer ${Redacted.value(options.token)}` },
      })
      .pipe(handle(`GET /api/data/${module}`));

    if (Predicate.isNull(body)) {
      return yield* new DataMissingError({
        modules: [module],
        message: `No data yet for ${module}`,
      });
    }

    const schema: Schema.Decoder<ModuleData[M]> = ModuleDataSchemas[module];

    return yield* Schema.decodeEffect(schema)(body).pipe(
      Effect.mapError(
        (cause) =>
          new DecodeError({
            message: `Invalid ${module} data: ${cause.message}`,
            cause,
          }),
      ),
    );
  });

  const exchangeKey = Effect.fn("SystemBridgeHttp.exchangeKey")(function* (
    who: Client,
  ) {
    return yield* client.keys
      .exchange({
        headers: { authorization: `Bearer ${Redacted.value(options.token)}` },
        payload: { client: who },
      })
      .pipe(handle("POST /api/keys/exchange"));
  });

  return SystemBridgeHttp.of({ health, getModuleData, exchangeKey });
});

export class SystemBridgeHttp extends Context.Service<
  SystemBridgeHttp,
  Interface
>()("@timmo001/effect-system-bridge/SystemBridgeHttp") {
  /** Needs an `HttpClient`. */
  static readonly layer = (options: HttpOptions) =>
    Layer.effect(SystemBridgeHttp, make(options));

  /** Uses the global `fetch`. */
  static readonly layerFetch = (options: HttpOptions) =>
    SystemBridgeHttp.layer(options).pipe(Layer.provide(FetchHttpClient.layer));
}
