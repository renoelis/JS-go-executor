# fast-xml-parser 测试

## 测试文件

- `test_basic.js` - 基本 XML 解析测试
- `comprehensive_test.js` - 综合功能测试（解析、验证、构建）
- `run_test.sh` - 自动化测试脚本

## 运行测试

### 方法 1: 使用测试脚本

```bash
cd /Users/Code/Go-product/Flow-codeblock_goja
chmod +x test/fast-xml-parser/run_test.sh
./test/fast-xml-parser/run_test.sh
```

### 方法 2: 使用 curl 直接测试

```bash
# 基本测试
curl --location 'http://localhost:3002/flow/codeblock' \
--header 'Content-Type: application/json' \
--header 'accessToken: YOUR_TOKEN' \
--data '{
    "codebase64": "Y29uc3QgeyBYTUxQYXJzZXIgfSA9IHJlcXVpcmUoJ2Zhc3QteG1sLXBhcnNlcicpOwpjb25zdCB4bWxEYXRhID0gYDxub3RlPjx0bz5BbGljZTwvdG8+PC9ub3RlPmA7CmNvbnN0IHBhcnNlciA9IG5ldyBYTUxQYXJzZXIoKTsKcmV0dXJuIHBhcnNlci5wYXJzZSh4bWxEYXRhKTs=",
    "input": {}
}'
```

## 功能测试

### 1. XML 解析 (XMLParser)

```javascript
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser();
const result = parser.parse('<note><to>Alice</to></note>');
// 结果: { note: { to: 'Alice' } }
```

### 2. XML 验证 (XMLValidator)

```javascript
const { XMLValidator } = require('fast-xml-parser');

const result = XMLValidator.validate('<root><item>value</item></root>');
// 结果: true (有效) 或 { err: {...} } (无效)
```

### 3. JSON 转 XML (XMLBuilder)

```javascript
const { XMLBuilder } = require('fast-xml-parser');

const builder = new XMLBuilder();
const xml = builder.build({ note: { to: 'Alice' } });
// 结果: '<note><to>Alice</to></note>'
```

## 配置选项

XMLParser 支持多种配置选项：

```javascript
const parser = new XMLParser({
    ignoreAttributes: false,      // 保留属性
    attributeNamePrefix: '@_',    // 属性前缀
    textNodeName: '#text',        // 文本节点名称
    ignoreDeclaration: true,      // 忽略 XML 声明
    parseTagValue: true,          // 解析标签值
    trimValues: true              // 去除空白
});
```

## 预期结果

所有测试应该通过，返回：

```json
{
  "success": true,
  "result": {
    "test1": { "note": { "to": "Alice", "from": "Bob", ... } },
    "test2": { "root": { "person": { "@_id": "123", ... } } },
    "test3": { "valid": true, "invalid": { "err": {...} } },
    "test4": "<note><to>Alice</to>...</note>"
  }
}
```

## 故障排查

如果测试失败，检查：

1. **服务是否运行**：`curl http://localhost:3002/health`
2. **Token 是否有效**：检查 `accessToken` 是否正确
3. **查看日志**：检查服务器日志中的错误信息
4. **模块是否加载**：确认 `fast-xml-parser.min.js` 文件存在

## 相关文档

- [修复说明](../../docs/FAST_XML_PARSER_FIX.md)
- [fast-xml-parser 官方文档](https://github.com/NaturalIntelligence/fast-xml-parser)
