/**
 * Turns a manifest tool's JSON Schema into OpenCode tool input that rejects
 * keys the tool doesn't take. OpenCode strips unknown keys by default, so a
 * misspelt option would be dropped and the call run without it. The binary
 * checks the input again; this makes the mistake show before the call.
 */
import type { Tool } from "@opencode/schema/tool";
import {
  JsonSchema,
  Result,
  Schema,
  SchemaIssue,
  SchemaParser,
  SchemaRepresentation,
  type StandardSchema,
} from "effect";

const formatIssue = SchemaIssue.makeFormatterStandardSchemaV1();

/** Wrap a JSON Schema as a Standard Schema that decodes strictly and passes the input on unchanged. */
export const strictInput = (input: JsonSchema.JsonSchema): Tool.ValueSchema => {
  const codec: Schema.Codec<unknown> = Schema.make(
    SchemaRepresentation.fromJsonSchemaDocument(
      JsonSchema.fromSchemaDraft2020_12(input),
      { patterns: "apply" },
    ).ast,
  );

  const decode = SchemaParser.decodeUnknownResult(codec, {
    onExcessProperty: "error",
    errors: "all",
  });

  const schema: StandardSchema.StandardSchemaV1 &
    StandardSchema.StandardJSONSchemaV1 = {
    "~standard": {
      version: 1,
      vendor: "system-bridge",
      validate: (value) =>
        Result.match(decode(value), {
          onFailure: formatIssue,
          onSuccess: () => ({ value }),
        }),
      jsonSchema: { input: () => input, output: () => input },
    },
  };

  return schema;
};
