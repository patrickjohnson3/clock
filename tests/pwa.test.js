import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const scope = "https://example.test/clock/";

test("the linked manifest and PNG icons support installation at root and /clock/", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const link = [...html.matchAll(/<link\b[^>]*>/g)].find(([tag]) =>
    tag.includes('rel="manifest"'),
  );
  assert.ok(link, "The page must link its web app manifest");
  const href = link[0].match(/href="([^"]+)"/)[1];
  const manifest = JSON.parse(await readFile(new URL(href, root), "utf8"));
  assert.ok(manifest.name);
  assert.equal(manifest.display, "standalone");
  assert.notEqual(manifest.prefer_related_applications, true);
  for (const base of ["https://example.test/", scope]) {
    const manifestURL = new URL(href, base);
    for (const key of ["start_url", "scope"]) {
      assert.equal(new URL(manifest[key], manifestURL).href, base, key);
    }
    const startURL = new URL(manifest.start_url, manifestURL);
    // Manifest IDs resolve from the start URL's origin, not its directory.
    assert.equal(
      new URL(manifest.id, startURL.origin).href,
      "https://example.test/",
      "Preserve the existing installation identity at either deployment path",
    );
    for (const size of [192, 512]) {
      const icon = manifest.icons.find(
        (icon) => icon.sizes === `${size}x${size}`,
      );
      assert.ok(icon, `An install icon must exist at ${size}x${size}`);
      assert.equal(icon.type, "image/png");
      assert.ok(new URL(icon.src, manifestURL).href.startsWith(base));
      const png = await readFile(new URL(icon.src, new URL(href, root)));
      assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
      assert.equal(png.readUInt32BE(16), size);
      assert.equal(png.readUInt32BE(20), size);
    }
  }
});

async function createWorker({ failInstall = false, initialCaches = [] } = {}) {
  const handlers = new Map();
  const stores = new Map(initialCaches.map((name) => [name, new Map()]));
  const installs = [];
  const fetched = [];
  let forcedActivations = 0;
  const cacheStorage = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async addAll(requests) {
          installs.push(...requests);
          if (failInstall) throw new TypeError("An app asset is unavailable");
          for (const request of requests) {
            entries.set(request.url, new Response(`cached:${request.url}`));
          }
        },
        async match(url) {
          return entries.get(String(url))?.clone();
        },
      };
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name) {
      return stores.delete(name);
    },
  };
  const source = await readFile(new URL("sw.js", root), "utf8");
  runInNewContext(source, {
    URL,
    Request,
    caches: cacheStorage,
    fetch: async (request) => {
      fetched.push(request.url);
      return new Response(`network:${request.url}`);
    },
    self: {
      registration: { scope },
      addEventListener: (name, handler) => handlers.set(name, handler),
      skipWaiting: () => forcedActivations++,
      clients: { claim: () => forcedActivations++ },
    },
  });
  return {
    installs,
    fetched,
    stores,
    get forcedActivations() {
      return forcedActivations;
    },
    lifecycle(name) {
      let pending;
      handlers.get(name)({ waitUntil: (promise) => (pending = promise) });
      assert.ok(pending, `${name} must wait for its cache work`);
      return pending;
    },
    request(url, { method = "GET", mode = "cors" } = {}) {
      let response;
      handlers.get("fetch")({
        request: { url: new URL(url, scope).href, method, mode },
        respondWith: (promise) => (response = promise),
      });
      return response;
    },
  };
}

test("offline installation includes every HTML asset, module dependency, and manifest icon", async () => {
  const worker = await createWorker();
  await worker.lifecycle("install");
  const urls = worker.installs.map((request) => request.url);
  assert.equal(new Set(urls).size, urls.length);
  for (const request of worker.installs) {
    assert.ok(request.url.startsWith(scope));
    assert.equal(
      request.cache,
      "reload",
      "Do not precache stale HTTP responses",
    );
    await readFile(new URL(request.url.slice(scope.length), root));
  }
  const expected = new Set(["index.html"]);
  const html = await readFile(new URL("index.html", root), "utf8");
  for (const [, path] of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const url = new URL(path, scope);
    if (url.href.startsWith(scope)) expected.add(url.href.slice(scope.length));
  }
  const visit = async (path) => {
    const source = await readFile(new URL(path, root), "utf8");
    for (const [, dependency] of source.matchAll(
      /\bimport\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g,
    )) {
      const url = new URL(dependency, new URL(path, scope));
      assert.ok(url.href.startsWith(scope), "Modules must stay within the app");
      const relative = url.href.slice(scope.length);
      if (!expected.has(relative)) {
        expected.add(relative);
        await visit(relative);
      }
    }
  };
  await visit("app.js");
  const manifest = JSON.parse(
    await readFile(new URL("manifest.webmanifest", root), "utf8"),
  );
  for (const icon of manifest.icons) {
    expected.add(new URL(icon.src, scope).href.slice(scope.length));
  }
  for (const path of expected)
    assert.ok(urls.includes(new URL(path, scope).href), path);
  assert.equal(urls.includes(new URL("sw.js", scope).href), false);
});

test("the offline shell serves root/index/query launches and pins cached modules", async () => {
  const worker = await createWorker();
  await worker.lifecycle("install");
  for (const path of [
    "./",
    "./?source=homescreen",
    "index.html?source=homescreen",
  ]) {
    const response = await worker.request(path, { mode: "navigate" });
    assert.equal(await response.text(), `cached:${scope}index.html`);
  }
  for (const path of [
    "app.js",
    "js/main.js",
    "styles.css",
    "manifest.webmanifest",
  ]) {
    const response = await worker.request(path);
    assert.equal(await response.text(), `cached:${scope}${path}`);
  }
  assert.deepEqual(worker.fetched, []);
});

test("unrelated pages, external resources, worker updates and non-GET requests bypass the cache", async () => {
  const worker = await createWorker();
  await worker.lifecycle("install");
  for (const [url, options] of [
    ["https://fonts.googleapis.com/css2?family=Space+Mono"],
    ["https://example.test/other-app/", { mode: "navigate" }],
    ["missing.html", { mode: "navigate" }],
    ["README.md"],
    ["sw.js"],
    ["app.js", { method: "POST" }],
  ]) {
    assert.equal(worker.request(url, options), undefined, url);
  }
});

test("a missing cached asset falls back to the original network request", async () => {
  const worker = await createWorker();
  await worker.lifecycle("install");
  for (const entries of worker.stores.values())
    entries.delete(`${scope}app.js`);
  const response = await worker.request("app.js");
  assert.equal(await response.text(), `network:${scope}app.js`);
  assert.deepEqual(worker.fetched, [`${scope}app.js`]);
});

test("activation removes only previous caches belonging to this app scope", async () => {
  const old = `centered-clock:${scope}:v1`;
  const unrelated = [
    "other-app-v1",
    "centered-clock:https://example.test/:old",
  ];
  const worker = await createWorker({ initialCaches: [old, ...unrelated] });
  await worker.lifecycle("install");
  const current = [...worker.stores.keys()].find(
    (name) => ![old, ...unrelated].includes(name),
  );
  assert.ok(current);
  assert.equal(
    worker.stores.has(old),
    true,
    "Installation must retain the active version",
  );
  await worker.lifecycle("activate");
  assert.equal(worker.stores.has(old), false);
  for (const name of [...unrelated, current])
    assert.equal(worker.stores.has(name), true);
  assert.equal(
    worker.forcedActivations,
    0,
    "Do not replace a running clock's worker",
  );
});

test("activation preserves newer workers' caches and unrecognized cache versions", async () => {
  const worker = await createWorker();
  await worker.lifecycle("install");
  const prefix = `centered-clock:${scope}:`;
  const [current] = worker.stores.keys();
  const version = Number(current.slice(prefix.length + 1));
  assert.ok(Number.isSafeInteger(version) && version > 0);
  const newerCaches = [
    `${prefix}v${version + 1}`,
    `${prefix}v${version + 9}`,
    `${prefix}future-format`,
  ];
  const entries = new Map([
    [`${scope}index.html`, new Response("newer shell")],
  ]);
  for (const name of newerCaches) worker.stores.set(name, entries);

  await worker.lifecycle("activate");

  for (const name of newerCaches) {
    assert.equal(worker.stores.get(name), entries, name);
    assert.equal(
      await worker.stores.get(name).get(`${scope}index.html`).clone().text(),
      "newer shell",
    );
  }
});

test("a failed installation rejects without deleting the previous working cache", async () => {
  const old = `centered-clock:${scope}:v1`;
  const worker = await createWorker({
    failInstall: true,
    initialCaches: [old],
  });
  await assert.rejects(worker.lifecycle("install"), /asset is unavailable/);
  assert.equal(worker.stores.has(old), true);
  assert.equal(worker.forcedActivations, 0);
});
