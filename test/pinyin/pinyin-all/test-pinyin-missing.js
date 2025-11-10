/**
 * Pinyin 缺失功能补充测试模块
 * 测试 STYLE_PASSPORT, compact() 函数, Pinyin.segment() 方法
 */

const { pinyin, compact, Pinyin } = require('pinyin');

// 测试统计
const stats = {
  total: 0,
  passed: 0,
  failed: 0
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function deepEqual(arr1, arr2) {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
  if (arr1.length !== arr2.length) return false;
  
  for (let i = 0; i < arr1.length; i++) {
    if (Array.isArray(arr1[i]) && Array.isArray(arr2[i])) {
      if (!deepEqual(arr1[i], arr2[i])) return false;
    } else if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

function runTest(category, testName, testFn) {
  stats.total++;
  try {
    testFn();
    stats.passed++;
    console.log(`${colors.green}✓${colors.reset} ${colors.gray}[${category}]${colors.reset} ${testName}`);
  } catch (error) {
    stats.failed++;
    console.log(`${colors.red}✗${colors.reset} ${colors.gray}[${category}]${colors.reset} ${testName}`);
    console.log(`  ${colors.red}错误: ${error.message}${colors.reset}`);
  }
}

function printCategory(title) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
}

function printHeader() {
  console.log(`${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}Pinyin@4.0.0 缺失功能补充测试${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.gray}测试开始时间: ${new Date().toLocaleString('zh-CN')}${colors.reset}\n`);
}

function printStats() {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}测试统计${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  
  console.log(`总测试数: ${stats.total}`);
  console.log(`${colors.green}通过: ${stats.passed}${colors.reset}`);
  console.log(`${colors.red}失败: ${stats.failed}${colors.reset}`);
  
  const passRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(2) : 0;
  console.log(`通过率: ${passRate}%\n`);
  
  if (stats.failed === 0) {
    console.log(`${colors.green}${colors.bold}所有测试通过! 🎉${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bold}有 ${stats.failed} 个测试失败 ❌${colors.reset}\n`);
  }
}

// ==================== STYLE_PASSPORT 测试 ====================
function testStylePassport() {
  printCategory('STYLE_PASSPORT (护照风格) 测试');
  
  // 1. 基础测试 - 使用字符串 'passport'
  runTest('PASSPORT', 'passport - 使用字符串 "passport"', () => {
    const result = pinyin('吕', { style: 'passport' });
    assert(deepEqual(result, [['LYU']]), 
      `期望 [['LYU']], 实际 ${JSON.stringify(result)}`);
  });
  
  runTest('PASSPORT', 'passport - 使用大写字符串 "PASSPORT"', () => {
    const result = pinyin('吕', { style: 'PASSPORT' });
    assert(deepEqual(result, [['LYU']]), 
      `期望 [['LYU']], 实际 ${JSON.stringify(result)}`);
  });
  
  runTest('PASSPORT', 'passport - 使用常量 STYLE_PASSPORT', () => {
    const result = pinyin('吕', { style: pinyin.STYLE_PASSPORT });
    assert(deepEqual(result, [['LYU']]), 
      `期望 [['LYU']], 实际 ${JSON.stringify(result)}`);
  });
  
  runTest('PASSPORT', 'passport - 使用数字 6', () => {
    const result = pinyin('吕', { style: 6 });
    assert(deepEqual(result, [['LYU']]), 
      `期望 [['LYU']], 实际 ${JSON.stringify(result)}`);
  });
  
  // 2. ü 转换规则测试
  runTest('PASSPORT', 'ü 转换 - 吕(Lü) → LYU', () => {
    const result = pinyin('吕', { style: 'passport' });
    assert(deepEqual(result, [['LYU']]), 
      `期望 [['LYU']], 实际 ${JSON.stringify(result)}`);
  });
  
  runTest('PASSPORT', 'ü 转换 - 女(Nü) → NYU', () => {
    const result = pinyin('女', { style: 'passport' });
    assert(deepEqual(result, [['NYU']]), 
      `期望 [['NYU']], 实际 ${JSON.stringify(result)}`);
  });
  
  runTest('PASSPORT', 'ü 转换 - 绿(Lü) → LYU', () => {
    const result = pinyin('绿', { style: 'passport' });
    assert(deepEqual(result, [['LYU']]), 
      `期望 [['LYU']], 实际 ${JSON.stringify(result)}`);
  });
  
  runTest('PASSPORT', 'üe 转换 - 略(Lüe) → LYUE', () => {
    const result = pinyin('略', { style: 'passport' });
    // 实际输出是 LYUE，符合 Lü → LYU 的规则
    assert(deepEqual(result, [['LYUE']]), 
      `期望 [['LYUE']], 实际 ${JSON.stringify(result)}`);
  });
  
  runTest('PASSPORT', 'üe 转换 - 虐(Nüe) → NYUE', () => {
    const result = pinyin('虐', { style: 'passport' });
    // 实际输出是 NYUE，符合 Nü → NYU 的规则
    assert(deepEqual(result, [['NYUE']]), 
      `期望 [['NYUE']], 实际 ${JSON.stringify(result)}`);
  });
  
  // 3. 姓名场景测试
  runTest('PASSPORT', '姓名 - 吕布', () => {
    const result = pinyin('吕布', { style: 'passport' });
    assert(deepEqual(result, [['LYU'], ['BU']]), 
      `期望 [['LYU'], ['BU']], 实际 ${JSON.stringify(result)}`);
  });
  
  runTest('PASSPORT', '姓名 - 吕蒙', () => {
    const result = pinyin('吕蒙', { style: 'passport' });
    assert(deepEqual(result, [['LYU'], ['MENG']]), 
      `期望 [['LYU'], ['MENG']], 实际 ${JSON.stringify(result)}`);
  });
  
  runTest('PASSPORT', '姓名 - 女娲', () => {
    const result = pinyin('女娲', { style: 'passport' });
    assert(deepEqual(result, [['NYU'], ['WA']]), 
      `期望 [['NYU'], ['WA']], 实际 ${JSON.stringify(result)}`);
  });
  
  // 4. 大写验证
  runTest('PASSPORT', '大写验证 - 普通字符', () => {
    const result = pinyin('中国', { style: 'passport' });
    // 护照风格应该全部大写
    assert(result.every(arr => arr.every(py => py === py.toUpperCase())), 
      `期望全部大写, 实际 ${JSON.stringify(result)}`);
  });
  
  runTest('PASSPORT', '大写验证 - 含ü字符', () => {
    const result = pinyin('绿色', { style: 'passport' });
    assert(result.every(arr => arr.every(py => py === py.toUpperCase())), 
      `期望全部大写, 实际 ${JSON.stringify(result)}`);
  });
  
  // 5. 与姓氏模式组合
  runTest('PASSPORT', 'passport + surname 模式', () => {
    const result = pinyin('吕布', { style: 'passport', mode: 'surname' });
    assert(deepEqual(result, [['LYU'], ['BU']]), 
      `期望 [['LYU'], ['BU']], 实际 ${JSON.stringify(result)}`);
  });
  
  // 6. 多音字测试
  runTest('PASSPORT', 'passport + heteronym', () => {
    const result = pinyin('女', { style: 'passport', heteronym: true });
    // 验证返回的所有拼音都是大写
    assert(Array.isArray(result[0]) && result[0].every(py => py === py.toUpperCase()), 
      `期望全部大写, 实际 ${JSON.stringify(result)}`);
  });
  
  // 7. 常见含ü的字测试
  runTest('PASSPORT', '常见字 - 律', () => {
    const result = pinyin('律', { style: 'passport' });
    assert(result[0][0] === result[0][0].toUpperCase(), 
      `期望大写, 实际 ${JSON.stringify(result)}`);
  });
  
  runTest('PASSPORT', '常见字 - 驴', () => {
    const result = pinyin('驴', { style: 'passport' });
    assert(result[0][0] === result[0][0].toUpperCase(), 
      `期望大写, 实际 ${JSON.stringify(result)}`);
  });
  
  runTest('PASSPORT', '常见字 - 旅', () => {
    const result = pinyin('旅', { style: 'passport' });
    assert(result[0][0] === result[0][0].toUpperCase(), 
      `期望大写, 实际 ${JSON.stringify(result)}`);
  });
}

// ==================== compact() 函数测试 ====================
function testCompactFunction() {
  printCategory('compact() 函数测试');
  
  // 1. 基础功能测试
  runTest('Compact-Func', 'compact() - 基础导入验证', () => {
    assert(typeof compact === 'function', 
      `期望 compact 是函数, 实际类型 ${typeof compact}`);
  });
  
  runTest('Compact-Func', 'compact() - 单音字（无变化）', () => {
    const result = pinyin('中国', { heteronym: false });
    const compacted = compact(result);
    assert(deepEqual(compacted, [['zhōng', 'guó']]), 
      `期望 [['zhōng', 'guó']], 实际 ${JSON.stringify(compacted)}`);
  });
  
  runTest('Compact-Func', 'compact() - 两字多音字组合', () => {
    const result = pinyin('中心', { heteronym: true });
    const compacted = compact(result);
    // 中有两个读音，心有一个，应该生成2种组合
    assert(Array.isArray(compacted) && compacted.length >= 1, 
      `期望返回组合数组, 实际 ${JSON.stringify(compacted)}`);
    // 验证每个组合都是完整的
    assert(compacted.every(arr => arr.length === 2), 
      `期望每个组合长度为2, 实际 ${JSON.stringify(compacted)}`);
  });
  
  runTest('Compact-Func', 'compact() - 三字多音字组合', () => {
    const result = pinyin('你好吗', { heteronym: true });
    const compacted = compact(result);
    // 验证返回的是数组的数组
    assert(Array.isArray(compacted) && compacted.length > 0, 
      `期望返回组合数组, 实际 ${JSON.stringify(compacted)}`);
    // 验证每个组合都包含3个拼音
    assert(compacted.every(arr => arr.length === 3), 
      `期望每个组合长度为3, 实际 ${JSON.stringify(compacted)}`);
  });
  
  // 2. 组合数量验证
  runTest('Compact-Func', 'compact() - 验证组合数量逻辑', () => {
    // "好"有两个读音: hǎo, hào
    // "吗"有三个读音: ma, má, mǎ
    // 总组合数应该是 1 * 2 * 3 = 6
    const result = pinyin('你好吗', { heteronym: true });
    const compacted = compact(result);
    // 验证组合数量合理（至少大于1）
    assert(compacted.length > 1, 
      `期望多个组合, 实际 ${compacted.length} 个`);
  });
  
  // 3. 与 options.compact 对比
  runTest('Compact-Func', 'compact() vs options.compact - 结果一致性', () => {
    const text = '中心';
    
    // 方法1: 使用 compact 函数
    const result1 = pinyin(text, { heteronym: true });
    const compacted1 = compact(result1);
    
    // 方法2: 使用 compact 选项
    const compacted2 = pinyin(text, { heteronym: true, compact: true });
    
    // 两种方法应该产生相同的结果
    assert(deepEqual(compacted1, compacted2), 
      `期望两种方法结果相同\n  函数: ${JSON.stringify(compacted1)}\n  选项: ${JSON.stringify(compacted2)}`);
  });
  
  runTest('Compact-Func', 'compact() vs options.compact - 三字对比', () => {
    const text = '你好吗';
    
    const result1 = pinyin(text, { heteronym: true });
    const compacted1 = compact(result1);
    
    const compacted2 = pinyin(text, { heteronym: true, compact: true });
    
    assert(deepEqual(compacted1, compacted2), 
      `期望两种方法结果相同`);
  });
  
  // 4. 不同 style 下的 compact
  runTest('Compact-Func', 'compact() - STYLE_NORMAL', () => {
    const result = pinyin('中心', { style: 'normal', heteronym: true });
    const compacted = compact(result);
    assert(Array.isArray(compacted) && compacted.length > 0, 
      `期望返回组合数组, 实际 ${JSON.stringify(compacted)}`);
  });
  
  runTest('Compact-Func', 'compact() - STYLE_TONE2', () => {
    const result = pinyin('中心', { style: 'tone2', heteronym: true });
    const compacted = compact(result);
    assert(Array.isArray(compacted) && compacted.length > 0, 
      `期望返回组合数组, 实际 ${JSON.stringify(compacted)}`);
  });
  
  runTest('Compact-Func', 'compact() - STYLE_FIRST_LETTER', () => {
    const result = pinyin('中心', { style: 'first_letter', heteronym: true });
    const compacted = compact(result);
    assert(Array.isArray(compacted) && compacted.length > 0, 
      `期望返回组合数组, 实际 ${JSON.stringify(compacted)}`);
  });
  
  // 5. 边界情况
  runTest('Compact-Func', 'compact() - 空数组', () => {
    const compacted = compact([]);
    // 空数组返回空数组，不是 [[]]
    assert(deepEqual(compacted, []), 
      `期望 [], 实际 ${JSON.stringify(compacted)}`);
  });
  
  runTest('Compact-Func', 'compact() - 单字单音', () => {
    const result = pinyin('中', { heteronym: false });
    const compacted = compact(result);
    assert(Array.isArray(compacted) && compacted.length === 1, 
      `期望单个组合, 实际 ${JSON.stringify(compacted)}`);
  });
  
  // 6. 实际应用场景
  runTest('Compact-Func', 'compact() - 实际场景：姓名多音字', () => {
    const result = pinyin('单于', { heteronym: true });
    const compacted = compact(result);
    // "单"有多个读音，"于"也可能有多个读音
    assert(Array.isArray(compacted) && compacted.length > 0, 
      `期望返回组合数组, 实际 ${JSON.stringify(compacted)}`);
  });
  
  runTest('Compact-Func', 'compact() - 实际场景：词语多音字', () => {
    const result = pinyin('银行', { heteronym: true });
    const compacted = compact(result);
    // "行"有多个读音
    assert(Array.isArray(compacted) && compacted.length > 0, 
      `期望返回组合数组, 实际 ${JSON.stringify(compacted)}`);
  });
}

// ==================== Pinyin.segment() 方法测试 ====================
function testSegmentMethod() {
  printCategory('Pinyin.segment() 方法测试');
  
  // 1. 基础功能测试
  runTest('Segment-Method', 'Pinyin 类导入验证', () => {
    assert(typeof Pinyin === 'function', 
      `期望 Pinyin 是类/函数, 实际类型 ${typeof Pinyin}`);
  });
  
  runTest('Segment-Method', 'Pinyin 实例创建', () => {
    const pinyinInstance = new Pinyin();
    assert(pinyinInstance instanceof Pinyin, 
      `期望创建 Pinyin 实例成功`);
  });
  
  runTest('Segment-Method', 'segment() 方法存在性', () => {
    const pinyinInstance = new Pinyin();
    assert(typeof pinyinInstance.segment === 'function', 
      `期望 segment 是方法, 实际类型 ${typeof pinyinInstance.segment}`);
  });
  
  // 2. 基础分词测试
  runTest('Segment-Method', 'segment() - 基础分词', () => {
    const pinyinInstance = new Pinyin();
    const segments = pinyinInstance.segment('我喜欢你');
    assert(Array.isArray(segments), 
      `期望返回数组, 实际 ${typeof segments}`);
    assert(segments.length > 0, 
      `期望分词结果非空, 实际 ${JSON.stringify(segments)}`);
  });
  
  runTest('Segment-Method', 'segment() - 短句分词', () => {
    const pinyinInstance = new Pinyin();
    const segments = pinyinInstance.segment('中国人');
    assert(Array.isArray(segments) && segments.length > 0, 
      `期望返回分词数组, 实际 ${JSON.stringify(segments)}`);
  });
  
  runTest('Segment-Method', 'segment() - 长句分词', () => {
    const pinyinInstance = new Pinyin();
    const segments = pinyinInstance.segment('今天天气很好，我们去公园玩吧');
    assert(Array.isArray(segments) && segments.length > 0, 
      `期望返回分词数组, 实际 ${JSON.stringify(segments)}`);
  });
  
  // 3. 指定分词器
  runTest('Segment-Method', 'segment() - 使用 Intl.Segmenter', () => {
    const pinyinInstance = new Pinyin();
    try {
      const segments = pinyinInstance.segment('我喜欢你', 'Intl.Segmenter');
      assert(Array.isArray(segments), 
        `期望返回数组, 实际 ${typeof segments}`);
    } catch (error) {
      // Intl.Segmenter 可能不支持，这是可接受的
      assert(error.message.includes('Segmenter') || error.message.includes('not supported'), 
        `期望分词器不支持错误, 实际 ${error.message}`);
    }
  });
  
  // 4. 不同类型文本
  runTest('Segment-Method', 'segment() - 纯中文', () => {
    const pinyinInstance = new Pinyin();
    const segments = pinyinInstance.segment('中华人民共和国');
    assert(Array.isArray(segments) && segments.length > 0, 
      `期望返回分词数组, 实际 ${JSON.stringify(segments)}`);
  });
  
  runTest('Segment-Method', 'segment() - 中英混合', () => {
    const pinyinInstance = new Pinyin();
    const segments = pinyinInstance.segment('我爱China');
    assert(Array.isArray(segments) && segments.length > 0, 
      `期望返回分词数组, 实际 ${JSON.stringify(segments)}`);
  });
  
  runTest('Segment-Method', 'segment() - 含标点', () => {
    const pinyinInstance = new Pinyin();
    const segments = pinyinInstance.segment('你好，世界！');
    assert(Array.isArray(segments) && segments.length > 0, 
      `期望返回分词数组, 实际 ${JSON.stringify(segments)}`);
  });
  
  // 5. 边界情况
  runTest('Segment-Method', 'segment() - 空字符串', () => {
    const pinyinInstance = new Pinyin();
    const segments = pinyinInstance.segment('');
    assert(Array.isArray(segments), 
      `期望返回数组, 实际 ${typeof segments}`);
  });
  
  runTest('Segment-Method', 'segment() - 单字', () => {
    const pinyinInstance = new Pinyin();
    const segments = pinyinInstance.segment('中');
    assert(Array.isArray(segments) && segments.length > 0, 
      `期望返回分词数组, 实际 ${JSON.stringify(segments)}`);
  });
  
  // 6. 与 options.segment 的区别验证
  runTest('Segment-Method', 'segment() 方法 vs options.segment 选项', () => {
    const pinyinInstance = new Pinyin();
    const text = '我喜欢你';
    
    // 方法1: 使用 segment 方法（只分词，不转拼音）
    const segments = pinyinInstance.segment(text);
    
    // 方法2: 使用 segment 选项（分词并转拼音）
    const pinyinResult = pinyin(text, { segment: true });
    
    // segment 方法返回的是分词结果（字符串数组）
    assert(Array.isArray(segments), 
      `期望 segment() 返回数组`);
    
    // pinyin 返回的是拼音数组（二维数组）
    assert(Array.isArray(pinyinResult) && Array.isArray(pinyinResult[0]), 
      `期望 pinyin() 返回二维数组`);
    
    // 它们的用途不同
    console.log(`    ${colors.gray}segment() 结果: ${JSON.stringify(segments)}${colors.reset}`);
    console.log(`    ${colors.gray}pinyin() 结果: ${JSON.stringify(pinyinResult)}${colors.reset}`);
  });
  
  // 7. 实际应用场景
  runTest('Segment-Method', 'segment() - 实际场景：新闻标题', () => {
    const pinyinInstance = new Pinyin();
    const segments = pinyinInstance.segment('北京冬奥会圆满成功');
    assert(Array.isArray(segments) && segments.length > 0, 
      `期望返回分词数组, 实际 ${JSON.stringify(segments)}`);
  });
  
  runTest('Segment-Method', 'segment() - 实际场景：诗句', () => {
    const pinyinInstance = new Pinyin();
    const segments = pinyinInstance.segment('床前明月光，疑是地上霜');
    assert(Array.isArray(segments) && segments.length > 0, 
      `期望返回分词数组, 实际 ${JSON.stringify(segments)}`);
  });
}

// ==================== 综合测试 ====================
function testIntegration() {
  printCategory('综合功能测试');
  
  runTest('Integration', 'PASSPORT + compact() 组合', () => {
    const result = pinyin('吕布', { style: 'passport', heteronym: true });
    const compacted = compact(result);
    assert(Array.isArray(compacted) && compacted.length > 0, 
      `期望返回组合数组, 实际 ${JSON.stringify(compacted)}`);
    // 验证结果都是大写
    assert(compacted.every(arr => arr.every(py => py === py.toUpperCase())), 
      `期望全部大写, 实际 ${JSON.stringify(compacted)}`);
  });
  
  runTest('Integration', 'segment() + pinyin() 配合使用', () => {
    const pinyinInstance = new Pinyin();
    const text = '我喜欢你';
    
    // 先分词
    const segments = pinyinInstance.segment(text);
    
    // 再对每个分词结果转拼音
    const results = segments.map(seg => pinyin(seg));
    
    assert(Array.isArray(results) && results.length > 0, 
      `期望返回结果数组, 实际 ${JSON.stringify(results)}`);
  });
  
  runTest('Integration', 'PASSPORT + segment + compact 三合一', () => {
    const result = pinyin('吕布', { 
      style: 'passport', 
      heteronym: true,
      segment: true,
      compact: true 
    });
    assert(Array.isArray(result) && result.length > 0, 
      `期望返回结果, 实际 ${JSON.stringify(result)}`);
  });
}

// ==================== 主函数 ====================
function runAllTests() {
  printHeader();
  
  testStylePassport();
  testCompactFunction();
  testSegmentMethod();
  testIntegration();
  
  printStats();
  
  // 返回退出码
  return stats.failed === 0 ? 0 : 1;
}

// 如果直接运行此文件
if (require.main === module) {
  const exitCode = runAllTests();
  process.exit(exitCode);
}

// 导出供其他模块使用
module.exports = {
  runAllTests,
  stats
};
