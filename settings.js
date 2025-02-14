document.addEventListener('DOMContentLoaded', function() {
    const proxyList = document.getElementById('proxyList');
    if (!proxyList) return;  // 如果不在设置页面，直接返回
    
    // 清空表格内容
    proxyList.innerHTML = '';
    
    const addBtn = document.getElementById('addProxy');
    const saveBtn = document.querySelector('.save-btn');
    const closeBtn = document.querySelector('.close-btn');
    if (!addBtn || !saveBtn || !closeBtn) return;  // 确保所有元素都存在

    // 加载已保存的代理配置
    chrome.storage.local.get(['proxyConfigs'], function(result) {
        if (result.proxyConfigs && result.proxyConfigs.length > 0) {
            result.proxyConfigs.forEach(config => addProxyRow(config));
        }
    });

    // 添加新代理行
    addBtn.addEventListener('click', () => {
        addProxyRow();
    });

    // 为代理列表添加事件委托，处理删除按钮点击
    proxyList.addEventListener('click', (e) => {
        // 查找最近的删除按钮
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const row = deleteBtn.closest('tr');
            if (row) {
                row.remove();
                console.debug('删除行成功');
            }
        }
    });

    // 保存配置
    saveBtn.addEventListener('click', () => {
        const configs = [];
        const rows = proxyList.getElementsByTagName('tr');
        
        for (let row of rows) {
            const config = {
                name: row.querySelector('.name').value.trim(),
                protocol: row.querySelector('.protocol').value.trim(),
                ip: row.querySelector('.ip').value.trim(),
                port: row.querySelector('.port').value.trim(),
                username: row.querySelector('.username').value.trim(),
                password: row.querySelector('.password').value.trim()
            };

            // 验证必填字段
            if (!config.ip || !config.port || !config.protocol) {
                alert('请填写必要的代理信息（IP、端口和协议）');
                return;
            }

            // 验证端口号
            if (!/^\d+$/.test(config.port) || parseInt(config.port) <= 0 || parseInt(config.port) > 65535) {
                alert('请输入有效的端口号（1-65535）');
                return;
            }

            configs.push(config);
        }

        if (configs.length > 0) {
            chrome.storage.local.set({ proxyConfigs: configs }, function() {
                alert('配置已保存！');
                window.close();  // 保存成功后关闭窗口
            });
        } else {
            alert('请至少添加一个有效的代理配置');
        }
    });

    // 关闭按钮事件处理
    closeBtn.addEventListener('click', () => {
        try {
            window.close();
        } catch (e) {
            console.warn('关闭窗口失败:', e);
        }
    });

    // 添加导入按钮事件监听
    const importBtn = document.getElementById('importBtn');
    const excelFile = document.getElementById('excelFile');
    
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            excelFile.click();
        });
    }

    if (excelFile) {
        excelFile.addEventListener('change', handleExcelImport);
    }

    // 添加模板下载处理
    const downloadTemplate = document.getElementById('downloadTemplate');
    if (downloadTemplate) {
        downloadTemplate.addEventListener('click', downloadExcelTemplate);
    }
});

function createProxyRow(config = {}) {
    console.debug('创建代理行，配置:', config);
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="name" value="${config.name || ''}" placeholder="序号"></td>
        <td>
            <select class="protocol">
                <option value="http" ${config.protocol === 'http' ? 'selected' : ''}>HTTP</option>
                <option value="https" ${config.protocol === 'https' ? 'selected' : ''}>HTTPS</option>
            </select>
        </td>
        <td><input type="text" class="ip" value="${config.ip || ''}" placeholder="IP地址"></td>
        <td><input type="text" class="username" value="${config.username || ''}" placeholder="用户名"></td>
        <td><input type="password" class="password" value="${config.password || ''}" placeholder="密码"></td>
        <td><input type="number" class="port" value="${config.port || ''}" placeholder="端口"></td>
        <td>
            <button class="delete-btn" title="删除">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </td>
    `;
    return tr;
}

function getProxyConfig(row) {
    return {
        name: row.querySelector('.name').value,
        protocol: row.querySelector('.protocol').value,
        ip: row.querySelector('.ip').value,
        username: row.querySelector('.username').value,
        password: row.querySelector('.password').value,
        port: row.querySelector('.port').value
    };
}

function addProxyRow(config = {}) {
    console.debug('正在添加代理行，配置:', config);
    const proxyList = document.getElementById('proxyList');
    if (!proxyList) {
        console.debug('找不到 proxyList 元素');
        return;
    }

    const row = createProxyRow(config);
    proxyList.appendChild(row);
    console.debug('代理行添加完成');
}

// 处理 Excel 导入
function handleExcelImport(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;

        // 检查文件类型
        if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
            alert('请使用 CSV 或 TXT 格式的文件（可以将 Excel 另存为 CSV 格式）');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                // 读取文件内容
                const content = e.target.result;
                // 按行分割
                const rows = content.split(/\r?\n/).filter(line => line.trim());
                console.debug('读取到的数据:', rows);

                // 解析每行数据
                const parsedData = rows.map(row => {
                    // 支持逗号或制表符分隔
                    const cells = row.includes('\t') ? row.split('\t') : row.split(',');
                    return cells.map(cell => cell.trim());
                });

                // 验证数据格式
                const validData = validateExcelData(parsedData);
                console.debug('验证后的有效数据:', validData);

                if (validData.length > 0) {
                    const proxyList = document.getElementById('proxyList');
                    if (!proxyList) {
                        console.debug('找不到 proxyList 元素');
                        return;
                    }

                    // 修改这里：不清空现有表格，直接追加新数据
                    validData.forEach((config, idx) => {
                        console.debug(`添加第 ${idx + 1} 行数据:`, config);
                        addProxyRow(config);
                    });
                    alert(`成功导入 ${validData.length} 条代理配置`);
                } else {
                    alert('没有找到有效的代理配置，请检查文件格式是否正确');
                }
            } catch (error) {
                console.debug('处理文件时出错:', error, error.stack);
                alert('处理文件时出错，请确保文件格式正确');
            }
        };
        reader.readAsText(file);
    } catch (error) {
        console.debug('导入失败:', error, error.stack);
        alert('导入失败，请稍后重试');
    }
}

// 修改验证函数
function validateExcelData(jsonData) {
    console.debug('验证的数据:', jsonData);

    return jsonData.filter(row => {
        // 确保行数据是数组且包含足够的列
        if (!Array.isArray(row) || row.length < 6) {
            console.debug('行数据无效:', row);
            return false;
        }

        // 转换所有值为字符串并去除空格
        const values = row.map(val => String(val || '').trim());
        const [index, protocol, ip, username, password, port] = values;

        // 验证必填字段
        if (!ip || !port || !protocol) {
            console.debug('必填字段缺失:', { ip, port, protocol });
            return false;
        }

        // 验证端口号
        const portNum = parseInt(port);
        if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
            console.debug('端口号无效:', port);
            return false;
        }

        // 验证协议
        const protocolStr = protocol.toLowerCase();
        if (protocolStr !== 'http' && protocolStr !== 'https') {
            console.debug('协议无效:', protocol);
            return false;
        }

        return true;
    }).map((row, index) => {
        const values = row.map(val => String(val || '').trim());
        return {
            name: values[0] || String(index + 1),
            protocol: values[1].toLowerCase(),
            ip: values[2],
            port: values[5],
            username: values[3] || '',
            password: values[4] || ''
        };
    });
}

// 下载 Excel 模板
function downloadExcelTemplate(event) {
    event.preventDefault();
    
    // 创建模板数据
    const template = [
        {
            序号: '1',
            协议: 'http',
            'IP地址': '192.168.1.1',
            用户名: 'user1',
            密码: 'pass1',
            端口: '8080'
        },
        {
            序号: '2',
            协议: 'https',
            'IP地址': '10.0.0.1',
            用户名: 'user2',
            密码: 'pass2',
            端口: '3128'
        }
    ];

    try {
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(template);
        
        // 设置列宽
        const wscols = [
            {wch: 8},  // 序号
            {wch: 8},  // 协议
            {wch: 15}, // IP地址
            {wch: 12}, // 用户名
            {wch: 12}, // 密码
            {wch: 8}   // 端口
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "代理配置");

        // 下载文件
        XLSX.writeFile(wb, "proxy_template.xlsx");
    } catch (error) {
        console.error('下载模板失败:', error);
        alert('下载模板失败，请稍后重试');
    }
}

// 动态加载外部脚本
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (window.XLSX) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
} 