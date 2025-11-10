# fast-xml-parser 模块加载修复

## 问题描述

用户在使用 `require('fast-xml-parser')` 时遇到错误：
```
fast-xml-parser 模块加载失败: fxp is undefined
```

## 根本原因

`fast-xml-parser.min.js` 使用了 browserify 的 UMD (Universal Module Definition) 包装格式：

```javascript
!function(t){
  if("object"==typeof exports && "undefined"!=typeof module)
    module.exports=t();  // CommonJS 分支
  else if("function"==typeof define&&define.amd)
    define([],t);  // AMD 分支
  else{
    ("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).fxp=t()  // 全局变量分支
  }
}
```

UMD 包装的执行逻辑：
1. **优先检查 CommonJS**：如果存在 `exports` 和 `module`，使用 `module.exports`
2. **其次检查 AMD**：如果存在 `define.amd`，使用 AMD 加载器
3. **最后使用全局变量**：将模块挂载到 `window`、`global`、`self` 或 `this` 上

在 goja 环境中：
- 存在 `global` 对象（指向全局作用域）
- UMD 包装选择了全局变量分支，将 `fxp` 设置到 `global.fxp`
- 但我们的代码期望 `fxp` 在顶层全局作用域

## 解决方案

### 1. 删除 module 和 exports（确保不走 CommonJS 分支）

```go
// 完全删除 module 和 exports 属性，让 typeof 检查返回 "undefined"
if hasModule {
    globalObj.Delete("module")
}
if hasExports {
    globalObj.Delete("exports")
}
```

**注意**：必须使用 `Delete()` 而不是 `Set(undefined)`，因为：
- `Set(undefined)` 后，变量仍然存在，`typeof module` 返回 `"undefined"` 字符串
- `Delete()` 后，变量不存在，`typeof module` 才真正返回 `"undefined"`

### 2. 从 global/window/self 提升 fxp 到顶层

```go
// UMD 包装可能将 fxp 设置到 global/window/self 上，需要提升到顶层
if fxpVal == nil || goja.IsUndefined(fxpVal) {
    // 优先从 global 获取（最常见）
    if globalVal != nil && !goja.IsUndefined(globalVal) {
        if globalObjVal, ok := globalVal.(*goja.Object); ok {
            globalFxp := globalObjVal.Get("fxp")
            if globalFxp != nil && !goja.IsUndefined(globalFxp) {
                fxpVal = globalFxp
                runtime.Set("fxp", fxpVal)
            }
        }
    }
    // ... 同样处理 window 和 self
}
```

### 3. 恢复 module 和 exports

```go
// 恢复 module 和 exports，避免影响后续代码
if hasModule {
    runtime.Set("module", moduleVal)
}
if hasExports {
    runtime.Set("exports", exportsVal)
}
```

## 修复后的执行流程

1. **保存并删除** `module` 和 `exports`
2. **执行** fast-xml-parser 代码
   - UMD 包装检测到没有 `module`/`exports`
   - 检测到存在 `global` 对象
   - 将 `fxp` 设置到 `global.fxp`
3. **提升** `global.fxp` 到顶层 `fxp`
4. **恢复** `module` 和 `exports`

## 测试结果

```bash
curl --location 'http://localhost:3002/flow/codeblock' \
--header 'Content-Type: application/json' \
--header 'accessToken: YOUR_TOKEN' \
--data '{
    "codebase64": "...",
    "input": {}
}'
```

**执行日志**：
```
2025-11-01T18:23:12.678+0800    DEBUG   加载 fast-xml-parser 前的环境   
    {"has_module": false, "has_exports": false, "has_window": false, "has_global": true, "has_self": false}
2025-11-01T18:23:12.678+0800    DEBUG   fast-xml-parser 执行后  
    {"fxp_defined": false, "fxp_on_window": false, "fxp_on_global": true, "fxp_on_self": false}
2025-11-01T18:23:12.678+0800    DEBUG   从 global.fxp 提升到顶层
2025-11-01T18:23:12.679+0800    INFO    代码执行成功
```

**返回结果**：
```json
{
  "success": true,
  "result": {
    "note": {
      "to": "Alice",
      "from": "Bob",
      "heading": "Reminder",
      "body": "Don't forget the meeting at 10AM!"
    }
  }
}
```

## 示例代码

```javascript
const { XMLParser } = require('fast-xml-parser');

const xmlData = `
<note>
  <to>Alice</to>
  <from>Bob</from>
  <heading>Reminder</heading>
  <body>Don't forget the meeting at 10AM!</body>
</note>
`;

const parser = new XMLParser();
const result = parser.parse(xmlData);
return result;
```

## 关键要点

1. **UMD 包装的三种分支**：CommonJS > AMD > 全局变量
2. **Delete vs Set(undefined)**：必须完全删除变量才能让 `typeof` 返回 `"undefined"`
3. **global 对象的特殊性**：在 goja 中，`global` 指向全局作用域本身
4. **提升策略**：优先从 `global` 获取，其次 `window`，最后 `self`

## 修改的文件

- `enhance_modules/fast_xml_parser_enhancement.go`

## 相关文档

- [fast-xml-parser npm 包](https://www.npmjs.com/package/fast-xml-parser)
- [UMD (Universal Module Definition)](https://github.com/umdjs/umd)
- [goja JavaScript 引擎](https://github.com/dop251/goja)
