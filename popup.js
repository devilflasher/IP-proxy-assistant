document.addEventListener('DOMContentLoaded', function() {
    const settingsBtn = document.getElementById('settingsBtn');
    const ipSelect = document.querySelector('.ip-select');
    const toggle = document.querySelector('.toggle');

    // 加载代理配置到下拉菜单
    loadProxyConfigs();
    // 加载上次的代理状态
    loadProxyState();
    // 初始化 IP 选择处理
    handleIpSelect();

    // 打开设置页面
    settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
        window.close();
    });

    // 处理代理开关
    toggle.addEventListener('change', function() {
        const selectedProxy = ipSelect.value;
        
        // 如果没有选择代理或选择了默认选项，阻止开启
        if (this.checked && (!selectedProxy || selectedProxy === '')) {
            this.checked = false;
            alert('请选择一个代理服务器');  // 添加提示
            return;
        }

        // 先更新UI状态
        if (this.checked) {
            updateStatus(selectedProxy, '正在连接...');
        } else {
            updateStatus('正在断开...', '断开中');
        }

        if (this.checked && selectedProxy) {
            enableProxy(selectedProxy);
        } else {
            disableProxy();
        }
        // 保存代理状态
        saveProxyState(this.checked, selectedProxy);
    });

    // 监听IP选择变化
    ipSelect.addEventListener('change', function() {
        // 如果选择了默认选项，不执行任何操作
        if (!this.value) {
            return;
        }

        if (toggle.checked) {
            updateStatus(this.value, '正在切换...');
            enableProxy(this.value);
            saveProxyState(true, this.value);
        }
    });

    // 如果是 Mac 系统，添加系统设置提示
    if (isMac) {
        const statusSection = document.querySelector('.status-section');
        if (statusSection) {
            const macTip = document.createElement('div');
            macTip.className = 'status-item mac-tip';
            macTip.innerHTML = `
                <span>系统提示:</span>
                <span>Mac用户请确保已在系统偏好设置中允许代理更改</span>
            `;
            statusSection.appendChild(macTip);
        }
    }
});

function loadProxyConfigs() {
    const ipSelect = document.querySelector('.ip-select');
    const toggle = document.querySelector('.toggle');  // 获取开关按钮

    chrome.storage.local.get(['proxyConfigs'], function(result) {
        // 清空并添加默认选项
        ipSelect.innerHTML = '<option value="">请选择代理服务器</option>';  // 修改默认文本
        
        // 检查是否有代理配置
        if (result.proxyConfigs && result.proxyConfigs.length > 0) {
            result.proxyConfigs.forEach(config => {
                const option = document.createElement('option');
                option.value = config.ip;
                option.textContent = `${config.name}: ${config.ip}`;
                ipSelect.appendChild(option);
            });
            // 启用开关按钮
            toggle.disabled = false;
        } else {
            // 如果没有配置，禁用开关按钮
            toggle.disabled = true;
            // 修改提示文本
            ipSelect.innerHTML = '<option value="">请先添加代理配置</option>';
        }

        // 限制下拉菜单高度，显示滚动条
        ipSelect.style.maxHeight = '200px';
        ipSelect.style.overflowY = 'auto';
    });
}

function loadProxyState() {
    const toggle = document.querySelector('.toggle');
    const ipSelect = document.querySelector('.ip-select');

    chrome.storage.local.get(['proxyState'], function(result) {
        if (result.proxyState) {
            toggle.checked = result.proxyState.enabled;
            if (result.proxyState.ip) {
                ipSelect.value = result.proxyState.ip;
                // 如果是启用状态，立即更新UI
                if (result.proxyState.enabled) {
                    updateStatus(result.proxyState.ip, '已连接', true);
                } else {
                    checkAndUpdateStatus(false);
                }
            }
        } else {
            toggle.checked = false;
            checkAndUpdateStatus(false);
        }
    });
}

function saveProxyState(enabled, ip) {
    chrome.storage.local.set({
        proxyState: {
            enabled: enabled,
            ip: ip
        }
    });

    // 设置图标状态
    if (enabled) {
        chrome.action.setBadgeText({ text: 'ON' });  // 显示 ON
        chrome.action.setBadgeBackgroundColor({ color: '#1a1a1a' });  // 深色背景
        chrome.action.setBadgeTextColor({ color: '#ffffff' });  // 白色文字
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

function enableProxy(proxyIp) {
    chrome.storage.local.get(['proxyConfigs'], function(result) {
        const config = result.proxyConfigs.find(c => c.ip === proxyIp);
        if (config) {
            updateStatus(config.ip, '正在连接...');
            
            // 保存代理状态
            chrome.storage.local.set({
                proxyState: {
                    enabled: true,
                    ip: config.ip
                }
            }, function() {
                // 延迟检查状态
                setTimeout(() => checkAndUpdateStatus(true), 1000);
            });
        }
    });
}

function disableProxy() {
    chrome.storage.local.set({
        proxyState: {
            enabled: false,
            ip: null
        }
    }, function() {
        // 立即更新状态显示
        checkAndUpdateStatus(false);
    });
}

function updateStatus(ip, status, isConnected) {
    const ipElement = document.querySelector('.ip-value');
    const statusElement = document.querySelector('.status-value');
    
    // 设置IP显示
    if (ipElement) {
        ipElement.textContent = ip;
        ipElement.style.fontWeight = 'bold';
        // 防止显示 [object Object]
        if (ip === '[object Object]') {
            ipElement.textContent = '未知';
        }
    }
    
    // 设置状态显示
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = 'status-value ' + (isConnected ? 'connected' : 'disconnected');
    }
}

function checkAndUpdateStatus(isEnabled) {
    try {
        if (!isEnabled) {
            // 获取本地 IP 和位置信息
            fetch('http://ip-api.com/json/?lang=zh-CN')
                .then(response => response.json())
                .then(data => {
                    const ipText = data.query || '未知';
                    const location = data.country || data.regionName || '';
                    const displayText = location ? `${ipText} (${location})` : ipText;
                    updateStatus(displayText, '未连接', false);
                })
                .catch(() => {
                    updateStatus('未知 (系统直连)', '未连接', false);
                });
            return;
        }

        // 检查代理连接
        const selectedProxy = document.querySelector('.ip-select')?.value;
        if (selectedProxy) {
            chrome.storage.local.get(['proxyConfigs'], function(result) {
                const config = result.proxyConfigs?.find(c => c.ip === selectedProxy);
                if (config) {
                    // 获取代理 IP 的地理位置
                    fetch(`http://ip-api.com/json/${config.ip}?lang=zh-CN`)
                        .then(response => response.json())
                        .then(data => {
                            const location = data.country || data.regionName || '';
                            const displayText = location ? `${config.ip} (${location})` : config.ip;
                            updateStatus(displayText, '已连接', true);
                        })
                        .catch(() => {
                            updateStatus(config.ip, '已连接', true);
                        });
                }
            });
        }
    } catch (e) {
        console.debug('状态更新出现异常:', e);
    }
}

// 只在状态变化时检查，不需要定期轮询

// 初始加载时也更新状态
document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.querySelector('.toggle');
    // 检查当前的代理设置
    chrome.proxy.settings.get(
        {incognito: false},
        function(config) {
            const isProxyEnabled = config.value && config.value.mode === "fixed_servers";
            toggle.checked = isProxyEnabled;
            checkAndUpdateStatus(isProxyEnabled);
        }
    );
});

// 替换原有的错误处理
window.onerror = function(msg, url, line) {
    // 使用 console.debug 代替 console.error，这样不会在插件管理界面显示
    console.debug(`Debug: ${msg} at ${url}:${line}`);
    return true;  // 返回 true 表示错误已处理
};

// 添加 MAC 系统的 Command 键支持
document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'w') {  // Command/Ctrl + W
        window.close();
    }
});

// 添加系统检测
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

// 修改 IP 选择处理函数
function handleIpSelect() {
    const ipSelect = document.querySelector('.ip-select');
    const toggle = document.querySelector('.toggle');

    ipSelect.addEventListener('change', function() {
        if (this.value) {
            // 如果是 Mac 系统，添加提示
            if (isMac) {
                const currentStatus = document.querySelector('.status-value');
                if (currentStatus) {
                    currentStatus.textContent = '请确保系统代理设置已允许';
                }
            }
        }
    });
} 