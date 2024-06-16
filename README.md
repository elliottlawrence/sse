# Server-Sent Event (SSE) Parser

This package provides a streaming parser for server-sent events.

Typically, in JavaScript, you would use an [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) to receive server-sent events. This API has some limitations, however, if you would like to make a POST request, or prefer a promise- or stream-based API.

## SSEParserStream

If you make a `fetch` request and want to process the response body, you could pipe it through `SSEParserStream` like so:

```js
const response = await fetch(...)
const stream = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new SSEParserStream());

for await (const chunk of stream) {
    yield chunk
}
```

## SSEParser

If you would prefer lower-level access, you can use the `SSEParser` directly and provide it with callbacks whenever an event is dispatched, or when the reconnection time of the stream is changed.

```js
const parser = new SSEParser({
  dispatchEvent: (event) => {...},
  setReconnectionTime: (time) => {...},
});
```

## Exported Types

```js
interface SSE {
  type: string; // The event type, defaults to "message"
  data: string; // Actual event data
  lastEventId: string; // The last event ID, if any
}
```

```js
interface IEventSource {
  dispatchEvent(event: SSE): void; // Called whenever a new SSE is processed
  setReconnectionTime?: (time: number) => void; // Called whenever the stream's reconnection time is updated
}
```
