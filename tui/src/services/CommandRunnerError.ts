import { Data } from "effect";

export class CommandRunnerError extends Data.TaggedError("CommandRunnerError")<{
  readonly message: string;
}> {}
