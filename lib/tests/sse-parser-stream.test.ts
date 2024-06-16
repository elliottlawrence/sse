import { expect, test } from "vitest";
import { SSEParserStream } from "../sse-parser-stream";
import {
  ReadableStream,
  TextDecoderStream,
  TextEncoderStream,
  TransformStream,
} from "node:stream/web";
import { SSE } from "../sse-parser";

async function* genStream(readableStream: ReadableStream) {
  const stream = readableStream
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new SSEParserStream() as TransformStream<string, SSE>);

  for await (const chunk of stream) {
    yield chunk;
  }
}

test("SSEParserStream", async () => {
  const readableStream = ReadableStream.from(
    [
      "data: This is a message",
      "",
      "data: This is another",
      "data: message",
      "",
      "data:Yet another",
      "data: message",
      "",
      "",
    ].join("\n")
  ).pipeThrough(new TextEncoderStream());

  const expected = [
    { type: "message", data: "This is a message", lastEventId: "" },
    { type: "message", data: "This is another\nmessage", lastEventId: "" },
    { type: "message", data: "Yet another\nmessage", lastEventId: "" },
  ];
  const actual = [];
  for await (const chunk of genStream(readableStream)) {
    actual.push(chunk);
  }
  expect(actual).toEqual(expected);
});
