# Pinyin 完整测试套件

本目录包含 pinyin 模块的完整功能测试。

## 测试文件

### 1. test-pinyin-compare.js
测试 `pinyin.compare()` 比较和排序功能
- 基础比较（<, >, ==）
- 多字比较
- 声调比较
- 数组排序
- 特殊字符处理
- 长度比较
- 边界情况

### 2. test-pinyin-style.js
测试所有拼音输出样式
- STYLE_NORMAL (0) - 普通风格: `zhong`
- STYLE_TONE (1) - 声调风格: `zhōng`
- STYLE_TONE2 (2) - 数字声调: `zhong1`
- STYLE_TO3NE (5) - Tone3 风格: `zho1ng`
- STYLE_INITIALS (3) - 声母: `zh`
- STYLE_FIRST_LETTER (4) - 首字母: `z`
- STYLE_PASSPORT (6) - 护照风格: `ZHONG`

### 3. test-pinyin-mode.js
测试拼音模式
- MODE_NORMAL (0) - 普通模式
- MODE_SURNAME (1) - 姓氏模式
- 单姓、复姓、多音字姓氏
- 模式与样式组合

### 4. test-pinyin-options.js
测试各种选项组合
- heteronym - 多音字选项
- group - 分组选项
- compact - 紧凑模式
- segment - 分词选项
- 选项组合测试
- 边界情况

### 5. test-pinyin-segment.js
测试分词和多音字组合（仅测试，不统计）
- segment 基础测试
- segment + heteronym 组合
- 多音字分词
- 复杂句子分词
- segment + group 组合
- 特殊内容分词（URL、邮箱、数字等）

## 运行测试

### 单独运行
```bash
node test/pinyin/pinyin-all/test-pinyin-compare.js
node test/pinyin/pinyin-all/test-pinyin-style.js
node test/pinyin/pinyin-all/test-pinyin-mode.js
node test/pinyin/pinyin-all/test-pinyin-options.js
node test/pinyin/pinyin-all/test-pinyin-segment.js
```

### 批量运行
```bash
for file in test/pinyin/pinyin-all/test-*.js; do
  echo "Running $file..."
  node "$file"
  echo ""
done
```

## 代码规范

所有测试文件遵循项目统一的简洁风格：
- 使用 `===` 分隔线标题
- 使用 `【】` 标记测试分类
- 直接输出测试结果，不使用复杂的统计系统
- 不使用 `module.exports`（除非需要被其他模块引用）
- 简洁的变量命名（r1, r2, r3...）
- 清晰的注释说明

## 参考

这些测试文件模仿了 `test/pinyin/check_phrases_dict.js` 的风格，保持简洁直观。
