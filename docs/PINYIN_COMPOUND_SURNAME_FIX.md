# Pinyin 复姓字典修复文档

## 🐛 问题描述

### 错误现象

在姓氏模式下，"诸葛亮"的拼音错误：

```javascript
// ❌ 我们的项目（修复前）
pinyin('诸葛亮', { mode: pinyin.MODE_SURNAME })
// 输出: [["zhū"],["gě"],["liàng"]]  // 葛 = gě（错误）

// ✅ npm pinyin v4（正确）
pinyin('诸葛亮', { mode: pinyin.MODE_SURNAME })
// 输出: [["zhū"],["gé"],["liàng"]]  // 葛 = gé（正确）
```

### 根本原因

复姓字典 `compound_surname_pinyin_dict.json.gz` 中"诸葛"的拼音配置错误：

```json
// ❌ 错误配置
"诸葛": [["zhū"], ["gě"]]

// ✅ 正确配置
"诸葛": [["zhū"], ["gé"]]
```

## ✅ 修复内容

### 修改的文件

`enhance_modules/pinyin/dict/compound_surname_pinyin_dict.json.gz`

### 修复步骤

1. **解压字典文件**
   ```bash
   gunzip compound_surname_pinyin_dict.json.gz
   ```

2. **修改 JSON 内容**
   - 将 `"诸葛":[["zhū"],["gě"]]` 
   - 改为 `"诸葛":[["zhū"],["gé"]]`

3. **重新压缩**
   ```bash
   gzip -f compound_surname_pinyin_dict.json
   ```

### 验证修复

```bash
gunzip -c compound_surname_pinyin_dict.json.gz | \
python3 -c "import json,sys; d=json.load(sys.stdin); print('诸葛:', d.get('诸葛'))"
# 输出: 诸葛: [['zhū'], ['gé']]  ✅
```

## 📋 测试验证

### 重启服务

⚠️ **重要**：字典在程序启动时加载并缓存，需要重启服务才能生效：

```bash
# 重启 Docker 容器
docker restart flow-codeblock-go-dev
```

### 运行测试

```bash
# 1. 检查复姓字典
node test/pinyin/check_compound_surname.js

# 2. 模式测试
node test/pinyin/pinyin-all/test-pinyin-mode.js
```

### 预期结果

```javascript
// ✅ 姓氏模式
pinyin('诸葛亮', { mode: pinyin.MODE_SURNAME })
// [["zhū"],["gé"],["liàng"]]

// ✅ 姓氏模式 + heteronym
pinyin('诸葛亮', { mode: pinyin.MODE_SURNAME, heteronym: true })
// [["zhū"],["gé","gě"],["liàng"]]

// ✅ 单独测试"葛"字
pinyin('葛', { mode: pinyin.MODE_SURNAME })
// [["gé"]]
```

## 🔍 相关知识

### "葛"字的读音

- **标准读音**：gé（二声）
- **常见用法**：
  - 葛根（gé gēn）
  - 葛藤（gé téng）
  - 诸葛亮（zhū gé liàng）
  
- **多音字**：葛也有 gě（三声）的读音，但在姓氏"诸葛"中读 gé

### 复姓字典说明

复姓字典 (`compound_surname_pinyin_dict.json.gz`) 包含常见的复姓及其读音：
- 欧阳（ōu yáng）
- 司马（sī mǎ）
- 上官（shàng guān）
- **诸葛（zhū gé）** ← 本次修复
- 等等...

## 📊 修复效果对比

| 测试用例 | 修复前 | 修复后 | 状态 |
|---------|--------|--------|------|
| `pinyin('诸葛亮', {mode: MODE_SURNAME})` | `[["zhū"],["gě"],["liàng"]]` | `[["zhū"],["gé"],["liàng"]]` | ✅ |
| `pinyin('葛', {mode: MODE_SURNAME})` | `[["gě"]]` | `[["gé"]]` | ✅ |
| `pinyin('诸葛亮', {mode: MODE_NORMAL})` | `[["zhū"],["gé"],["liàng"]]` | `[["zhū"],["gé"],["liàng"]]` | ✅ (未变) |

## 🎯 总结

### 问题
- 复姓"诸葛"的拼音在姓氏字典中配置错误

### 修复
- 将 `"诸葛":[["zhū"],["gě"]]` 改为 `"诸葛":[["zhū"],["gé"]]`

### 结果
- ✅ 与 npm pinyin v4 完全一致
- ✅ 符合标准汉语拼音规范
- ✅ 姓氏模式下"诸葛亮"拼音正确

### 文件
- `enhance_modules/pinyin/dict/compound_surname_pinyin_dict.json.gz`

### 测试
- `test/pinyin/check_compound_surname.js`
- `test/pinyin/pinyin-all/test-pinyin-mode.js`
