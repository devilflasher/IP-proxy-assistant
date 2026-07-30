import "./js/proxy_utils.js";

const { normalizeProxy, sameProxyEndpoint, validateProxy } = globalThis.ProxyUtils;
const AUTH_RETRY_LIMIT = 2;
const LOCAL_STORAGE_KEYS = ["currentProxy", "proxyEnabled", "lastProxyError"];
const authAttempts = new Map();
let pendingProxy = null;

function getLocal(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (items) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(items);
    });
  });
}

function setLocal(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function getSync(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, (items) => resolve(items || {}));
  });
}

function removeSync(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.remove(keys, resolve);
  });
}

function getProxySettings() {
  return new Promise((resolve, reject) => {
    chrome.proxy.settings.get({ incognito: false }, (details) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(details);
    });
  });
}

function setProxySettings(value) {
  return new Promise((resolve, reject) => {
    chrome.proxy.settings.set({ value, scope: "regular" }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function proxyError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function controlError(levelOfControl) {
  if (levelOfControl === "controlled_by_other_extensions") {
    return proxyError("PROXY_CONTROLLED_BY_OTHER_EXTENSION", "代理设置正被另一个扩展控制，请先关闭其他代理扩展");
  }
  if (levelOfControl === "not_controllable") {
    return proxyError("PROXY_NOT_CONTROLLABLE", "代理设置受浏览器策略或启动参数控制，本扩展无法修改");
  }
  return null;
}

function buildProxyConfig(proxy) {
  return {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: proxy.select.toLowerCase(),
        host: proxy.Proxy_ip,
        port: Number(proxy.Port)
      },
      bypassList: ["localhost", "127.0.0.1", "[::1]", "<local>"]
    }
  };
}

function effectiveProxy(details) {
  const server = details?.value?.rules?.singleProxy;
  if (details?.value?.mode !== "fixed_servers" || !server) {
    return null;
  }
  return normalizeProxy({
    select: server.scheme,
    Proxy_ip: server.host,
    Port: server.port
  });
}

function setBadge(proxyName) {
  const text = proxyName ? String(proxyName).slice(0, 4) : "";
  chrome.action.setBadgeText({ text });
  if (text) {
    chrome.action.setBadgeBackgroundColor({ color: "#FFFFFF" });
  }
}

async function saveProxyError(code, message, fatal) {
  await setLocal({
    lastProxyError: {
      code,
      message,
      fatal: Boolean(fatal),
      timestamp: Date.now()
    }
  });
}

async function migrateSyncedProxyList() {
  const local = await getLocal(["list", "proxyStorageMigrated"]);
  if (local.proxyStorageMigrated) {
    return;
  }

  const synced = await getSync(["list", "ip_info"]);
  const updates = { proxyStorageMigrated: true };
  if ((!Array.isArray(local.list) || local.list.length === 0) && Array.isArray(synced.list)) {
    updates.list = synced.list.map(normalizeProxy);
  }

  await setLocal(updates);
  await removeSync(["list", "ip_info"]);
}

async function applyProxySettings(proxyInfo) {
  const validation = validateProxy(proxyInfo, { requireName: false });
  if (!validation.ok) {
    throw proxyError("INVALID_PROXY", validation.errors.join("；"));
  }

  const proxy = validation.proxy;
  const [before, storedBefore] = await Promise.all([
    getProxySettings(),
    getLocal(LOCAL_STORAGE_KEYS)
  ]);
  const blocked = controlError(before.levelOfControl);
  if (blocked) {
    throw blocked;
  }

  pendingProxy = proxy;
  try {
    await setProxySettings(buildProxyConfig(proxy));
    const after = await getProxySettings();
    const afterControlError = controlError(after.levelOfControl);
    if (afterControlError) {
      throw afterControlError;
    }
    if (after.levelOfControl !== "controlled_by_this_extension" || !sameProxyEndpoint(proxy, effectiveProxy(after))) {
      throw proxyError("PROXY_NOT_APPLIED", "Chrome 未确认代理配置，可能与其他代理扩展或浏览器策略冲突");
    }

    await setLocal({
      currentProxy: proxy,
      proxyEnabled: true,
      lastProxyError: null
    });
    setBadge(proxy.Enter_name);

    return {
      success: true,
      warnings: validation.warnings
    };
  } catch (error) {
    let restoredPreviousProxy = false;
    try {
      await setProxySettings(before.value || { mode: "system" });
      restoredPreviousProxy = Boolean(storedBefore.proxyEnabled && storedBefore.currentProxy);
    } catch (rollbackError) {
      console.warn("Unable to restore previous proxy after failure:", rollbackError.message);
    }
    setBadge(restoredPreviousProxy ? storedBefore.currentProxy.Enter_name : "");
    await setLocal({
      currentProxy: restoredPreviousProxy ? storedBefore.currentProxy : null,
      proxyEnabled: restoredPreviousProxy,
      lastProxyError: {
        code: error.code || "PROXY_APPLY_FAILED",
        message: error.message,
        fatal: true,
        timestamp: Date.now()
      }
    });
    throw error;
  } finally {
    pendingProxy = null;
  }
}

async function turnOffProxy() {
  const before = await getProxySettings();
  const blocked = controlError(before.levelOfControl);
  if (blocked) {
    throw blocked;
  }

  await setProxySettings({ mode: "system" });
  await setLocal({
    currentProxy: null,
    proxyEnabled: false,
    lastProxyError: null
  });
  authAttempts.clear();
  pendingProxy = null;
  setBadge("");
  return { success: true };
}

async function getProxyStatus() {
  const [stored, settings] = await Promise.all([
    getLocal(LOCAL_STORAGE_KEYS),
    getProxySettings()
  ]);
  const configuredProxy = effectiveProxy(settings);
  const enabled = Boolean(
    stored.proxyEnabled
    && stored.currentProxy
    && settings.levelOfControl === "controlled_by_this_extension"
    && configuredProxy
    && sameProxyEndpoint(stored.currentProxy, configuredProxy)
  );

  let controlMessage = "";
  const blocked = controlError(settings.levelOfControl);
  if (blocked) {
    controlMessage = blocked.message;
  } else if (stored.proxyEnabled && !enabled) {
    controlMessage = "保存的代理状态与 Chrome 当前配置不一致，请重新启用";
  }

  return {
    success: true,
    enabled,
    proxyInfo: enabled ? normalizeProxy(stored.currentProxy) : null,
    lastError: stored.lastProxyError || (controlMessage ? {
      code: "PROXY_STATE_MISMATCH",
      message: controlMessage,
      fatal: true,
      timestamp: Date.now()
    } : null),
    levelOfControl: settings.levelOfControl
  };
}

async function restoreSavedProxy() {
  await migrateSyncedProxyList();
  const stored = await getLocal(["currentProxy", "proxyEnabled"]);
  if (stored.proxyEnabled && stored.currentProxy) {
    try {
      await applyProxySettings(stored.currentProxy);
    } catch (error) {
      console.warn("Unable to restore saved proxy:", error.message);
    }
  } else {
    setBadge("");
  }
}

function handleAuthRequest(details, callback) {
  if (!details.isProxy) {
    callback({});
    return;
  }

  getLocal(["currentProxy", "proxyEnabled"]).then((stored) => {
    const proxy = normalizeProxy(pendingProxy || stored.currentProxy);
    const isPending = Boolean(pendingProxy);
    if ((!stored.proxyEnabled && !isPending) || !proxy.Username) {
      callback({});
      return;
    }

    if (proxy.select === "SOCKS4" || proxy.select === "SOCKS5") {
      callback({});
      return;
    }

    const attempts = authAttempts.get(details.requestId) || 0;
    if (attempts >= AUTH_RETRY_LIMIT) {
      saveProxyError("PROXY_AUTH_FAILED", "代理服务器拒绝了用户名或密码", true).catch(console.error);
      callback({ cancel: true });
      return;
    }

    authAttempts.set(details.requestId, attempts + 1);
    const cleanupTimer = setTimeout(() => authAttempts.delete(details.requestId), 60_000);
    if (cleanupTimer && typeof cleanupTimer.unref === "function") {
      cleanupTimer.unref();
    }
    callback({
      authCredentials: {
        username: proxy.Username,
        password: proxy.Password
      }
    });
  }).catch((error) => {
    console.error("Unable to read proxy credentials:", error);
    callback({});
  });
}

chrome.webRequest.onAuthRequired.addListener(
  handleAuthRequest,
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);

chrome.proxy.onProxyError.addListener((details) => {
  saveProxyError("CHROME_PROXY_ERROR", details.details || details.error, details.fatal).catch(console.error);
});

chrome.runtime.onInstalled.addListener((details) => {
  const initialize = async () => {
    if (chrome.storage.local.setAccessLevel) {
      await chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
    }
    await migrateSyncedProxyList();
    if (details.reason === "install") {
      await setLocal({ proxyEnabled: false, currentProxy: null, lastProxyError: null });
      setBadge("");
      return;
    }
    await restoreSavedProxy();
  };

  initialize().catch((error) => console.error("Extension initialization failed:", error));
});

chrome.runtime.onStartup.addListener(() => {
  restoreSavedProxy().catch((error) => console.error("Startup restore failed:", error));
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleMessage = async () => {
    switch (message?.action) {
      case "applyProxy":
        if (!message.proxyInfo) {
          throw proxyError("INVALID_PROXY", "缺少代理配置");
        }
        return applyProxySettings(message.proxyInfo);
      case "turnOffProxy":
        return turnOffProxy();
      case "getProxyStatus":
        return getProxyStatus();
      default:
        throw proxyError("UNKNOWN_ACTION", "未知操作");
    }
  };

  handleMessage()
    .then(sendResponse)
    .catch((error) => sendResponse({
      success: false,
      error: error.message,
      code: error.code || "UNEXPECTED_ERROR"
    }));
  return true;
});
