# 网络错误测试说明

## 🔍 问题背景

在测试 Fetch API 的错误处理时遇到了一个有趣的现象:

### 原始测试
```javascript
// ❌ 预期：DNS 解析失败 → 网络错误
fetch('http://invalid-domain-12345-does-not-exist.test/api')
    .catch(error => {
        console.log('捕获错误:', error); // 应该到这里
    });

// 🔥 实际：返回了 HTTP 500!
// ⚠️ 意外成功: status=500
```

---

## 📊 问题分析

### 为什么会返回 HTTP 500?

可能的原因:

1. **DNS 劫持**
   - ISP 劫持不存在的域名,返回广告页面
   - 企业内网劫持,返回错误页面

2. **DNS 搜索域**
   - Docker 网络配置
   - 系统 DNS 配置中的搜索域
   - `.test` TLD 被某些服务解析

3. **代理或防火墙**
   - 网络代理拦截并返回错误页面
   - 防火墙返回阻止页面

### 日志证据

```
尝试连接无效 URL...
⚠️ 意外成功: status=500
❌ Fetch 错误处理 - 无效 URL 抛出错误
```

说明:
- ✅ DNS 解析成功
- ✅ TCP 连接建立
- ✅ HTTP 响应返回 (500 Internal Server Error)
- ❌ **没有进入 `.catch()` 块**

---

## ✅ 解决方案

### 方案 1: 接受 HTTP 错误码作为"错误" (推荐)

```javascript
fetch(url)
    .then(function(response) {
        if (response.status >= 400) {
            // 4xx/5xx 也算错误处理成功 ✅
            console.log('✅ 收到错误状态码');
            return true;
        }
        // 2xx/3xx 才是失败 ❌
        console.log('❌ 不应该成功');
        return false;
    })
    .catch(function(error) {
        // 网络层错误也算成功 ✅
        console.log('✅ 捕获网络错误');
        return true;
    });
```

**优势**:
- 更符合实际场景 (HTTP 错误也需要处理)
- 测试更健壮 (不依赖 DNS 环境)
- 覆盖更全面 (HTTP 错误 + 网络错误)

---

### 方案 2: 使用保留 IP 地址

```javascript
// 使用 TEST-NET-1 (192.0.2.0/24) - IANA 保留,永远不会响应
fetch('http://192.0.2.1:9999/api', {
    timeout: 500  // 必然超时
})
    .catch(function(error) {
        console.log('✅ 超时错误');
    });
```

**IANA 保留的测试地址**:
- `192.0.2.0/24` - TEST-NET-1
- `198.51.100.0/24` - TEST-NET-2  
- `203.0.113.0/24` - TEST-NET-3
- `0.0.0.0` - 未指定地址

**优势**:
- 不依赖 DNS
- 可靠地触发超时错误
- 符合 RFC 5737 标准

---

### 方案 3: 使用 localhost 不存在的端口

```javascript
// localhost 总是存在,但端口不存在则连接失败
fetch('http://localhost:65535/api')
    .catch(function(error) {
        console.log('✅ 连接被拒绝');
    });
```

**优势**:
- 不需要网络
- 快速失败
- 跨平台兼容

---

## 🎯 最终实现

结合方案 1 和方案 2:

```javascript
// 使用保留 IP (永远不会响应)
fetch('http://192.0.2.1:9999/api', {
    timeout: 500
})
    .then(function(response) {
        // 万一有响应,检查状态码
        if (response.status >= 400) {
            console.log('✅ HTTP 错误码:', response.status);
            return true; // 也算成功
        }
        console.log('❌ 不应该成功');
        return false;
    })
    .catch(function(error) {
        // 预期路径: 超时或连接失败
        console.log('✅ 网络错误:', error.message);
        return true;
    });
```

---

## 📚 相关标准

### HTTP 状态码

| 范围 | 含义 | 错误处理 |
|------|------|----------|
| 2xx | 成功 | ❌ 不应该出现 |
| 3xx | 重定向 | ⚠️ 可能合理 |
| 4xx | 客户端错误 | ✅ 算错误 |
| 5xx | 服务器错误 | ✅ 算错误 |

### Fetch API 行为

```javascript
// ✅ 进入 .then() 的情况:
// - 收到 HTTP 响应 (任何状态码)
// - 包括 4xx/5xx 错误码

// ✅ 进入 .catch() 的情况:
// - 网络错误 (DNS 失败、连接失败、超时)
// - JavaScript 异常
// - AbortController 中止
```

### 测试 IP 地址 (RFC 5737)

| 地址段 | 用途 | 保证 |
|--------|------|------|
| 192.0.2.0/24 | 文档示例 | 永不路由 |
| 198.51.100.0/24 | 文档示例 | 永不路由 |
| 203.0.113.0/24 | 文档示例 | 永不路由 |
| 0.0.0.0 | 未指定 | 无效地址 |

---

## 💡 最佳实践

### 1. 测试网络错误时

```javascript
// ✅ 推荐
fetch('http://192.0.2.1:9999/api', { timeout: 500 })

// ❌ 不推荐
fetch('http://invalid-domain.test/api')
// 原因: 依赖 DNS 环境,不稳定
```

### 2. 测试 HTTP 错误时

```javascript
// ✅ 推荐
fetch('https://httpbin.org/status/500')
    .then(res => {
        if (!res.ok) {
            throw new Error('HTTP ' + res.status);
        }
    });

// ❌ 不推荐
fetch(invalidUrl).catch(...)
// 原因: 无法区分网络错误和 HTTP 错误
```

### 3. 测试超时时

```javascript
// ✅ 推荐
fetch(url, { timeout: 1 })  // 极短超时

// ❌ 不推荐
fetch(url, { timeout: 30000 })  // 太长,测试慢
```

---

## 🔧 调试技巧

### 1. 查看 DNS 解析

```bash
# 检查域名是否被劫持
nslookup invalid-domain-12345-does-not-exist.test

# 或
dig invalid-domain-12345-does-not-exist.test
```

### 2. 检查网络配置

```bash
# Docker 网络
docker exec container cat /etc/resolv.conf

# 系统 DNS
cat /etc/resolv.conf
```

### 3. 测试连接

```bash
# 测试保留 IP
curl -v http://192.0.2.1:9999 --connect-timeout 1

# 应该超时
```

---

## 📖 参考资料

- [RFC 5737 - IPv4 Address Blocks Reserved for Documentation](https://tools.ietf.org/html/rfc5737)
- [IANA Reserved TLDs](https://www.iana.org/domains/reserved)
- [MDN - Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [MDN - Response.ok](https://developer.mozilla.org/en-US/docs/Web/API/Response/ok)













