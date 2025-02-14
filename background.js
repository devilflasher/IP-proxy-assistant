// 监听代理状态变化
chrome.storage.local.onChanged.addListener(function(changes) {
    if (changes.proxyState) {
        const newState = changes.proxyState.newValue;
        if (newState && newState.enabled) {
            // 开启代理时检查 TUN 模式
            checkTunModeAndNotify();
            applyProxySettings(newState.ip);
            setBadgeEnabled(newState.ip);
        } else {
            clearProxySettings();
            chrome.action.setBadgeText({ text: '' });
        }
    }
});

// 添加安装和启动时的初始化
chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);

// 统一的初始化函数
function initialize() {
    checkBrowserCompatibility();
    
    // 替换原来的 initializeProxy 内容
    chrome.storage.local.get(['proxyState', 'proxyConfigs'], async function(result) {
        if (result.proxyState && result.proxyState.enabled) {
            await checkTunModeAndNotify();
            applyProxySettings(result.proxyState.ip);
            setBadgeEnabled(result.proxyState.ip);
        }
    });
    
    startTunModeCheck();
    setupMacProxyCheck();
}

let activeAuth = null;
let lastTunCheck = 0;
let lastTunCheckResult = null;
const TUN_CHECK_INTERVAL = 30000;
let hasShownTunNotification = false;

// 优化认证回调函数，增加缓存机制
const authCallbackCache = new Map();
const AUTH_CACHE_TIMEOUT = 300000; // 5分钟缓存

const authCallback = function(details) {
    if (!details.isProxy || !activeAuth) {
        return {};
    }

    const requestHost = details.challenger?.host;
    if (!requestHost) {
        return {};
    }

    // 检查缓存
    const cacheKey = `${requestHost}_${activeAuth.ip}`;
    const cachedAuth = authCallbackCache.get(cacheKey);
    if (cachedAuth) {
        return cachedAuth;
    }

    // 匹配逻辑
    if (requestHost === activeAuth.ip || 
        requestHost === activeAuth.ip.split(':')[0] ||
        requestHost === activeAuth.ip.split('.')[0]) {
        
        const authResponse = {
            authCredentials: {
                username: activeAuth.username,
                password: activeAuth.password
            }
        };

        // 缓存认证结果
        authCallbackCache.set(cacheKey, authResponse);
        setTimeout(() => authCallbackCache.delete(cacheKey), AUTH_CACHE_TIMEOUT);

        return authResponse;
    }

    return {};
};

// 优化认证设置函数
function setupAuthentication(proxyIp, proxyConfigs) {
    try {
        // 清理旧的认证状态
        clearAuthenticationState();

        const config = proxyConfigs?.find(c => c.ip === proxyIp);
        if (config?.username && config?.password) {
            activeAuth = {
                ip: proxyIp,
                username: config.username,
                password: config.password,
                timestamp: Date.now()
            };

            chrome.webRequest.onAuthRequired.addListener(
                authCallback,
                { urls: ["<all_urls>"] },
                ['blocking']
            );

            console.debug('认证设置成功:', proxyIp);
            return true;
        }
        return false;
    } catch (error) {
        console.debug('设置认证时出现异常:', error);
        clearAuthenticationState();
        return false;
    }
}

// 添加认证状态清理函数
function clearAuthenticationState() {
    if (chrome.webRequest?.onAuthRequired?.hasListener(authCallback)) {
        chrome.webRequest.onAuthRequired.removeListener(authCallback);
    }
    activeAuth = null;
    authCallbackCache.clear();
}

// 验证代理配置是否有效
function isValidProxyConfig(config) {
    return config 
        && config.ip 
        && config.port 
        && config.protocol 
        && /^\d+$/.test(config.port) 
        && parseInt(config.port) > 0 
        && parseInt(config.port) <= 65535;
}

// 统一的 TUN 模式检查状态管理
const tunModeState = {
    lastCheckTime: 0,
    lastCheckResult: null,
    checkInProgress: false,
    hasShownNotification: false,
    CHECK_INTERVAL: 30000
};

// 优化后的 TUN 模式检查函数
async function checkTunMode() {
    const now = Date.now();
    if (tunModeState.lastCheckResult !== null && 
        (now - tunModeState.lastCheckTime) < tunModeState.CHECK_INTERVAL) {
        return tunModeState.lastCheckResult;
    }

    if (tunModeState.checkInProgress) {
        return tunModeState.lastCheckResult ?? true;
    }

    tunModeState.checkInProgress = true;
    try {
        const response = await fetch('https://www.google.com/generate_204', {
            method: 'HEAD',
            cache: 'no-store',
            mode: 'no-cors',
            timeout: 5000
        });
        tunModeState.lastCheckResult = response.status === 204;
    } catch (e) {
        tunModeState.lastCheckResult = false;
    } finally {
        tunModeState.checkInProgress = false;
        tunModeState.lastCheckTime = now;
    }
    return tunModeState.lastCheckResult;
}

// 修改 TUN 模式通知函数
let lastNotificationTime = 0;
function showTunModeNotification() {
    const now = Date.now();
    // 限制通知频率为每5分钟最多一次
    if (now - lastNotificationTime < 300000) {
        return;
    }
    
    lastNotificationTime = now;
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'TUN 模式未开启',
        message: '检测到系统 TUN 模式未开启，这可能会影响代理功能。请检查并启用 TUN 模式以确保最佳体验。',
        priority: 1
    });
}

// 使用全局变量替代 window 对象
let hasTunModeListener = false;

// 修改 TUN 模式检查函数
async function checkTunModeAndNotify() {
    const isTunEnabled = await checkTunMode();
    
    // 获取当前代理状态
    chrome.storage.local.get(['proxyState'], function(result) {
        if (result.proxyState?.enabled && !isTunEnabled) {
            showTunModeNotification();
        }
    });
    
    return isTunEnabled;
}

// 优化后的 TUN 模式检查启动函数
function startTunModeCheck() {
    // 初始检查
    checkTunModeAndNotify();
    
    // 只添加一次窗口焦点监听
    if (!hasTunModeListener) {
        chrome.windows.onFocusChanged.addListener((windowId) => {
            if (windowId !== chrome.windows.WINDOW_ID_NONE) {
                checkTunModeAndNotify();
            }
        });
        hasTunModeListener = true;
    }
}

// 移除重复的事件监听
chrome.windows.onFocusChanged.removeListener((windowId) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        checkTunModeAndNotify();
    }
});

// 添加系统检测
const isMac = navigator.userAgentData?.platform === 'macOS' || 
              /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

// 首次安装时的提示
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === "install") {
        if (isMac) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: '欢迎使用 IP代理助手',
                message: 'Mac用户请注意：首次使用时可能需要在系统偏好设置中允许代理更改。'
            });
        }
    }
});

// 添加统一的错误提示函数
function showErrorNotification(message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: '代理设置提示',
        message: message
    });
}

// 添加代理连接超时检测
function checkProxyConnection(proxyIp) {
    return new Promise((resolve) => {
        const timeoutDuration = 10000; // 10秒超时
        const timeout = setTimeout(() => {
            resolve(false);
        }, timeoutDuration);

        fetch('http://www.google.com', {
            mode: 'no-cors',
            cache: 'no-cache'
        }).then(() => {
            clearTimeout(timeout);
            resolve(true);
        }).catch(() => {
            clearTimeout(timeout);
            resolve(false);
        });
    });
}

// 优化代理设置函数
function applyProxySettings(proxyIp) {
    chrome.storage.local.get(['proxyConfigs'], function(result) {
        const config = result.proxyConfigs?.find(c => c.ip === proxyIp);
        if (!config) {
            console.debug('未找到代理配置:', proxyIp);
            return;
        }

        // 先设置认证
        const authSuccess = setupAuthentication(proxyIp, result.proxyConfigs);
        if (!authSuccess && config.username && config.password) {
            console.debug('认证设置失败');
            showErrorNotification('代理认证设置失败，请检查配置');
            return;
        }

        const proxyConfig = {
            mode: "fixed_servers",
            rules: {
                singleProxy: {
                    scheme: config.protocol.toLowerCase(),
                    host: config.ip,
                    port: parseInt(config.port)
                },
                bypassList: isMac ? 
                    ["localhost", "127.0.0.1", "*.local"] : 
                    ["localhost", "127.0.0.1"]
            }
        };

        // 设置代理
        chrome.proxy.settings.set(
            { value: proxyConfig, scope: 'regular' },
            function() {
                if (chrome.runtime.lastError) {
                    console.debug('代理设置失败:', chrome.runtime.lastError);
                    clearAuthenticationState();
                    if (isMac) {
                        showErrorNotification('代理设置失败，请检查系统网络设置');
                    } else {
                        showErrorNotification('代理设置失败，请检查网络连接');
                    }
                } else {
                    console.debug('代理设置成功:', proxyIp);
                    // 验证代理连接
                    checkProxyConnection(proxyIp).then(isConnected => {
                        if (!isConnected) {
                            showErrorNotification('代理连接失败，请检查网络或配置');
                            clearProxySettings();
                        }
                    });
                }
            }
        );
    });
}

// 优化清除代理设置函数
function clearProxySettings() {
    clearAuthenticationState();
    console.debug('认证信息已清除');

    chrome.proxy.settings.clear(
        { scope: 'regular' },
        function() {
            if (chrome.runtime.lastError) {
                console.debug('清除代理设置失败:', chrome.runtime.lastError);
            } else {
                console.debug('代理设置已清除');
            }
        }
    );
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "setProxy") {
        applyProxySettings(request.proxyIp);
        sendResponse({ success: true });
    } else if (request.action === "clearProxy") {
        clearProxySettings();
        sendResponse({ success: true });
    }
});

// 修改设置图标状态的函数
function setBadgeEnabled(proxyIp) {
    chrome.storage.local.get(['proxyConfigs'], function(result) {
        const config = result.proxyConfigs?.find(c => c.ip === proxyIp);
        if (config && config.name) {
            let badgeText = config.name;
            // 如果是中文，最多显示2个字符
            if (/[\u4e00-\u9fa5]/.test(badgeText)) {
                badgeText = badgeText.substring(0, 2);
            } else {
                // 如果是数字或英文，最多显示4个字符
                badgeText = badgeText.substring(0, 4);
            }
            chrome.action.setBadgeText({ text: badgeText });
        }
    });
}

// 添加浏览器版本检查
function checkBrowserCompatibility() {
    const userAgent = navigator.userAgent;
    const chromeVersion = userAgent.match(/Chrome\/([0-9.]+)/);
    
    if (chromeVersion && chromeVersion[1]) {
        const version = parseFloat(chromeVersion[1]);
        if (version < 88) {  // 设置一个最低版本要求
            console.warn('当前 Chrome 版本可能过低，建议升级到最新版本');
            // 可以选择显示通知给用户
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: '浏览器版本提示',
                message: '建议将 Chrome 浏览器升级到最新版本，以确保最佳使用体验。',
                priority: 1
            });
        }
    }
}

// Mac 系统代理检查设置
function setupMacProxyCheck() {
    if (!isMac) return;
    
    chrome.alarms.create('checkMacProxy', { periodInMinutes: 5 });
    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'checkMacProxy') {
            checkMacProxySettings();
        }
    });
}

// 添加 Mac 代理检查函数
function checkMacProxySettings() {
    chrome.storage.local.get(['proxyState'], function(result) {
        if (result.proxyState?.enabled) {
            chrome.proxy.settings.get({}, function(config) {
                if (!config.value || config.value.mode !== 'fixed_servers') {
                    showErrorNotification('系统代理设置可能已被更改，请检查系统网络设置。');
                }
            });
        }
    });
} 