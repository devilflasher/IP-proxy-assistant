$("html").on("click", function () {
    $(".lh-select-op").hide();
});

click_init();
function click_init() {
    $(".lh-select_k").off();
    $(".lh-select_k").on("click", function () {
        var that = this;
        var display = $(that).next().css('display');
        if (display != 'none') {
            return;
        }
        setTimeout(function () {
            $(that).next().toggle();
        }, 50);
    });
    $(".lh-select-op li").off();
    $(".lh-select-op li").on("click", function () {
        $(this).siblings().removeClass("op_a");
        $(this).addClass("op_a");
        $(".lh-select-op").hide();
        var index = $(this).index();
        console.log("li index::", index);
        var txt = $(this).text();
        $(this).parent().prev().children("span.lh-select-val").text(txt);

        var i = $(this).parent().prev().children("span.lh-select-val").data("index");
        list[i].select = txt;
        save = false;
        save_btn_set()
    });

}
var save = true;
var list = [];
chrome.storage.sync.get({ list: [] }, function (items) {
    list = items.list;
    console.log("list::", list);
    list_init();
});


$(".add_proxy_btn").on("click", function () {
    list.push({
        Enter_name: "",
        select: "HTTP",
        Proxy_ip: "",
        Port: "",
        Username: "",
        Password: "",
        is_show: 0,
        open: 0,
    });
    list_init();
});

$(".su_tip").hide();
$(".save_btn").on("click", function () {
    if (save) {
        return
    }

    for (var i = 0; i < list.length; i++) {
        if (list[i].Enter_name == "") {
            alert("Please enter a name.");
            return
        }
    }

    save = true;
    chrome.storage.sync.set({ list: list }, function () { });
    save_btn_set()

    $(".su_tip").fadeIn("slow");
    $(".su_tip").fadeIn(1000);
    setTimeout(function () {
        $(".su_tip").fadeOut("slow");
        $(".su_tip").fadeOut(1000);
    }, 2000);
});

function list_init() {
    var html = "";
    for (var i = 0; i < list.length; i++) {
        var info = list[i];
        html += `<div class="flex list_a">
        <div class="flex">
            <div class="el-icon-s-unfold"></div>
            <input data-index="${i}" class="Enter_name" type="text" placeholder="Enter name" value="${info.Enter_name}">
        </div>

        <div class="flex">
            <div class="lh-select">
                <div class="lh-select_k">
                    <span class="lh-select-val" data-index="${i}">${info.select}</span>
                    <span class="iconfont"></span>
                </div>
                <ul class="lh-select-op">
                    <li data-index="HTTP">HTTP</li>
                    <li data-index="HTTPS">HTTPS</li>
                    <li data-index="SOCKS5">SOCKS5</li>
                </ul>
            </div>
            <input data-index="${i}" class="Proxy_ip" type="text" placeholder="Proxy server IP" value="${info.Proxy_ip}">
            <input data-index="${i}" class="Port" type="text" placeholder="Port" value="${info.Port}">
        </div>

        <div class="flex">
            <input data-index="${i}" class="Username" type="text" placeholder="Username" value="${info.Username}">
            <input data-index="${i}" class="Password" type="${info.is_show == 0 ? "password" : "text"}" placeholder="Password" value="${info.Password}">
            <label class="container eye-toggle" data-index="${i}">
              <input type="checkbox" ${info.is_show == 1 ? "checked" : ""}>
              <svg class="eye" xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 576 512"><path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z"></path></svg>
              <svg class="eye-slash" xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 640 512"><path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1zM223.1 149.5C248.6 126.2 282.7 112 320 112c79.5 0 144 64.5 144 144c0 24.9-6.3 48.3-17.4 68.7L408 294.5c8.4-19.3 10.6-41.4 4.8-63.3c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3c0 10.2-2.4 19.8-6.6 28.3l-90.3-70.8zM373 389.9c-16.4 6.5-34.3 10.1-53 10.1c-79.5 0-144-64.5-144-144c0-6.9 .5-13.6 1.4-20.2L83.1 161.5C60.3 191.2 44 220.8 34.5 243.7c-3.3 7.9-3.3 16.7 0 24.6c14.9 35.7 46.2 87.7 93 131.1C174.5 443.2 239.2 480 320 480c47.8 0 89.9-12.9 126.2-32.5L373 389.9z"></path></svg>
            </label>
            <button data-index="${i}" class="bin-button del">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 39 7"
                class="bin-top"
              >
                <line stroke-width="4" stroke="white" y2="5" x2="39" y1="5"></line>
                <line
                  stroke-width="3"
                  stroke="white"
                  y2="1.5"
                  x2="26.0357"
                  y1="1.5"
                  x1="12"
                ></line>
              </svg>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 33 39"
                class="bin-bottom"
              >
                <mask fill="white" id="path-1-inside-1_8_19">
                  <path
                    d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z"
                  ></path>
                </mask>
                <path
                  mask="url(#path-1-inside-1_8_19)"
                  fill="white"
                  d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z"
                ></path>
                <path stroke-width="4" stroke="white" d="M12 6L12 29"></path>
                <path stroke-width="4" stroke="white" d="M21 6V29"></path>
              </svg>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 89 80"
                class="garbage"
              >
                <path
                  fill="white"
                  d="M20.5 10.5L37.5 15.5L42.5 11.5L51.5 12.5L68.75 0L72 11.5L79.5 12.5H88.5L87 22L68.75 31.5L75.5066 25L86 26L87 35.5L77.5 48L70.5 49.5L80 50L77.5 71.5L63.5 58.5L53.5 68.5L65.5 70.5L45.5 73L35.5 79.5L28 67L16 63L12 51.5L0 48L16 25L22.5 17L20.5 10.5Z"
                ></path>
              </svg>
            </button>
        </div>
    </div>`;
    }
    $(".list").html(html);

    click_init();
    input_blur_init()

}

function input_blur_init() {
    $("input").on("blur", function () {
        var i = $(this).data("index");
        var val = $(this).val();
        var name = $(this).attr("class");
        
        // 确保 name 是有效的类名，不包含空格
        if (name && name.indexOf(" ") !== -1) {
            name = name.split(" ")[0]; // 获取第一个类名
        }
        
        input_blur(i, name, val);
    });


    $("input").on({
        copy: function () {
        },
        paste: function () {
            var i = $(this).data("index");

            var name = $(this).attr("class");
            console.log(i, name)
            if (name == 'Proxy_ip') {
                var that = this;
                setTimeout(function () {
                    var val = $(that).val();
                    if (val.indexOf(":") != -1) {
                        var txt_arr = val.split(":");
                        console.log("拆分", txt_arr);
                        $(that).val(txt_arr[0]);
                        $(that).next().val(txt_arr[1]);
                        input_blur(i, 'Proxy_ip', txt_arr[0]);
                        input_blur(i, 'Port', txt_arr[1]);
                    }
                }, 100);
            }
        },
        cut: function () {
        }
    });


    $(".eye-toggle input").on("change", function () {
        var i = $(this).parent().data("index");
        
        // 确保索引有效
        if (i !== undefined && list[i]) {
            list[i].is_show = $(this).prop("checked") ? 1 : 0;
            save = false;
            save_btn_set();
            
            // 更新密码输入框的类型
            var passwordInput = $(".Password[data-index='" + i + "']");
            passwordInput.attr("type", list[i].is_show == 1 ? "text" : "password");
        } else {
            console.log("无效的索引:", i);
        }
    });


    $(".del").on("click", function () {
        var index = $(this).data("index");
        
        // 确保索引有效
        if (index !== undefined && list[index]) {
            $(".del_tip").show();
            del_index = index;
        } else {
            console.log("无效的删除索引:", index);
        }
    });

}

function input_blur(i, name, val) {
    // 确保 i 和 name 都是有效的
    if (i !== undefined && name && list[i]) {
        // 检查 name 是否是有效的属性
        var validProperties = ["Enter_name", "Proxy_ip", "Port", "Username", "Password"];
        if (validProperties.includes(name)) {
            list[i][name] = val;
            save = false;
            save_btn_set();
            if (list[i].open == 1) {
                chrome.runtime.sendMessage(
                    { action: "turnOffProxy" },
                    function(response) {
                        console.log("Proxy turned off:", response);
                    }
                );
            }
        } else {
            console.log("无效的属性名:", name);
        }
    } else {
        console.log("无效的索引或属性名:", i, name);
    }
}

function save_btn_set() {
    if (save) {
        $(".save_btn").css("filter", 'grayscale(100%)')
    } else {
        $(".save_btn").css("filter", 'grayscale(0%)')
    }
}

$(".del_tip_close_btn").on("click", function () {
    $(".del_tip").hide();
});

$(".del_tip_close_btn").on("click", function () {
    $(".del_tip").hide();
});

$(".del_tip_Cancel_btn").on("click", function () {
    $(".del_tip").hide();
});


$(".del_tip_del_btn").on("click", function () {
    $(".del_tip").hide();
    
    // 确保索引有效
    if (del_index !== undefined && del_index >= 0 && list[del_index]) {
        if (list[del_index].open == 1) {
            chrome.runtime.sendMessage(
                { action: "turnOffProxy" },
                function(response) {
                    console.log("Proxy turned off:", response);
                }
            );
        }
        list.splice(del_index, 1);
        chrome.storage.sync.set({ list: list }, function () { });
        list_init();
    } else {
        console.log("无效的删除索引:", del_index);
    }
});

$(".del_tip").hide();
$(".import_dialog").hide();

var del_index = -1;

// 批量导入按钮点击事件
$(".import_btn").on("click", function() {
    $(".import_dialog").show();
    $(".file_info").text("请选择 CSV 文件");
    $("#csv_file").val("");
});

// 关闭导入对话框
$(".import_dialog_close_btn, .import_dialog_cancel_btn").on("click", function() {
    $(".import_dialog").hide();
});

// 文件选择变化事件
$("#csv_file").on("change", function(e) {
    var fileName = e.target.files[0]?.name || "未选择文件";
    $(".file_info").text("已选择文件: " + fileName);
});

// 导入按钮点击事件
$(".import_dialog_import_btn").on("click", function() {
    var fileInput = document.getElementById("csv_file");
    var file = fileInput.files[0];
    
    if (!file) {
        alert("请先选择CSV文件");
        return;
    }
    
    var reader = new FileReader();
    reader.onload = function(e) {
        var contents = e.target.result;
        processCSV(contents);
    };
    reader.readAsText(file);
});

// 处理CSV文件内容
function processCSV(contents) {
    var lines = contents.split(/\r\n|\n/);
    var importCount = 0;
    var errorLines = [];
    
    for (var i = 0; i < lines.length; i++) {
        if (!lines[i].trim()) continue; // 跳过空行
        
        var values = parseCSVLine(lines[i]);
        if (values.length < 4) {
            errorLines.push((i + 1) + "行: 数据不完整");
            continue;
        }
        
        var name = values[0] || "";
        var protocol = (values[1] || "").toUpperCase();
        var ip = values[2] || "";
        var port = values[3] || "";
        var username = values[4] || "";
        var password = values[5] || "";
        
        // 验证协议
        if (protocol !== "HTTP" && protocol !== "HTTPS" && protocol !== "SOCKS5") {
            errorLines.push((i + 1) + "行: 协议类型无效，必须是 HTTP、HTTPS 或 SOCKS5");
            continue;
        }
        
        // 验证端口
        if (!/^\d+$/.test(port) || parseInt(port) < 1 || parseInt(port) > 65535) {
            errorLines.push((i + 1) + "行: 端口号无效，必须是 1-65535 之间的数字");
            continue;
        }
        
        // 添加到列表
        list.push({
            Enter_name: name,
            select: protocol,
            Proxy_ip: ip,
            Port: port,
            Username: username,
            Password: password,
            is_show: 0,
            open: 0
        });
        
        importCount++;
    }
    
    if (errorLines.length > 0) {
        alert("导入完成，成功导入 " + importCount + " 条记录，但有以下错误：\n" + errorLines.join("\n"));
    } else {
        alert("导入成功，共导入 " + importCount + " 条记录");
    }
    
    // 刷新列表并关闭对话框
    list_init();
    save = false;
    save_btn_set();
    $(".import_dialog").hide();
}

// 解析CSV行，处理引号等特殊情况
function parseCSVLine(line) {
    var result = [];
    var current = "";
    var inQuotes = false;
    
    for (var i = 0; i < line.length; i++) {
        var char = line[i];
        
        if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    
    result.push(current); // 添加最后一个字段
    return result;
}
