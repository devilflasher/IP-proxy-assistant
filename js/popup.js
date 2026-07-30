var list = [];
var utils = globalThis.ProxyUtils;

$(".filter, .add_btn").on("click", function () {
    window.open("./proxy_set.html");
});

document.addEventListener("DOMContentLoaded", function () {
    chrome.storage.local.get({ list: [] }, function (items) {
        list = Array.isArray(items.list) ? items.list.map(utils.normalizeProxy) : [];

        chrome.runtime.sendMessage({ action: "getProxyStatus" }, function (response) {
            if (chrome.runtime.lastError) {
                showStatus(chrome.runtime.lastError.message, true);
                initializeUI();
                return;
            }

            var activeProxy = response && response.enabled ? response.proxyInfo : null;
            list.forEach(function (proxy) {
                proxy.open = activeProxy && utils.sameProxy(proxy, activeProxy) ? 1 : 0;
            });

            chrome.storage.local.set({ list: list }, function () {
                initializeUI();
            });

            if (response && response.lastError) {
                showStatus(response.lastError.message, true);
            } else if (response && response.enabled) {
                showStatus("代理已配置。实际连通性以网页访问结果为准。", false);
            }
        });
    });
});

function initializeUI() {
    if (list.length === 0) {
        $(".init_box").show();
        $(".set_box").hide();
    } else {
        $(".init_box").hide();
        $(".set_box").show();
        list_init();
    }
}

function list_init() {
    var visibleCount = 0;
    var html = "";

    for (var i = 0; i < list.length; i++) {
        var info = utils.normalizeProxy(list[i]);
        list[i] = info;
        if (!info.Proxy_ip || !info.Port) {
            continue;
        }

        html += `<div class="set_box_user_box ${info.open === 1 ? "bg1" : "bg2"}">
            <div>
              <div class="name_txt">${utils.escapeHtml(info.Enter_name)}</div>
              <div class="ip_txt">${utils.escapeHtml(formatEndpoint(info))}</div>
              <div class="protocol_txt">${utils.escapeHtml(info.select)}</div>
            </div>
            <label class="switch" title="${info.open === 1 ? "关闭代理" : "启用代理"}">
                <input type="checkbox" class="proxy-toggle" data-index="${i}" ${info.open === 1 ? "checked" : ""}>
                <span class="slider"></span>
            </label>
          </div>`;
        visibleCount++;

        if (info.open === 1) {
            view_open(info);
        }
    }

    $(".set_box_user_list").html(html);
    connect_toggle_click();
    if (visibleCount === 0) {
        $(".init_box").show();
        $(".set_box").hide();
    }
}

function formatEndpoint(info) {
    var host = info.Proxy_ip.includes(":") ? `[${info.Proxy_ip}]` : info.Proxy_ip;
    return `${host}:${info.Port}`;
}

function connect_toggle_click() {
    $(".proxy-toggle").on("change", function () {
        var index = Number($(this).data("index"));
        var isChecked = $(this).prop("checked");
        var toggle = $(this);

        if (!list[index]) {
            toggle.prop("checked", false);
            showStatus("代理配置不存在，请刷新后重试。", true);
            return;
        }

        $(".proxy-toggle").prop("disabled", true);
        if (isChecked) {
            enableProxy(index, toggle);
        } else {
            disableProxy(toggle);
        }
    });
}

function enableProxy(index, toggle) {
    var validation = utils.validateProxy(list[index]);
    if (!validation.ok) {
        toggle.prop("checked", false);
        $(".proxy-toggle").prop("disabled", false);
        showStatus(validation.errors.join("；"), true);
        return;
    }

    chrome.runtime.sendMessage(
        { action: "applyProxy", proxyInfo: validation.proxy },
        function (response) {
            $(".proxy-toggle").prop("disabled", false);
            if (chrome.runtime.lastError || !response || !response.success) {
                toggle.prop("checked", false);
                showStatus(
                    chrome.runtime.lastError ? chrome.runtime.lastError.message : (response && response.error) || "代理配置失败",
                    true
                );
                return;
            }

            list.forEach(function (proxy, proxyIndex) {
                proxy.open = proxyIndex === index ? 1 : 0;
            });
            chrome.storage.local.set({ list: list }, function () {
                list_init();
            });
            view_open(list[index]);

            var warning = response.warnings && response.warnings.length
                ? ` ${response.warnings.join("；")}`
                : "";
            showStatus(`代理已配置。实际连通性以网页访问结果为准。${warning}`, false);
        }
    );
}

function disableProxy(toggle) {
    chrome.runtime.sendMessage({ action: "turnOffProxy" }, function (response) {
        $(".proxy-toggle").prop("disabled", false);
        if (chrome.runtime.lastError || !response || !response.success) {
            toggle.prop("checked", true);
            showStatus(
                chrome.runtime.lastError ? chrome.runtime.lastError.message : (response && response.error) || "恢复系统代理失败",
                true
            );
            return;
        }

        list.forEach(function (proxy) {
            proxy.open = 0;
        });
        chrome.storage.local.set({ list: list }, function () {
            view_close();
        });
        showStatus("已恢复 Chrome 的系统代理设置。", false);
    });
}

function view_open(info) {
    $(".open_1").hide();
    $(".open_user").text(info.Enter_name || "未命名代理");
    $(".open_ip").text(`${info.select} ${formatEndpoint(info)}`);
    $(".open_2").show();
}

function view_close() {
    $(".open_1").show();
    $(".open_2").hide();
    list_init();
}

function showStatus(message, isError) {
    var status = $(".proxy_status_message");
    status.text(message || "");
    status.toggleClass("error", Boolean(isError));
    status.toggle(Boolean(message));
}

$(".button-container .button").on("click", function () {
    $(".proxy-toggle").prop("disabled", true);
    disableProxy($(".proxy-toggle:checked"));
});
