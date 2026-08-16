import assert from "node:assert/strict";
import { test } from "node:test";
import { absoluteUrl, originOf } from "./origin";

function req(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

const withEnv = (value: string | undefined, run: () => void) => {
  const prior = process.env.APP_URL;
  if (value === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = value;
  try {
    run();
  } finally {
    if (prior === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = prior;
  }
};

test("a declared APP_URL wins over anything the request claims", () => {
  withEnv("https://canopy.app", () => {
    assert.equal(
      originOf(req("https://localhost:8080/api/x", { host: "localhost:8080" })),
      "https://canopy.app",
    );
  });
});

test("a declared origin is normalised, so a trailing slash cannot double up", () => {
  withEnv("https://canopy.app/", () => {
    assert.equal(
      absoluteUrl(req("https://localhost:8080/x"), "/api/snaptrade/callback"),
      "https://canopy.app/api/snaptrade/callback",
    );
  });
});

test("without APP_URL the proxy's forwarding headers are believed, not the socket", () => {
  withEnv(undefined, () => {
    /*
     * The bug this file exists for: inside a container the request is against
     * localhost:8080, and building the SnapTrade callback from it handed the
     * portal an address no browser could ever return to.
     */
    const origin = originOf(
      req("https://localhost:8080/api/snaptrade/connect", {
        host: "localhost:8080",
        "x-forwarded-host": "bagcheck-production-860c.up.railway.app",
        "x-forwarded-proto": "https",
      }),
    );
    assert.equal(origin, "https://bagcheck-production-860c.up.railway.app");
  });
});

test("a forwarded-proto list keeps only the first hop", () => {
  withEnv(undefined, () => {
    assert.equal(
      originOf(req("http://x/y", { "x-forwarded-host": "a.example", "x-forwarded-proto": "https, http" })),
      "https://a.example",
    );
  });
});

test("a bare host is assumed https unless it is local", () => {
  withEnv(undefined, () => {
    assert.equal(originOf(req("http://x/y", { host: "a.example" })), "https://a.example");
    assert.equal(originOf(req("http://x/y", { host: "localhost:3000" })), "http://localhost:3000");
    assert.equal(originOf(req("http://x/y", { host: "127.0.0.1:3000" })), "http://127.0.0.1:3000");
  });
});

test("with no headers at all it falls back to the request, which is right in development", () => {
  withEnv(undefined, () => {
    const bare = new Request("http://localhost:3000/api/x");
    bare.headers.delete("host");
    assert.equal(originOf(bare), "http://localhost:3000");
  });
});

test("a query string survives the join", () => {
  withEnv("https://canopy.app", () => {
    assert.equal(
      absoluteUrl(req("http://x/y"), "/wrapped?connected=1"),
      "https://canopy.app/wrapped?connected=1",
    );
  });
});
