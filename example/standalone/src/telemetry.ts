const BASE_URL = "http://localhost:8888";

class Telemetry {
  async log(endpoint: string, payload: object) {
    let url = `${BASE_URL}/${endpoint}`;

    let response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to log with status: ${response.statusText} `);
    }
  }
}

if (typeof window !== "undefined") {
  window.telemetry = new Telemetry();
}
