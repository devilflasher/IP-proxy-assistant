import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const manifest = JSON.parse(read("manifest.json"));

assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.version, "4.0.0");
assert.deepEqual(manifest.permissions.sort(), ["proxy", "storage", "webRequest", "webRequestAuthProvider"].sort());
assert.deepEqual(manifest.host_permissions, ["<all_urls>"]);

for (const htmlFile of ["popup.html", "proxy_set.html"]) {
    const html = read(htmlFile);
    assert.doesNotMatch(html, /<(?:script|link)[^>]+(?:src|href)=["']https?:/i, `${htmlFile} loads a remote script or stylesheet`);
    for (const match of html.matchAll(/(?:src|href)=["']\.\/([^"'?#]+)/g)) {
        assert.equal(fs.existsSync(path.join(root, match[1])), true, `${htmlFile} references missing ${match[1]}`);
    }
}

const background = read("background.js");
assert.doesNotMatch(background, /\bfetch\s*\(/, "background must not auto-contact a test endpoint");
assert.match(background, /chrome\.webRequest\.onAuthRequired\.addListener/);
assert.match(background, /chrome\.proxy\.onProxyError\.addListener/);
assert.doesNotMatch(read("js/popup.js") + read("js/proxy_set.js"), /storage\.sync/);

console.log("package policy tests passed");
