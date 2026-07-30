var utils = globalThis.ProxyUtils;
var save = true;
var list = [];
var del_index = -1;

$("html").on("click", function () {
    $(".lh-select-op").hide();
});

chrome.storage.local.get({ list: [] }, function (items) {
    list = Array.isArray(items.list) ? items.list.map(utils.normalizeProxy) : [];
    list_init();
});

$(".add_proxy_btn").on("click", function () {
    list.push(utils.normalizeProxy({ select: "HTTP" }));
    save = false;
    save_btn_set();
    list_init();
});

$(".save_btn").on("click", function () {
    if (save) {
        return;
    }

    var errors = [];
    var normalized = [];
    list.forEach(function (proxy, index) {
        var validation = utils.validateProxy(proxy);
        if (!validation.ok) {
            errors.push(`第 ${index + 1} 条：${validation.errors.join("；")}`);
        }
        normalized.push(validation.proxy);
    });

    if (errors.length) {
        alert(errors.join("\n"));
        return;
    }

    list = normalized;
    chrome.storage.local.set({ list: list }, function () {
        if (chrome.runtime.lastError) {
            alert(`保存失败：${chrome.runtime.lastError.message}`);
            return;
        }
        save = true;
        save_btn_set();
        $(".su_tip").stop(true, true).fadeIn(200).delay(1200).fadeOut(300);
    });
});

function list_init() {
    var html = "";
    for (var i = 0; i < list.length; i++) {
        var info = utils.normalizeProxy(list[i]);
        list[i] = info;
        var socksAuthHint = info.select === "SOCKS4" || info.select === "SOCKS5"
            ? "Chrome 不支持 SOCKS 用户名密码认证"
            : "Username";

        html += `<div class="flex list_a">
        <div class="flex">
            <div class="el-icon-s-unfold"></div>
            <input data-index="${i}" class="Enter_name" type="text" placeholder="代理名称" value="${utils.escapeHtml(info.Enter_name)}">
        </div>

        <div class="flex">
            <div class="lh-select">
                <div class="lh-select_k">
                    <span class="lh-select-val" data-index="${i}">${utils.escapeHtml(info.select || "HTTP")}</span>
                    <span class="iconfont"></span>
                </div>
                <ul class="lh-select-op">
                    <li data-index="HTTP">HTTP</li>
                    <li data-index="HTTPS">HTTPS</li>
                    <li data-index="SOCKS4">SOCKS4</li>
                    <li data-index="SOCKS5">SOCKS5</li>
                </ul>
            </div>
            <input data-index="${i}" class="Proxy_ip" type="text" placeholder="服务器地址或完整代理链接" value="${utils.escapeHtml(info.Proxy_ip)}">
            <input data-index="${i}" class="Port" type="text" inputmode="numeric" placeholder="端口" value="${utils.escapeHtml(info.Port)}">
        </div>

        <div class="flex">
            <input data-index="${i}" class="Username" type="text" autocomplete="off" placeholder="${socksAuthHint}" title="${socksAuthHint}" value="${utils.escapeHtml(info.Username)}">
            <input data-index="${i}" class="Password" type="${info.is_show === 0 ? "password" : "text"}" autocomplete="new-password" placeholder="Password" value="${utils.escapeHtml(info.Password)}">
            <label class="container eye-toggle" data-index="${i}" title="显示或隐藏密码">
              <input type="checkbox" ${info.is_show === 1 ? "checked" : ""}>
              <svg class="eye" xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 576 512"><path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z"></path></svg>
              <svg class="eye-slash" xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 640 512"><path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1zM223.1 149.5C248.6 126.2 282.7 112 320 112c79.5 0 144 64.5 144 144c0 24.9-6.3 48.3-17.4 68.7L408 294.5c8.4-19.3 10.6-41.4 4.8-63.3c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3c0 10.2-2.4 19.8-6.6 28.3l-90.3-70.8zM373 389.9c-16.4 6.5-34.3 10.1-53 10.1c-79.5 0-144-64.5-144-144c0-6.9 .5-13.6 1.4-20.2L83.1 161.5C60.3 191.2 44 220.8 34.5 243.7c-3.3 7.9-3.3 16.7 0 24.6c14.9 35.7 46.2 87.7 93 131.1C174.5 443.2 239.2 480 320 480c47.8 0 89.9-12.9 126.2-32.5L373 389.9z"></path></svg>
            </label>
            <button data-index="${i}" class="bin-button del" title="删除代理" aria-label="删除代理">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 39 7" class="bin-top"><line stroke-width="4" stroke="white" y2="5" x2="39" y1="5"></line><line stroke-width="3" stroke="white" y2="1.5" x2="26.0357" y1="1.5" x1="12"></line></svg>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 33 39" class="bin-bottom"><mask fill="white" id="bin-mask-${i}"><path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z"></path></mask><path mask="url(#bin-mask-${i})" fill="white" d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z"></path><path stroke-width="4" stroke="white" d="M12 6L12 29"></path><path stroke-width="4" stroke="white" d="M21 6V29"></path></svg>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 89 80" class="garbage"><path fill="white" d="M20.5 10.5L37.5 15.5L42.5 11.5L51.5 12.5L68.75 0L72 11.5L79.5 12.5H88.5L87 22L68.75 31.5L75.5066 25L86 26L87 35.5L77.5 48L70.5 49.5L80 50L77.5 71.5L63.5 58.5L53.5 68.5L65.5 70.5L45.5 73L35.5 79.5L28 67L16 63L12 51.5L0 48L16 25L22.5 17L20.5 10.5Z"></path></svg>
            </button>
        </div>
    </div>`;
    }

    $(".list").html(html);
    click_init();
    input_init();
}

function click_init() {
    $(".lh-select_k").off("click").on("click", function (event) {
        event.stopPropagation();
        $(this).next().toggle();
    });

    $(".lh-select-op li").off("click").on("click", function () {
        var index = Number($(this).parent().prev().children(".lh-select-val").data("index"));
        var protocol = String($(this).data("index"));
        list[index].select = protocol;
        list[index].open = 0;
        save = false;
        save_btn_set();
        list_init();
    });
}

function input_init() {
    $(".Enter_name, .Proxy_ip, .Port, .Username, .Password").on("blur", function () {
        updateField(Number($(this).data("index")), $(this).attr("class"), $(this).val());
    });

    $(".Proxy_ip").on("paste", function () {
        var input = this;
        setTimeout(function () {
            applyPastedEndpoint(Number($(input).data("index")), $(input).val());
        }, 0);
    });

    $(".eye-toggle input").on("change", function () {
        var index = Number($(this).parent().data("index"));
        if (!list[index]) {
            return;
        }
        list[index].is_show = $(this).prop("checked") ? 1 : 0;
        $(".Password[data-index='" + index + "']").attr("type", list[index].is_show === 1 ? "text" : "password");
    });

    $(".del").on("click", function () {
        del_index = Number($(this).data("index"));
        if (list[del_index]) {
            $(".del_tip").show();
        }
    });
}

function updateField(index, name, value) {
    if (!list[index] || !["Enter_name", "Proxy_ip", "Port", "Username", "Password"].includes(name)) {
        return;
    }

    list[index][name] = name === "Password" ? value : String(value).trim();
    if (list[index].open === 1) {
        list[index].open = 0;
        chrome.runtime.sendMessage({ action: "turnOffProxy" });
    }
    save = false;
    save_btn_set();
}

function applyPastedEndpoint(index, value) {
    if (!list[index]) {
        return;
    }

    var parsed = utils.parseProxyEndpoint(value);
    if (!parsed.port) {
        return;
    }

    list[index].Proxy_ip = parsed.host;
    list[index].Port = parsed.port;
    if (parsed.scheme && utils.SUPPORTED_SCHEMES.includes(parsed.scheme)) {
        list[index].select = parsed.scheme;
    }
    if (parsed.username || parsed.password) {
        list[index].Username = parsed.username;
        list[index].Password = parsed.password;
    }
    list[index].open = 0;
    save = false;
    save_btn_set();
    list_init();
}

function save_btn_set() {
    $(".save_btn").css("filter", save ? "grayscale(100%)" : "grayscale(0%)");
}

$(".del_tip_close_btn, .del_tip_Cancel_btn").on("click", function () {
    $(".del_tip").hide();
});

$(".del_tip_del_btn").on("click", function () {
    $(".del_tip").hide();
    if (!list[del_index]) {
        return;
    }

    var removeProxy = function () {
        list.splice(del_index, 1);
        save = false;
        save_btn_set();
        list_init();
    };

    if (list[del_index].open === 1) {
        chrome.runtime.sendMessage({ action: "turnOffProxy" }, removeProxy);
    } else {
        removeProxy();
    }
});

$(".su_tip, .del_tip, .import_dialog").hide();

$(".import_btn").on("click", function () {
    $(".import_dialog").show();
    $(".file_info").text("请选择 CSV 文件");
    $("#csv_file").val("");
});

$(".import_dialog_close_btn, .import_dialog_cancel_btn").on("click", function () {
    $(".import_dialog").hide();
});

$("#csv_file").on("change", function (event) {
    var fileName = event.target.files[0] ? event.target.files[0].name : "未选择文件";
    $(".file_info").text("已选择文件: " + fileName);
});

$(".import_dialog_import_btn").on("click", function () {
    var file = document.getElementById("csv_file").files[0];
    if (!file) {
        alert("请先选择 CSV 文件");
        return;
    }

    var reader = new FileReader();
    reader.onload = function (event) {
        processCSV(event.target.result);
    };
    reader.readAsText(file);
});

function processCSV(contents) {
    var lines = String(contents).replace(/^\uFEFF/, "").split(/\r?\n/);
    var imported = [];
    var errors = [];

    lines.forEach(function (line, index) {
        if (!line.trim()) {
            return;
        }

        var values = parseCSVLine(line);
        if (index === 0 && /^(名称|name)$/i.test(String(values[0]).trim())) {
            return;
        }
        if (values.length < 4) {
            errors.push(`第 ${index + 1} 行：至少需要名称、协议、地址和端口`);
            return;
        }

        var validation = utils.validateProxy({
            Enter_name: values[0],
            select: values[1],
            Proxy_ip: values[2],
            Port: values[3],
            Username: values[4] || "",
            Password: values[5] || ""
        });

        if (!validation.ok) {
            errors.push(`第 ${index + 1} 行：${validation.errors.join("；")}`);
            return;
        }
        imported.push(validation.proxy);
    });

    list = list.concat(imported);
    list_init();
    save = false;
    save_btn_set();
    $(".import_dialog").hide();

    var message = `成功导入 ${imported.length} 条代理。`;
    if (errors.length) {
        message += `\n\n${errors.join("\n")}`;
    }
    alert(message);
}

function parseCSVLine(line) {
    var result = [];
    var current = "";
    var inQuotes = false;

    for (var i = 0; i < line.length; i++) {
        var character = line[i];
        if (character === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (character === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += character;
        }
    }

    result.push(current.trim());
    return result;
}
