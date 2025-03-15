// 设置按钮点击事件
$(".filter").on("click", function () {
    window.open("./proxy_set.html");
});

$(".add_btn").on("click", function () {
    window.open("./proxy_set.html");
});

// 在页面加载时检查代理状态
document.addEventListener('DOMContentLoaded', function() {
    // 获取代理列表
    chrome.storage.sync.get({ list: [] }, function (items) {
        list = items.list || [];
        
        // 检查当前代理状态
        chrome.runtime.sendMessage(
            { action: "getProxyStatus" },
            function(response) {
                console.log("Current proxy status:", response);
                
                if (response && response.enabled && response.proxyInfo) {
                    // 如果代理已启用，找到对应的代理并标记为开启
                    const activeProxy = response.proxyInfo;
                    let found = false;
                    
                    for (let i = 0; i < list.length; i++) {
                        if (list[i].Proxy_ip === activeProxy.ip && 
                            list[i].Port === activeProxy.port) {
                            list[i].open = 1;
                            found = true;
                            
                            // 保存更新后的列表
                            chrome.storage.sync.set({ list: list }, function () {
                                initializeUI();
                            });
                            break;
                        }
                    }
                    
                    if (!found) {
                        initializeUI();
                    }
                } else {
                    initializeUI();
                }
            }
        );
    });
});

var list = [];

// 初始化UI
function initializeUI() {
    if (list.length == 0) {
        $(".init_box").show();
        $(".set_box").hide();
    } else {
        $(".init_box").hide();
        $(".set_box").show();
        list_init();
    }
}

function list_init() {
    var len = 0;
    var html = "";
    for (var i = 0; i < list.length; i++) {
        var info = list[i];
        if (info.Proxy_ip != "" && info.Port != "") {
            html += `<div class="set_box_user_box ${info.open == 1 ? "bg1" : "bg2"}">
            <div>
              <div class="name_txt">${info.Enter_name}</div>
              <div class="ip_txt">${info.Proxy_ip + ':' + info.Port}</div>
            </div>
    
            <label class="switch">
                <input type="checkbox" class="proxy-toggle" data-index="${i}" ${info.open == 1 ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
          </div>`;
            len++;

            if (info.open == 1) {
                view_open(list[i]);
            }
        }
    }
    $(".set_box_user_list").html(html);
    connect_toggle_click();
    if (len == 0) {
        $(".init_box").show();
        $(".set_box").hide();
    }
}

function connect_toggle_click() {
    $(".proxy-toggle").on("change", function() {
        var i = $(this).data("index");
        var isChecked = $(this).prop("checked");
        
        if (isChecked) {
            // 连接代理
            var ip = list[i].Proxy_ip + ":" + list[i].Port;
            console.log("Attempting to connect to proxy:", ip);
            console.log("Proxy details:", JSON.stringify(list[i]));
            
            // 确保代理名称可用于角标显示
            var proxyName = list[i].Enter_name || "";
            console.log("Proxy name for badge:", proxyName);
            
            chrome.storage.sync.set({ ip_info: list[i] }, function () {
                if (chrome.runtime.lastError) {
                    console.error("Error saving proxy info:", chrome.runtime.lastError);
                }
            });
            
            chrome.runtime.sendMessage(
                { action: "applyProxy", proxyInfo: list[i] },
                function(response) {
                    console.log("Proxy applied response:", response);
                    if (response && response.success) {
                        list_close();
                        list[i].open = 1;
                        chrome.storage.sync.set({ list: list }, function () {
                            if (chrome.runtime.lastError) {
                                console.error("Error saving list:", chrome.runtime.lastError);
                            }
                            list_init();
                        });
                    } else {
                        console.error("Failed to apply proxy:", response);
                        // 如果连接失败，将开关切回关闭状态
                        $(this).prop("checked", false);
                    }
                }
            );
        } else {
            // 断开代理
            console.log("Attempting to disconnect proxy");
            chrome.runtime.sendMessage(
                { action: "turnOffProxy" },
                function(response) {
                    console.log("Proxy turned off response:", response);
                    if (response && response.success) {
                        list_close();
                        view_close();
                    } else {
                        console.error("Failed to turn off proxy:", response);
                        // 如果断开失败，将开关切回打开状态
                        $(this).prop("checked", true);
                    }
                }
            );
        }
    });
}

function view_open(info) {
    $(".open_1").hide();
    $(".open_user").text(info.Enter_name);
    var ip = info.Proxy_ip + ":" + info.Port;
    $(".open_ip").text(ip);
    $(".open_2").show();
}

function view_close() {
    $(".open_1").show();
    $(".open_2").hide();
    list_init();
}

function list_close() {
    for (var i = 0; i < list.length; i++) {
        list[i].open = 0;
    }
    chrome.storage.sync.set({ list: list }, function () { });
}

$(".nobiggie").on("click", function () {
    window.open("https://www.nobiggie.com/");
});

// 断开连接按钮点击处理 - 使用更具体的选择器
$(".button-container .button").on("click", function () {
    chrome.runtime.sendMessage(
        { action: "turnOffProxy" },
        function(response) {
            console.log("Proxy turned off:", response);
            if (response && response.success) {
                list_close();
                view_close();
            }
        }
    );
});

// 添加社区链接点击事件
$(".hover-me").on("click", function(e) {
    e.preventDefault();
    chrome.tabs.create({ url: "https://discord.com/invite/RMsffEx277" });
});

// 添加 X 按钮点击事件 - 阻止冒泡并防止触发其他按钮行为
$(".button.x").on("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation(); // 阻止同一元素上其他事件处理函数的执行
    console.log("X按钮被点击，即将打开Twitter页面");
    chrome.tabs.create({ url: "https://x.com/DevilflasherX" });
    return false; // 彻底阻止默认行为和事件冒泡
});


