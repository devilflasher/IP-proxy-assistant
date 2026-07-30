(function (root, factory) {
    var api = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }

    root.ProxyUtils = api;
})(globalThis, function () {
    "use strict";

    var SUPPORTED_SCHEMES = ["HTTP", "HTTPS", "SOCKS4", "SOCKS5"];

    function text(value) {
        return value === undefined || value === null ? "" : String(value).trim();
    }

    function normalizeScheme(value) {
        var scheme = text(value).replace(/:$/, "").toUpperCase();
        return scheme === "SOCKS" ? "SOCKS5" : scheme;
    }

    function decode(value) {
        try {
            return decodeURIComponent(value);
        } catch (error) {
            return value;
        }
    }

    function parseHostPort(value) {
        var input = text(value);
        var bracketedIpv6 = input.match(/^\[([^\]]+)\]:(\d+)$/);

        if (bracketedIpv6) {
            return { host: bracketedIpv6[1], port: bracketedIpv6[2] };
        }

        var separator = input.lastIndexOf(":");
        if (separator <= 0 || input.indexOf(":") !== separator) {
            return { host: input, port: "" };
        }

        return {
            host: input.slice(0, separator),
            port: input.slice(separator + 1)
        };
    }

    function parseProxyEndpoint(value) {
        var input = text(value);
        var result = {
            scheme: "",
            host: "",
            port: "",
            username: "",
            password: ""
        };

        if (!input) {
            return result;
        }

        var schemeMatch = input.match(/^([a-z][a-z0-9+.-]*):\/\//i);
        if (schemeMatch) {
            result.scheme = normalizeScheme(schemeMatch[1]);
            input = input.slice(schemeMatch[0].length);
        }

        var atIndex = input.lastIndexOf("@");
        if (atIndex !== -1) {
            var credentials = input.slice(0, atIndex);
            input = input.slice(atIndex + 1);
            var credentialSeparator = credentials.indexOf(":");
            result.username = decode(credentialSeparator === -1 ? credentials : credentials.slice(0, credentialSeparator));
            result.password = decode(credentialSeparator === -1 ? "" : credentials.slice(credentialSeparator + 1));
        } else {
            var fourPart = input.match(/^([^:\s]+):(\d+):([^:]*):(.*)$/);
            if (fourPart) {
                result.host = fourPart[1];
                result.port = fourPart[2];
                result.username = fourPart[3];
                result.password = fourPart[4];
                return result;
            }
        }

        var hostPort = parseHostPort(input.replace(/\/$/, ""));
        result.host = hostPort.host;
        result.port = hostPort.port;
        return result;
    }

    function normalizeProxy(raw) {
        raw = raw || {};

        return {
            Enter_name: text(raw.Enter_name !== undefined ? raw.Enter_name : raw.name),
            select: normalizeScheme(raw.select !== undefined ? raw.select : raw.type),
            Proxy_ip: text(raw.Proxy_ip !== undefined ? raw.Proxy_ip : raw.ip).replace(/^\[|\]$/g, ""),
            Port: text(raw.Port !== undefined ? raw.Port : raw.port),
            Username: text(raw.Username !== undefined ? raw.Username : raw.username),
            Password: raw.Password !== undefined && raw.Password !== null
                ? String(raw.Password)
                : (raw.password !== undefined && raw.password !== null ? String(raw.password) : ""),
            is_show: Number(raw.is_show) === 1 ? 1 : 0,
            open: Number(raw.open) === 1 ? 1 : 0
        };
    }

    function isValidHost(host) {
        if (!host || /[\s\/@?#]/.test(host) || !/^[\x21-\x7e]+$/.test(host)) {
            return false;
        }

        if (host.includes(":")) {
            return /^[0-9a-f:.]+$/i.test(host);
        }

        if (/^\d+(?:\.\d+){3}$/.test(host)) {
            return host.split(".").every(function (part) {
                return Number(part) >= 0 && Number(part) <= 255;
            });
        }

        return /^[a-z0-9._-]+$/i.test(host);
    }

    function validateProxy(raw, options) {
        var proxy = normalizeProxy(raw);
        var errors = [];
        var warnings = [];
        var requireName = !options || options.requireName !== false;
        var portNumber = Number(proxy.Port);

        if (requireName && !proxy.Enter_name) {
            errors.push("请输入代理名称");
        }

        if (!SUPPORTED_SCHEMES.includes(proxy.select)) {
            errors.push("代理协议必须是 HTTP、HTTPS、SOCKS4 或 SOCKS5");
        }

        if (!isValidHost(proxy.Proxy_ip)) {
            errors.push("代理服务器地址无效；IPv6 地址请使用 [地址]:端口 格式粘贴");
        }

        if (!/^\d+$/.test(proxy.Port) || portNumber < 1 || portNumber > 65535) {
            errors.push("端口必须是 1-65535 之间的整数");
        }

        if (proxy.Password && !proxy.Username) {
            errors.push("填写密码时也必须填写用户名");
        }

        if ((proxy.select === "SOCKS4" || proxy.select === "SOCKS5") && (proxy.Username || proxy.Password)) {
            errors.push("Chrome 不支持 SOCKS4/SOCKS5 用户名密码认证，请使用无认证 SOCKS 或改用 HTTP 代理");
        }

        if (proxy.select === "HTTPS") {
            warnings.push("HTTPS 表示浏览器到代理服务器本身使用 TLS；多数标称“支持 HTTPS”的普通代理仍应选择 HTTP");
        }

        return {
            ok: errors.length === 0,
            proxy: proxy,
            errors: errors,
            warnings: warnings
        };
    }

    function sameProxy(left, right) {
        var a = normalizeProxy(left);
        var b = normalizeProxy(right);

        return a.select === b.select
            && a.Proxy_ip.toLowerCase() === b.Proxy_ip.toLowerCase()
            && a.Port === b.Port
            && a.Username === b.Username
            && a.Password === b.Password;
    }

    function sameProxyEndpoint(left, right) {
        var a = normalizeProxy(left);
        var b = normalizeProxy(right);

        return a.select === b.select
            && a.Proxy_ip.toLowerCase() === b.Proxy_ip.toLowerCase()
            && a.Port === b.Port;
    }

    function escapeHtml(value) {
        return String(value === undefined || value === null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    return Object.freeze({
        SUPPORTED_SCHEMES: SUPPORTED_SCHEMES.slice(),
        escapeHtml: escapeHtml,
        normalizeProxy: normalizeProxy,
        normalizeScheme: normalizeScheme,
        parseProxyEndpoint: parseProxyEndpoint,
        sameProxy: sameProxy,
        sameProxyEndpoint: sameProxyEndpoint,
        validateProxy: validateProxy
    });
});
