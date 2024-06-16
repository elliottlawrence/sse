import { SSE, SSEParser } from "./sse-parser";

export class SSEParserStream extends TransformStream<string, SSE> {
  constructor() {
    let parser: SSEParser;
    super({
      start(controller) {
        parser = new SSEParser({
          dispatchEvent: (event) => controller.enqueue(event),
        });
      },
      transform(chunk: string) {
        parser.feed(chunk);
      },
    });
  }
}
