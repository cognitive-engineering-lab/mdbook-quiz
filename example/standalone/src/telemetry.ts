import * as uuid from "uuid";

const TELEMETRY_URL = "https://rust-book.willcrichton.net/logs";

function getSessionId() {
  const SESSION_STORAGE_KEY = "__telemetry_session";
  if (localStorage.getItem(SESSION_STORAGE_KEY) === null) {
    localStorage.setItem(SESSION_STORAGE_KEY, uuid.v4());
  }
  return localStorage.getItem(SESSION_STORAGE_KEY)!;
}

class Telemetry {
  private sessionId: string;

  constructor() {
    this.sessionId = getSessionId();
  }

  // biome-ignore lint/suspicious/noExplicitAny: payload can be anything
  log(_endpoint: string, payload: any) {
    let log = {
      sessionId: this.sessionId,
      timestamp: new Date().getTime(),
      payload
    };

    let fullUrl = `${TELEMETRY_URL}/rq_answers`;
    fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(log)
    });
  }
}

if (typeof window !== "undefined") {
  window.telemetry = new Telemetry();
}
