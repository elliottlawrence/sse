export const NEWLINE = /([^\r\n]*)(?:\r\n|\r|\n)(.*)/s;
export const FIELD_VALUE = /([^:]+):\s?(.*)/;
export const DIGITS = /^\d+$/;

export interface SSE {
  type: string;
  data: string;
  lastEventId: string;
}

interface IEventSource {
  dispatchEvent(event: SSE): void;
  setReconnectionTime?: (time: number) => void;
}

export class SSEParser {
  _firstChunk = true;
  _buffer = "";
  _data = "";
  _eventType = "";
  _lastEventId = "";

  _eventSource;

  constructor(eventSource: IEventSource) {
    this._eventSource = eventSource;
  }

  _dispatchEvent() {
    if (this._data.length === 0) {
      this._eventType = "";
      return;
    }

    if (this._data.endsWith("\n")) {
      this._data = this._data.slice(0, -1);
    }
    const event = {
      type: this._eventType || "message",
      data: this._data,
      lastEventId: this._lastEventId,
    };
    this._data = "";
    this._eventType == "";
    this._eventSource.dispatchEvent(event);
  }

  _processField(field: string, value: string) {
    if (field === "event") {
      this._eventType = value;
    } else if (field === "data") {
      this._data += value + "\n";
    } else if (field === "id") {
      if (!value.includes("\0")) {
        this._lastEventId = value;
      }
    } else if (field === "retry") {
      if (value.match(DIGITS)) {
        this._eventSource.setReconnectionTime?.(parseInt(value, 10));
      }
    }
  }

  _processLine(line: string) {
    if (line.length === 0) {
      this._dispatchEvent();
    } else if (line.startsWith(":")) {
      // Comment line, ignore
    } else if (line.includes(":")) {
      const [_, field, value] = line.match(FIELD_VALUE)!;
      this._processField(field, value);
    } else {
      this._processField(line, "");
    }
  }

  feed(chunk: string) {
    this._buffer += chunk;

    // Strip the BOM, if present
    if (this._firstChunk && this._buffer.length > 0) {
      this._firstChunk = false;
      if (this._buffer.startsWith("\uFEFF")) {
        this._buffer = this._buffer.slice(1);
      }
    }

    let matches;
    while ((matches = this._buffer.match(NEWLINE))) {
      const [_, line, rest] = matches;
      this._processLine(line);
      this._buffer = rest;
    }
  }
}
