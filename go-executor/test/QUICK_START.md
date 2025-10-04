# 🚀 Fetch API 测试 - 快速开始

## 前置要求

1. ✅ Flow-codeblock 服务运行在 `http://localhost:3002`
2. ✅ 安装了 `curl` 和 `jq`（可选）
3. ✅ 在 `test/` 目录下

```bash
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat /Users/Code/Go-product/Flow-codeblock_goja/test/libs/qs-test.js| base64)\"
  }" | jq '.'
```

---
测试RSA
---
```bash
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat /Users/Code/Go-product/Flow-codeblock_goja/test/RSA/RSA-PKCS8.js | base64)\"
  }" | jq '.'
```

```bash
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat /Users/Code/Go-product/Flow-codeblock_goja/test/RSA/RSA-P8-sys.js | base64)\"
  }" | jq '.'
```

```bash
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat /Users/Code/Go-product/Flow-codeblock_goja/test/RSA/RSA-P1-sys.js | base64)\"
  }" | jq '.'
```
```bash
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat /Users/Code/Go-product/Flow-codeblock_goja/test/RSA/RSA-PKCS1.js| base64)\"
  }" | jq '.'
```


## 方法 2: 手动运行单个测试

### 测试 1: fetch基础功能、CRUD、错误处理

```bash
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat /Users/Code/Go-product/Flow-codeblock_goja/test/fetch/fetch-comprehensive-test.js | base64)\"
  }" | jq '.'
```

### 测试 2: fetch并发请求、连接池性能

```bash
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat /Users/Code/Go-product/Flow-codeblock_goja/test/fetch/fetch-concurrent-test.js | base64)\"
  }" | jq '.'
```

### 测试 3: fetch超时控制、大数据传输

```bash
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat /Users/Code/Go-product/Flow-codeblock_goja/test/fetch/fetch-timeout-test.js | base64)\"
  }" | jq '.'

```

### 测试 : fetch重定向、401/403 认证失败
```bash
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat /Users/Code/Go-product/Flow-codeblock_goja/test/fetch/fetch-redirect-auth-test.js | base64)\"
  }" | jq '.'
```

```bash
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat /Users/Code/Go-product/Flow-codeblock_goja/test/fetch/fetch-redirect-auth-test-fixed.js | base64)\"
  }" | jq '.'
```

### fetch-文件下载-文件上传
```bash
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat /Users/Code/Go-product/Flow-codeblock_goja/test/fetch/form-data/fetch-formdata-test-fixed.js | base64)\"
  }" | jq '.'

```

### fetch-文件下载-文件上传
```bash

curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat /Users/Code/Go-product/Flow-codeblock_goja/test/fetch/form-data/formdata-quick-test.js | base64)\"
  }" | jq '.'
```

### fetch-流式处理
```bash
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat /Users/Code/Go-product/Flow-codeblock_goja/test/fetch/form-data/formdata-streaming-test.js | base64)\"
  }" | jq '.'
```

### fetch-blob-file上传
```bash
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat /Users/Code/Go-product/Flow-codeblock_goja/test/libs/qs-test.js | base64)\"
  }" | jq '.'
```

### fetch流式处理工作
```bash
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat /Users/Code/Go-product/Flow-codeblock_goja/test/fetch/form-data/formdata-streaming-optimized.js | base64)\"
  }" | jq '.'
```
### fetch网络速度测试
```bash
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat /Users/Code/Go-product/Flow-codeblock_goja/test/fetch/form-data/network-speed-test.js | base64)\"
  }" | jq '.'

 
```

