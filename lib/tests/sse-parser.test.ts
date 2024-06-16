import { test, expect } from "vitest";
import { DIGITS, FIELD_VALUE, NEWLINE, SSE, SSEParser } from "../sse-parser";

test("newline regex", () => {
  [
    { input: "", expected: null },
    { input: "\n", expected: ["", ""] },
    { input: "\r", expected: ["", ""] },
    { input: "\r\n", expected: ["", ""] },
    { input: "Hello", expected: null },
    { input: "Hello\n", expected: ["Hello", ""] },
    { input: "Hello\nWorld", expected: ["Hello", "World"] },
    { input: "Hello\nWorld\n!", expected: ["Hello", "World\n!"] },
    {
      input: "one\ntwo\nthree\r\nfour",
      expected: ["one", "two\nthree\r\nfour"],
    },
    {
      input: "one\rtwo\nthree\r\nfour",
      expected: ["one", "two\nthree\r\nfour"],
    },
    {
      input: "one\r\ntwo\nthree\r\nfour",
      expected: ["one", "two\nthree\r\nfour"],
    },
  ].forEach(({ input, expected }) => {
    const matches = input.match(NEWLINE);
    expect(matches && matches.slice(1)).toEqual(expected);
  });
});

test("field value regex", () => {
  [
    { input: "data: Hello", expected: ["data", "Hello"] },
    { input: "data:Hello", expected: ["data", "Hello"] },
    { input: "data:  Hello", expected: ["data", " Hello"] },
    { input: ":Hello", expected: null },
    { input: "data", expected: null },
    { input: "data:", expected: ["data", ""] },
    { input: ":", expected: null },
  ].forEach(({ input, expected }) => {
    const matches = input.match(FIELD_VALUE);
    expect(matches && matches.slice(1)).toEqual(expected);
  });
});

test("digit regex", () => {
  [
    { input: "123", expected: 123 },
    { input: "0", expected: 0 },
    { input: "0456", expected: 456 },
    { input: "1.23", expected: null },
    { input: "abc", expected: null },
    { input: "a123", expected: null },
    { input: "", expected: null },
  ].forEach(({ input, expected }) => {
    const result = input.match(DIGITS) && parseInt(input, 10);
    expect(result).toEqual(expected);
  });
});

const TEST_STREAMS = [
  {
    input: [
      ": comment",
      "",
      "event: message",
      "",
      "id: 1",
      "",
      "random: 123",
      "",
      "",
    ],

    events: [],
  },
  {
    input: ["data: YHOO", "data: +2", "data: 10", "", ""],
    events: [{ type: "message", data: "YHOO\n+2\n10", lastEventId: "" }],
  },
  {
    input: [
      ": test stream",
      "",
      "data: first event",
      "id: 1",
      "",
      "data:second event",
      "id",
      "",
      "data:  third event",
      "id: 3",
      "",
      "",
      "data: fourth event",
      "",
      "",
    ],
    events: [
      { type: "message", data: "first event", lastEventId: "1" },
      { type: "message", data: "second event", lastEventId: "" },
      { type: "message", data: " third event", lastEventId: "3" },
      { type: "message", data: "fourth event", lastEventId: "3" },
    ],
  },
  {
    input: ["data", "", "data", "data", "", "data:"],
    events: [
      { type: "message", data: "", lastEventId: "" },
      { type: "message", data: "\n", lastEventId: "" },
    ],
  },
  {
    input: ["data:test", "", "data: test", "", ""],
    events: [
      { type: "message", data: "test", lastEventId: "" },
      { type: "message", data: "test", lastEventId: "" },
    ],
  },
  {
    input: [
      "event: add",
      "data: 73857293",
      "",
      "event: remove",
      "data: 2153",
      "",
      "event: add",
      "data: 113411",
      "",
      "",
    ],
    events: [
      { type: "add", data: "73857293", lastEventId: "" },
      { type: "remove", data: "2153", lastEventId: "" },
      { type: "add", data: "113411", lastEventId: "" },
    ],
  },
  {
    input: ["\uFEFFdata: This has a BOM", "", ""],
    events: [{ type: "message", data: "This has a BOM", lastEventId: "" }],
  },
  {
    input: ["retry: 1234", "", "retry", "", "retry: a3", "retry:435", ""],
    events: [],
    reconnectionTimes: [1234, 435],
  },
];

function* random_chunks(str: string) {
  while (str.length > 0) {
    const chunkSize = Math.min(15, Math.ceil(Math.random() * str.length));
    yield str.slice(0, chunkSize);
    str = str.slice(chunkSize);
  }
}

test("SSEParser", () => {
  for (const {
    input,
    events: expectedEvents,
    reconnectionTimes: expectedReconnectionTimes,
  } of TEST_STREAMS) {
    const events: SSE[] = [];
    const reconnectionTimes: number[] = [];
    const stream = new SSEParser({
      dispatchEvent(event) {
        events.push(event);
      },
      setReconnectionTime(time) {
        reconnectionTimes.push(time);
      },
    });

    for (const chunk of random_chunks(input.join("\n"))) {
      stream.feed(chunk);
    }

    expect(events).toEqual(expectedEvents);
    expect(reconnectionTimes).toEqual(expectedReconnectionTimes ?? []);
  }
});
