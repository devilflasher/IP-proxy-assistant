// NoBiggie Proxy Extension - Background Service Worker
// 实现Manifest V3标准的代理功能

// 监听插件安装或更新事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('NoBiggie Proxy Extension installed/updated');
  // 初始化时关闭代理
  turnOffProxy();
});

// 浏览器启动时恢复之前的代理设置
chrome.runtime.onStartup.addListener(() => {
  console.log('Chrome started, checking for saved proxy settings');
  chrome.storage.local.get(['currentProxy', 'proxyEnabled'], (result) => {
    if (result.proxyEnabled && result.currentProxy) {
      console.log('Restoring saved proxy settings');
      applyProxySettings(result.currentProxy);
    } else {
      // 确保角标被清除
      clearBadge();
    }
  });
});

// 全局变量存储当前代理认证信息
let currentProxyAuth = {
  username: '',
  password: ''
};

// 预连接测试URL列表 - 用于预热代理连接
const TEST_URLS = [
  'https://www.google.com/favicon.ico',
  'https://www.twitter.com/favicon.ico',
  'https://www.example.com/favicon.ico'
];

// 设置扩展图标角标，显示当前代理名称
function setBadgeWithProxyName(proxyName) {
  if (!proxyName) {
    console.log("No proxy name provided, not setting badge");
    return;
  }
  
  // 设置角标文本（代理名称）
  chrome.action.setBadgeText({ text: proxyName });
  
  // 设置角标背景色为白色
  chrome.action.setBadgeBackgroundColor({ color: "#FFFFFF" });
  
  // 设置角标文本颜色为黑色
  chrome.action.setBadgeTextColor({ color: "#000000" });
  
  console.log(`Badge set with proxy name: ${proxyName}`);
}

// 清除扩展图标角标
function clearBadge() {
  chrome.action.setBadgeText({ text: "" });
  console.log("Badge cleared");
}

// 处理不同类型的代理设置
function applyProxySettings(proxyInfo) {
  if (!proxyInfo) {
    console.error("No proxy info provided, turning off proxy");
    turnOffProxy();
    return;
  }

  const type = proxyInfo.select || proxyInfo.type;
  const ip = proxyInfo.Proxy_ip || proxyInfo.ip;
  const port = proxyInfo.Port || proxyInfo.port;
  const username = proxyInfo.Username || proxyInfo.username;
  const password = proxyInfo.Password || proxyInfo.password;
  const proxyName = proxyInfo.Enter_name || proxyInfo.name || "";

  console.log("Proxy info received:", JSON.stringify({
    type: type,
    ip: ip,
    port: port,
    hasUsername: !!username,
    hasPassword: !!password,
    name: proxyName
  }));

  if (!type || !ip || !port) {
    console.error("Missing required proxy information");
    console.error("Type:", type);
    console.error("IP:", ip);
    console.error("Port:", port);
    return;
  }

  // 验证代理类型
  const validTypes = ["http", "https", "socks", "socks4", "socks5"];
  let proxyScheme = type.toLowerCase();
  
  if (!validTypes.includes(proxyScheme)) {
    console.error("Invalid proxy type:", proxyScheme);
    console.log("Defaulting to http proxy");
    proxyScheme = "http";
  }

  // 验证端口
  let portNumber = parseInt(port);
  if (isNaN(portNumber) || portNumber <= 0 || portNumber > 65535) {
    console.error("Invalid port number:", port);
    return;
  }

  console.log(`Applying proxy settings: ${proxyScheme} ${ip}:${portNumber}`);

  // 保存认证信息到全局变量，用于直接访问
  currentProxyAuth = {
    username: username || '',
    password: password || ''
  };

  // 保存当前代理信息到本地存储，用于恢复
  chrome.storage.local.set({
    currentProxy: {
      type: type,
      ip: ip,
      port: port,
      username: username,
      password: password,
      name: proxyName
    },
    proxyEnabled: true
  });

  // 设置扩展图标角标，显示当前代理名称
  setBadgeWithProxyName(proxyName);

  // 先设置认证监听器，确保在代理设置应用前已准备好处理认证请求
  setupAuthListener();

  // 根据代理类型设置不同的配置
  const config = {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: proxyScheme,
        host: ip,
        port: portNumber
      },
      bypassList: ["localhost", "127.0.0.1", "<local>"]
    }
  };

  // 设置代理配置
  chrome.proxy.settings.set(
    { value: config, scope: "regular" },
    () => {
      if (chrome.runtime.lastError) {
        console.error("Error setting proxy:", chrome.runtime.lastError);
        clearBadge();
        return;
      }
      
      console.log(`${type} proxy enabled`);
      
      // 验证代理设置是否成功应用
      chrome.proxy.settings.get({}, (details) => {
        console.log("Current proxy settings:", JSON.stringify(details));
        
        // 预热代理连接，避免后续访问时弹出认证窗口
        preconnectToTestUrls();
      });
    }
  );
}

// 预热代理连接，避免后续访问时弹出认证窗口
function preconnectToTestUrls() {
  console.log("Preconnecting to test URLs to warm up proxy connection");
  
  // 创建一个隐藏的iframe来加载测试URL
  TEST_URLS.forEach(url => {
    fetch(url, { 
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store'
    }).catch(err => {
      // 忽略错误，这只是为了预热连接
      console.log(`Preconnect to ${url} completed (errors are expected)`);
    });
  });
}

// 设置认证监听器
function setupAuthListener() {
  // 先移除之前的认证监听器
  try {
    chrome.webRequest.onAuthRequired.removeListener(handleAuthRequest);
  } catch (e) {
    console.log("No previous auth listener to remove");
  }

  // 添加新的认证监听器 - 在Manifest V3中使用asyncBlocking
  chrome.webRequest.onAuthRequired.addListener(
    handleAuthRequest,
    { urls: ["<all_urls>"] },
    ["asyncBlocking"]
  );

  console.log("Auth listener set up with asyncBlocking");
}

// 认证回调函数 - 使用回调方式处理认证请求
function handleAuthRequest(details, callback) {
  console.log("Auth request received for: " + details.url);
  
  // 只处理代理认证请求
  if (details.isProxy) {
    console.log("Handling proxy auth request");
    
    if (currentProxyAuth.username && currentProxyAuth.password) {
      console.log("Providing auth credentials for: " + currentProxyAuth.username);
      
      // 使用setTimeout确保回调在事件循环的下一个周期执行
      // 这有助于避免某些情况下的认证窗口闪现
      setTimeout(() => {
        callback({
          authCredentials: {
            username: currentProxyAuth.username,
            password: currentProxyAuth.password
          }
        });
      }, 0);
    } else {
      // 如果没有认证信息，尝试从存储中获取
      chrome.storage.local.get(['currentProxy'], (result) => {
        if (result.currentProxy && 
            result.currentProxy.username && 
            result.currentProxy.password) {
          
          // 更新全局变量
          currentProxyAuth.username = result.currentProxy.username;
          currentProxyAuth.password = result.currentProxy.password;
          
          console.log("Retrieved auth credentials from storage");
          
          setTimeout(() => {
            callback({
              authCredentials: {
                username: result.currentProxy.username,
                password: result.currentProxy.password
              }
            });
          }, 0);
        } else {
          console.log("No auth credentials available");
          callback({cancel: false});
        }
      });
    }
  } else {
    console.log("Not a proxy auth request");
    callback({cancel: false});
  }
}

// 关闭代理
function turnOffProxy() {
  const config = {
    mode: "system"
  };

  // 清除认证信息
  currentProxyAuth = {
    username: '',
    password: ''
  };

  // 标记代理为已禁用
  chrome.storage.local.set({proxyEnabled: false});

  // 清除扩展图标角标
  clearBadge();

  // 移除认证监听器
  try {
    chrome.webRequest.onAuthRequired.removeListener(handleAuthRequest);
  } catch (e) {
    console.log("No auth listener to remove");
  }

  chrome.proxy.settings.set(
    { value: config, scope: "regular" },
    () => {
      console.log("Proxy turned off");
    }
  );
}

// 监听来自popup或设置页面的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received:", message.action);
  
  try {
    if (message.action === "applyProxy") {
      if (!message.proxyInfo) {
        console.error("No proxy info in message");
        sendResponse({ success: false, error: "No proxy info provided" });
        return true;
      }
      
      applyProxySettings(message.proxyInfo);
      sendResponse({ success: true });
    } else if (message.action === "turnOffProxy") {
      turnOffProxy();
      sendResponse({ success: true });
    } else if (message.action === "getProxyStatus") {
      chrome.storage.local.get(['proxyEnabled', 'currentProxy'], (result) => {
        sendResponse({ 
          enabled: result.proxyEnabled || false,
          proxyInfo: result.currentProxy || null
        });
      });
      return true; // 保持消息通道开放以进行异步响应
    } else {
      console.warn("Unknown action:", message.action);
      sendResponse({ success: false, error: "Unknown action" });
    }
  } catch (error) {
    console.error("Error handling message:", error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true;
});
