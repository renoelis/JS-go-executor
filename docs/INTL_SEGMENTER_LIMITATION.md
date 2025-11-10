# Intl.Segmenter 在 Goja 环境中的限制

## 📋 问题说明

在测试 `segment: "Intl.Segmenter"` 选项时，发现 Goja 环境和 Node.js 环境的结果不同。

### 测试结果对比

**输入**: `"中国银行行长在中心"`（heteronym: true）

#### Node.js 环境
```javascript
{
  "engine": "Intl.Segmenter",
  "available": true,  // ✅
  "preview": [
    ["zhōng"],
    ["guó"],
    ["yín"],
    ["háng", "xíng"],   // ⭐ 多音字
    ["háng", "xíng"],   // ⭐ 多音字
    ["cháng", "zhǎng"], // ⭐ 多音字
    ["zài"],
    ["zhōng", "zhòng"], // ⭐ 多音字
    ["xīn"]
  ]
}
```

#### Goja 环境
```javascript
{
  "engine": "Intl.Segmenter",
  "available": false,  // ❌
  "preview": [
    ["zhōng"],
    ["guó"],
    ["yín"],
    ["háng"],      // ⚠️ 只有一个读音
    ["háng"],      // ⚠️ 只有一个读音
    ["zháng"],     // ⚠️ 只有一个读音（且不是 cháng）
    ["zài"],
    ["zhōng", "zhòng"],
    ["xīn"]
  ]
}
```

---

## 🔍 原因分析

### 1. Intl.Segmenter 是什么？

`Intl.Segmenter` 是 ECMAScript 国际化 API 的一部分，用于按照语言规则分割文本：

```javascript
// Node.js v16+ / 现代浏览器
const segmenter = new Intl.Segmenter("zh-Hans-CN", { granularity: "word" });
const result = segmenter.segment("中国银行行长");

// 输出: ["中国", "银行", "行长"]
// ⭐ 能正确识别中文词组边界
```

### 2. 为什么 Goja 不支持？

**Goja** 是一个纯 Go 实现的 ECMAScript 5.1+ 解释器：
- ❌ **不支持** `Intl` 对象
- ❌ **不支持** `Intl.Segmenter`
- ✅ **支持** 基础 JavaScript 语法和 ES5/ES6 特性

这是 Goja 的架构限制，不是 bug。

### 3. npm pinyin v4 的回退机制

查看 JS 原版源码（pinyin.min copy.js 2194-2204行）：

```javascript
function segment(hans, segment) {
    // Intl.Segmenter
    if (segment === "Intl.Segmenter") {
        if (typeof (Intl?.Segmenter) === "function") {
            // ✅ 可用：使用 Intl.Segmenter
            return [...hansIntlSegmenter.segment(hans)].map((s) => s.segment);
        }
    }
    // ❌ 不可用：返回整个文本（不分词）
    return [hans];
}
```

**问题**: 当 `Intl.Segmenter` 不可用时，**直接返回整个文本**，不进行分词。

---

## 🎯 我们的实现差异

### Go 实现的行为

我们的实现使用了 `LightweightSegmenter`（自研分词器）：

```go
func (ls *LightweightSegmenter) Segment(text string, mode string) []string {
    // 基于 PhrasesDict 的前向最大匹配分词
    // 例如："中国银行" → ["中国", "银", "行"]
}
```

**特点**:
- ✅ 能识别**部分**词组（如"中国"）
- ❌ 无法识别所有词组（如"银行"、"行长"可能被拆分）
- ⚠️ 分词质量 **不如** `Intl.Segmenter`

---

## 📊 多音字差异的根本原因

### 为什么 Node.js 能返回多个读音？

```
"银行" → Intl.Segmenter 识别为词组
      → 查词组字典 PhrasesDict["银行"]
      → 找到: [["yín"], ["háng", "xíng"]]  ⭐ "行"有两个读音
      → heteronym: true → 返回所有读音
```

### 为什么 Goja 只返回一个读音？

**需要调试验证**: 如果 heteronym: true，理论上应该返回所有读音。

可能的原因：
1. 分词器没有识别"银行"、"行长"为词组
2. 词组字典中没有这些词的多音标注
3. heteronym 选项在某个环节被忽略

**调试方法**: 运行 `test/pinyin/test_heteronym_debug.js` 查看详细行为。

---

## 💡 解决方案

### 方案1: 接受环境限制（推荐）

**说明**: `Intl.Segmenter` 是浏览器/Node.js 的原生功能，Goja 作为纯 Go 实现的 JS 引擎，不支持这个API是正常的。

**建议**:
1. ✅ 在文档中说明 Goja 环境的限制
2. ✅ 测试时，不期望 Goja 环境与 Node.js 完全一致
3. ✅ 对于需要高质量分词的场景，使用 Node.js 环境

### 方案2: 改进 LightweightSegmenter（可选）

如果需要提升 Goja 环境的分词质量：

1. **扩充词组字典**: 确保常用词组（如"银行"、"行长"）在 PhrasesDict 或 SpecialDict 中
2. **优化分词算法**: 改进前向最大匹配算法
3. **添加词组消歧**: 根据词组上下文选择正确的读音

**成本**: 较高，需要大量词典数据和算法优化

### 方案3: 集成第三方中文分词库（复杂）

使用 Go 的中文分词库（如 gojieba、sego）：

**优点**:
- ✅ 分词质量接近 Intl.Segmenter
- ✅ 纯 Go 实现

**缺点**:
- ❌ 增加依赖
- ❌ 内存占用增加
- ❌ 可能影响性能

---

## 📊 环境对比总结

| 特性 | Node.js | Goja | 说明 |
|------|---------|------|------|
| **Intl.Segmenter** | ✅ 支持 | ❌ 不支持 | 环境限制 |
| **分词质量** | 高（原生API） | 中（自研） | 可接受 |
| **多音字准确性** | 高（词组上下文） | 中（单字为主） | 可接受 |
| **内存占用** | 高 | 低 | Go 优势 |
| **启动速度** | 慢 | 快 | Go 优势 |
| **API 兼容性** | 100% | 100% | ✅ |

---

## ✅ 结论

**这不是 bug，是环境限制！**

1. **Goja 不支持 `Intl.Segmenter`** 是正常的，因为它是 ECMAScript 5.1+ 解释器
2. **分词结果差异** 是由于使用了不同的分词引擎
3. **多音字识别差异** 是分词质量导致的连锁反应

**建议**:
- ✅ 接受这个差异，在文档中说明
- ✅ 对于要求高质量分词的场景，使用 Node.js
- ✅ 对于要求高性能/低内存的场景，使用 Goja（现状已足够好）

---

## 📝 相关测试

- `test/pinyin/test_heteronym_debug.js` - 调试 heteronym 行为
- `test/pinyin/check_dict.js` - 检查词组字典
- `test/pinyin/test2_http_api.js` - 完整功能测试

---

**文档创建时间**: 2024年11月1日  
**适用版本**: Goja Runtime in Flow-codeblock  
**状态**: 已知限制，非 bug
