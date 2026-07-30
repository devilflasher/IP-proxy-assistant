import assert from "node:assert/strict";
import fs from "node:fs";
import "../js/proxy_utils.js";

const localData = {};
const syncData = { list: [] };
const listeners = {};
let proxyDetails = {
    levelOfControl: "controllable_by_this_extension",
    value: { mode: "system" }
};
let failNextProxySet = false;

function event(name) {
    return {
        addListener(callback) {
            listeners[name] = callback;
        }
    };
}

function select(data, keys) {
    if (Array.isArray(keys)) {
        return Object.fromEntries(keys.filter((key) => key in data).map((key) => [key, data[key]]));
    }
    if (typeof keys === "object") {
        return Object.assign({}, keys, Object.fromEntries(Object.keys(keys).filter((key) => key in data).map((key) => [key, data[key]])));
    }
    return { ...data };
}

globalThis.chrome = {
    runtime: {
        lastError: null,
        onInstalled: event("installed"),
        onStartup: event("startup"),
        onMessage: event("message")
    },
    storage: {
        local: {
            get(keys, callback) { callback(select(localData, keys)); },
            set(values, callback) { Object.assign(localData, values); callback?.(); },
            async setAccessLevel() {}
        },
        sync: {
            get(keys, callback) { callback(select(syncData, keys)); },
            remove(keys, callback) {
                keys.forEach((key) => delete syncData[key]);
                callback?.();
            }
        }
    },
    proxy: {
        settings: {
            get(options, callback) { callback(structuredClone(proxyDetails)); },
            set(options, callback) {
                if (failNextProxySet) {
                    failNextProxySet = false;
                    chrome.runtime.lastError = { message: "mock set failure" };
                    callback();
                    chrome.runtime.lastError = null;
                    return;
                }
                proxyDetails = {
                    levelOfControl: "controlled_by_this_extension",
                    value: structuredClone(options.value)
                };
                callback();
            }
        },
        onProxyError: event("proxyError")
    },
    action: {
        setBadgeText() {},
        setBadgeBackgroundColor() {}
    },
    webRequest: {
        onAuthRequired: event("authRequired"),
        onCompleted: event("requestCompleted"),
        onErrorOccurred: event("requestError")
    }
};

const backgroundSource = fs.readFileSync(new URL("../background.js", import.meta.url), "utf8")
    .replace('import "./js/proxy_utils.js";', "");
await import(`data:text/javascript;base64,${Buffer.from(backgroundSource).toString("base64")}`);

assert.equal(typeof listeners.authRequired, "function", "auth listener must be registered at module load");
assert.equal(typeof listeners.message, "function");
assert.equal(typeof listeners.proxyError, "function");

function send(message) {
    return new Promise((resolve) => {
        const keepAlive = listeners.message(message, {}, resolve);
        assert.equal(keepAlive, true);
    });
}

const httpProxy = {
    Enter_name: "A1",
    select: "HTTP",
    Proxy_ip: "proxy.example.com",
    Port: "8080",
    Username: "user",
    Password: "pass"
};

const applied = await send({ action: "applyProxy", proxyInfo: httpProxy });
assert.equal(applied.success, true);
assert.equal(localData.proxyEnabled, true);
assert.equal(proxyDetails.value.mode, "fixed_servers");

const status = await send({ action: "getProxyStatus" });
assert.equal(status.enabled, true);
assert.equal(status.proxyInfo.Proxy_ip, "proxy.example.com");

const credentials = await new Promise((resolve) => {
    listeners.authRequired({ isProxy: true, requestId: "request-1" }, resolve);
});
assert.deepEqual(credentials.authCredentials, { username: "user", password: "pass" });

const invalidSocks = await send({
    action: "applyProxy",
    proxyInfo: { ...httpProxy, select: "SOCKS5" }
});
assert.equal(invalidSocks.success, false);
assert.equal(invalidSocks.code, "INVALID_PROXY");

failNextProxySet = true;
const failedApply = await send({ action: "applyProxy", proxyInfo: httpProxy });
assert.equal(failedApply.success, false);
assert.equal(localData.proxyEnabled, true, "failed switch must restore the previously active proxy");
assert.equal(proxyDetails.value.mode, "fixed_servers");

const disabled = await send({ action: "turnOffProxy" });
assert.equal(disabled.success, true);
assert.equal(localData.proxyEnabled, false);
assert.equal(proxyDetails.value.mode, "system");

console.log("background tests passed");
