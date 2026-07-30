const assert = require("node:assert/strict");
const utils = require("../js/proxy_utils.js");

assert.deepEqual(utils.parseProxyEndpoint("1.2.3.4:8080"), {
    scheme: "",
    host: "1.2.3.4",
    port: "8080",
    username: "",
    password: ""
});

assert.deepEqual(utils.parseProxyEndpoint("http://user:p%40ss@proxy.example.com:3128"), {
    scheme: "HTTP",
    host: "proxy.example.com",
    port: "3128",
    username: "user",
    password: "p@ss"
});

assert.deepEqual(utils.parseProxyEndpoint("1.2.3.4:8000:user:pass"), {
    scheme: "",
    host: "1.2.3.4",
    port: "8000",
    username: "user",
    password: "pass"
});

assert.deepEqual(utils.parseProxyEndpoint("[2001:db8::1]:1080"), {
    scheme: "",
    host: "2001:db8::1",
    port: "1080",
    username: "",
    password: ""
});

assert.equal(utils.validateProxy({
    Enter_name: "HTTP",
    select: "HTTP",
    Proxy_ip: "proxy.example.com",
    Port: "8080",
    Username: "user",
    Password: "pass"
}).ok, true);

assert.equal(utils.validateProxy({
    Enter_name: "SOCKS",
    select: "SOCKS5",
    Proxy_ip: "127.0.0.1",
    Port: "1080",
    Username: "user",
    Password: "pass"
}).ok, false);

assert.equal(utils.validateProxy({
    Enter_name: "Bad",
    select: "HTTP",
    Proxy_ip: "999.1.1.1",
    Port: "70000"
}).ok, false);

assert.equal(utils.escapeHtml('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
assert.equal(utils.sameProxyEndpoint(
    { select: "HTTP", Proxy_ip: "EXAMPLE.COM", Port: 80, Username: "a" },
    { type: "http", ip: "example.com", port: "80", username: "b" }
), true);

console.log("proxy_utils tests passed");
