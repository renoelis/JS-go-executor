# Pinyin Bug 测试用例添加说明

## 📋 更新日期
2025年11月1日

## 🎯 更新目的
根据 `PINYIN_HETERONYM_BUG_ANALYSIS.md` 中描述的已知 Bug，在测试文件 `test/pinyin/test.js` 中添加完整的测试用例，以便：
1. 验证 Bug 是否存在
2. 对比 Node.js 和 Goja 的行为差异
3. 跟踪 Bug 修复进度

## 🐛 Bug 描述

**问题**：当 `segment: true` 且 `heteronym: true` 时，某些字的多音字信息丢失。

**典型示例**：
```javascript
// Node.js (正确)
pinyin('银行', { segment: true, heteronym: true })
// 返回: [["yín"], ["háng", "xíng"]]  ✅

// Goja (错误)
pinyin('银行', { segment: true, heteronym: true })
// 返回: [["yín"], ["háng"]]  ❌ 丢失 "xíng"
```

## ✨ 新增测试用例

### 1. 测试结构
在 `publicResults` 中新增 `bugTests` 对象，包含以下测试：

```javascript
publicResults.bugTests = {
  // 测试 1: 银行（最典型的 Bug 示例）
  yinhang_baseline_no_seg_no_het: ...,  // baseline: segment=false, heteronym=false
  yinhang_baseline_no_seg_het: ...,     // baseline: segment=false, heteronym=true
  yinhang_baseline_seg_no_het: ...,     // baseline: segment=true, heteronym=false
  yinhang_bug_seg_het: ...,             // 🐛 bug: segment=true, heteronym=true
  
  // 测试 2: 行长
  hangzhang_baseline_no_seg_het: ...,
  hangzhang_bug_seg_het: ...,
  
  // 测试 3: 重庆银行行长（复杂组合）
  complex_baseline_no_seg_het: ...,
  complex_bug_seg_het: ...,
  
  // 测试 4: 我要去银行（完整句子）
  sentence_baseline_no_seg_het: ...,
  sentence_bug_seg_het: ...,
  
  // 测试 5: 单字"行"（对照组）
  single_hang_het: ...,
  
  // 测试 6: 其他多音字词组
  chaoyang_baseline_no_seg_het: ...,
  chaoyang_bug_seg_het: ...,
};
```

### 2. 测试用例详情

#### 测试 1: 银行（最典型的 Bug 示例）
```javascript
// Baseline 1: 不分词 + 不显示多音字
pinyin('银行', { segment: false, heteronym: false })
// 预期: [["yín"], ["háng"]]

// Baseline 2: 不分词 + 显示多音字 ✅ 正确
pinyin('银行', { segment: false, heteronym: true })
// 预期: [["yín"], ["háng", "xíng"]]

// Baseline 3: 分词 + 不显示多音字
pinyin('银行', { segment: true, heteronym: false })
// 预期: [["yín"], ["háng"]]

// 🐛 Bug: 分词 + 显示多音字
pinyin('银行', { segment: true, heteronym: true })
// 预期: [["yín"], ["háng", "xíng"]]
// 实际: [["yín"], ["háng"]]  ❌ 丢失 "xíng"
```

#### 测试 2: 行长
```javascript
// Baseline: 不分词 + 显示多音字 ✅ 正确
pinyin('行长', { segment: false, heteronym: true })
// 预期: [["háng", "xíng"], ["zhǎng", "cháng"]]

// 🐛 Bug: 分词 + 显示多音字
pinyin('行长', { segment: true, heteronym: true })
// 预期: [["háng", "xíng"], ["zhǎng"]]
// 实际: 可能丢失 "xíng"
```

#### 测试 3: 重庆银行行长（复杂组合）
```javascript
// Baseline: 不分词 + 显示多音字 ✅ 正确
pinyin('重庆银行行长', { segment: false, heteronym: true })
// 预期: [["zhòng", "chóng"], ["qìng"], ["yín"], ["háng", "xíng"], ["zhǎng", "cháng"]]

// 🐛 Bug: 分词 + 显示多音字
pinyin('重庆银行行长', { segment: true, heteronym: true })
// 预期: 根据上下文选择正确读音，但仍显示多音字
// 实际: 可能丢失多个多音字
```

#### 测试 4: 我要去银行（完整句子）
```javascript
// Baseline: 不分词 + 显示多音字 ✅ 正确
pinyin('我要去银行', { segment: false, heteronym: true })
// 预期: [["wǒ"], ["yào"], ["qù"], ["yín"], ["háng", "xíng"]]

// 🐛 Bug: 分词 + 显示多音字
pinyin('我要去银行', { segment: true, heteronym: true })
// 预期: [["wǒ"], ["yào"], ["qù"], ["yín"], ["háng", "xíng"]]
// 实际: "行" 可能丢失 "xíng"
```

#### 测试 5: 单字"行"（对照组）
```javascript
// ✅ 应该正确返回所有读音
pinyin('行', { heteronym: true })
// 预期: [["háng", "xíng", "hàng", "héng"]]
```

#### 测试 6: 朝阳（其他多音字词组）
```javascript
// Baseline: 不分词 + 显示多音字 ✅ 正确
pinyin('朝阳', { segment: false, heteronym: true })
// 预期: [["cháo", "zhāo"], ["yáng"]]

// 🐛 Bug: 分词 + 显示多音字
pinyin('朝阳', { segment: true, heteronym: true })
// 预期: [["cháo", "zhāo"], ["yáng"]]
// 实际: 可能丢失 "cháo" 或 "zhāo"
```

## 📊 测试结果统计

### 1. 核心功能测试（不包含 bugTests）
- 保持原有的成功率计算
- 不受 bugTests 影响
- 用于验证核心功能是否正常

### 2. Bug 测试统计（单独统计）
```javascript
metrics: {
  core: {
    passed: X,
    total: Y,
    successRate: "XX.XX%"
  },
  bugTests: {
    passed: A,
    total: B,
    successRate: "XX.XX%",
    note: "segment + heteronym 组合的已知 Bug 测试"
  }
}
```

## 🔍 如何使用测试结果

### 1. 查看 Bug 测试结果
```javascript
// 运行测试后，查看 results.bugTests
const result = /* 测试结果 */;

// 检查每个测试用例
console.log(result.results.bugTests.yinhang_bug_seg_het);
// { ok: true, value: [["yín"], ["háng"]], preview: [["yín"], ["háng"]] }

// 对比 baseline
console.log(result.results.bugTests.yinhang_baseline_no_seg_het);
// { ok: true, value: [["yín"], ["háng", "xíng"]], preview: [["yín"], ["háng", "xíng"]] }
```

### 2. 验证 Bug 是否修复
- 如果 `bugTests.successRate` 达到 100%，说明 Bug 已修复
- 对比 baseline 和 bug 测试的结果，确认多音字是否完整

### 3. 调试指南
1. 运行测试：`node test/pinyin/test.js` 或在 Goja 中运行
2. 查看 `results.bugTests` 中的每个测试用例
3. 对比预期结果和实际结果
4. 重点关注 `*_bug_seg_het` 测试用例（这些是已知 Bug）

## 📝 预期行为

### 修复前（当前状态）
```javascript
// 核心功能测试
metrics.core.successRate: "100.00%"  ✅

// Bug 测试
metrics.bugTests.successRate: "50.00%"  ⚠️
// baseline 测试全部通过
// bug 测试（*_bug_seg_het）可能失败或结果不完整
```

### 修复后（目标状态）
```javascript
// 核心功能测试
metrics.core.successRate: "100.00%"  ✅

// Bug 测试
metrics.bugTests.successRate: "100.00%"  ✅
// 所有测试全部通过
// bug 测试（*_bug_seg_het）返回完整的多音字
```

## 🎯 测试覆盖范围

### 覆盖的场景
- ✅ 单字多音字（"行"）
- ✅ 双字词组（"银行"、"行长"、"朝阳"）
- ✅ 复杂词组（"重庆银行行长"）
- ✅ 完整句子（"我要去银行"）
- ✅ 所有 4 种选项组合（segment × heteronym）

### 覆盖的多音字
- "行"：háng, xíng, hàng, héng
- "朝"：cháo, zhāo
- "重"：zhòng, chóng
- "长"：zhǎng, cháng

## 📚 相关文档

- `PINYIN_HETERONYM_BUG_ANALYSIS.md` - Bug 详细分析
- `test/pinyin/test.js` - 完整测试文件
- `test/pinyin/quick_test.js` - 快速测试（如需要）

## ✅ 验证清单

- [x] 添加了所有 PINYIN_HETERONYM_BUG_ANALYSIS.md 中提到的测试用例
- [x] 测试用例包含 baseline 和 bug 对照
- [x] 单独统计 bugTests 成功率
- [x] 不影响核心功能测试的成功率
- [x] 添加了详细的注释说明
- [x] 测试结果包含完整的预览数据

---

**创建时间**: 2025年11月1日  
**状态**: 已完成  
**下一步**: 运行测试，验证 Bug 是否存在

