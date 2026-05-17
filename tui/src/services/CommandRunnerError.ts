import { Schema } from "effect";

export class CommandRunnerError extends Schema.TaggedErrorClass<CommandRunnerError>()(
  "CommandRunnerError",
  { message: Schema.String },
) {}
