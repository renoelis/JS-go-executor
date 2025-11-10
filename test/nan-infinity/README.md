# NaN 和 Infinity 测试用例

## 测试场景

### 1. input为空对象 (最常见)
```json
{
  "input": {},
  "codebase64": "cmV0dXJuIHsgcmVzdWx0OiBpbnB1dC5hZ2UgKiAyLCBuYW1lOiBpbnB1dC5uYW1lIH07"
}
```
**代码**: `return { result: input.age * 2, name: input.name };`
**预期**: `400 ValidationError - 字段 'result': 检测到 NaN`

---

### 2. 直接返回 NaN
```json
{
  "input": {},
  "codebase64": "cmV0dXJuIHsgdmFsdWU6IE5hTiB9Ow=="
}
```
**代码**: `return { value: NaN };`
**预期**: `400 ValidationError - 字段 'value': 检测到 NaN`

---

### 3. 返回 Infinity
```json
{
  "input": {},
  "codebase64": "cmV0dXJuIHsgdmFsdWU6IDEvMCB9Ow=="
}
```
**代码**: `return { value: 1/0 };`
**预期**: `400 ValidationError - 字段 'value': 检测到 Infinity`

---

### 4. 返回 -Infinity
```json
{
  "input": {},
  "codebase64": "cmV0dXJuIHsgdmFsdWU6IC0xLzAgfTs="
}
```
**代码**: `return { value: -1/0 };`
**预期**: `400 ValidationError - 字段 'value': 检测到 Infinity`

---

### 5. 嵌套对象中的 NaN
```json
{
  "input": {},
  "codebase64": "cmV0dXJuIHsgdXNlcjogeyBhZ2U6IGlucHV0LmFnZSAqIDIsIG5hbWU6ICd0ZXN0JyB9IH07"
}
```
**代码**: `return { user: { age: input.age * 2, name: 'test' } };`
**预期**: `400 ValidationError - 字段 'user': 字段 'age': 检测到 NaN`

---

### 6. 数组中的 NaN
```json
{
  "input": {},
  "codebase64": "cmV0dXJuIHsgdmFsdWVzOiBbMSwgMiwgaW5wdXQuYWdlICogMiwgNF0gfTs="
}
```
**代码**: `return { values: [1, 2, input.age * 2, 4] };`
**预期**: `400 ValidationError - 字段 'values': 数组索引 [2]: 检测到 NaN`

---

### 7. 正常情况 - 应该成功
```json
{
  "input": {
    "age": 25,
    "name": "张三"
  },
  "codebase64": "cmV0dXJuIHsgcmVzdWx0OiBpbnB1dC5hZ2UgKiAyLCBuYW1lOiBpbnB1dC5uYW1lIH07"
}
```
**代码**: `return { result: input.age * 2, name: input.name };`
**预期**: `200 OK - { result: 50, name: "张三" }`

---

## Base64 编码生成

```bash
# 生成 Base64 编码
echo 'return { result: input.age * 2, name: input.name };' | base64

# 解码查看
echo 'cmV0dXJuIHsgcmVzdWx0OiBpbnB1dC5hZ2UgKiAyLCBuYW1lOiBpbnB1dC5uYW1lIH07' | base64 -d
```

---

## 用户代码最佳实践

### ❌ 不安全的写法
```javascript
// 问题: 没有验证 input 是否存在
return {
  result: input.age * 2
};
```

### ✅ 安全的写法 1: 验证输入
```javascript
if (!input || typeof input.age !== 'number') {
  throw new Error('请提供有效的 age 参数');
}
return {
  result: input.age * 2
};
```

### ✅ 安全的写法 2: 提供默认值
```javascript
const age = input?.age ?? 0;
return {
  result: age * 2
};
```

### ✅ 安全的写法 3: 检查计算结果
```javascript
const result = input.age * 2;
if (isNaN(result)) {
  throw new Error('计算结果无效');
}
return { result };
```


