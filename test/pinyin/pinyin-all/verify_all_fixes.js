/**
 * 验证所有 Pinyin 修复的测试
 * 
 * 测试覆盖：
 * 1. P0-1: ConvertPhrase 函数（词组处理逻辑）
 * 2. P0-2: Compact 应用时机（segment + compact）
 * 3. P1-1: 单字/多字处理路径
 * 4. P1-2: 完整 Tokenizer 管道
 */

const startTime = Date.now();
const results = { passed: 0, failed: 0, tests: [] };

function test(name, fn) {
  const t0 = Date.now();
  try {
    const ok = fn();
    const dt = `${Date.now() - t0}ms`;
    if (ok) {
      results.tests.push({ name, status: 'passed', duration: dt });
      results.passed++;
    } else {
      results.tests.push({ name, status: 'failed', duration: dt, error: 'assertion failed' });
      results.failed++;
    }
  } catch (e) {
    results.tests.push({ 
      name, 
      status: 'failed', 
      duration: `${Date.now() - t0}ms`, 
      error: e && e.message || String(e) 
    });
    results.failed++;
  }
}

const isArray = Array.isArray;
const eq2D = (a, b) => {
  if (!isArray(a) || !isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i], bi = b[i];
    if (!isArray(ai) || !isArray(bi) || ai.length !== bi.length) return false;
    for (let j = 0; j < ai.length; j++) if (ai[j] !== bi[j]) return false;
  }
  return true;
};

// 加载 pinyin 模块
let mod;
test('加载 pinyin 模块', () => {
  mod = require('pinyin');
  return !!mod;
});
const pinyin = mod.pinyin || mod.default || mod;

// ========================================
// P1-1: 单字/多字处理路径测试
// ========================================
console.log('\n=== P1-1: 单字/多字处理路径测试 ===');

test('单字处理 - 中', () => {
  const result = pinyin('中', { segment: true });
  const expected = [['zhōng']];
  console.log('  结果:', JSON.stringify(result));
  return eq2D(result, expected);
});

test('多字处理 - 中国（在词典中）', () => {
  const result = pinyin('中国', { segment: true });
  const expected = [['zhōng'], ['guó']];
  console.log('  结果:', JSON.stringify(result));
  return eq2D(result, expected);
});

test('多字处理 - 未知词（不在词典，逐字转换）', () => {
  const result = pinyin('测试词', { segment: true });
  // 应该逐字转换
  console.log('  结果:', JSON.stringify(result));
  return result.length === 3;
});

// ========================================
// P0-1: ConvertPhrase 函数测试（词组处理）
// ========================================
console.log('\n=== P0-1: ConvertPhrase 词组处理测试 ===');

test('词组在字典中 - 喜欢', () => {
  const result = pinyin('喜欢', { segment: true });
  const expected = [['xǐ'], ['huān']];
  console.log('  结果:', JSON.stringify(result));
  return eq2D(result, expected);
});

test('词组不在字典（兜底逻辑）- 随机词', () => {
  const result = pinyin('随机词', { segment: true });
  // 应该逐字转换
  console.log('  结果:', JSON.stringify(result));
  return result.length === 3 && result[0][0] === 'suí';
});

// ========================================
// P0-2: Compact 应用时机测试
// ========================================
console.log('\n=== P0-2: Compact 应用时机测试 ===');

test('segment + compact - 你好吗（6组合）', () => {
  const result = pinyin('你好吗', { 
    segment: true, 
    heteronym: true, 
    compact: true 
  });
  console.log('  结果数量:', result.length);
  console.log('  前3组:', JSON.stringify(result.slice(0, 3)));
  // 应该有多个组合（好有两个读音 hǎo/hào，吗有多个读音）
  return result.length >= 2;
});

test('segment + group + compact - 中国', () => {
  const result = pinyin('中国', { 
    segment: true, 
    group: true,
    heteronym: true,
    compact: true 
  });
  console.log('  结果:', JSON.stringify(result));
  // group 模式下，中国应该合并
  return result.length >= 1 && result[0] && result[0][0].includes('zhōng');
});

// ========================================
// segment + group 模式测试（核心功能）
// ========================================
console.log('\n=== segment + group 核心测试 ===');

test('segment + group - 我喜欢你', () => {
  const result = pinyin('我喜欢你', { segment: true, group: true });
  const expected = [['wǒ'], ['xǐhuān'], ['nǐ']];
  console.log('  结果:', JSON.stringify(result));
  console.log('  期望:', JSON.stringify(expected));
  return eq2D(result, expected);
});

test('segment + group - 中国（无空格）', () => {
  const result = pinyin('中国', { segment: true, group: true });
  console.log('  结果:', JSON.stringify(result));
  // 应该是 [["zhōngguó"]]，中间无空格
  return result.length === 1 && 
         result[0].length === 1 && 
         result[0][0] === 'zhōngguó';
});

test('segment + group - 我爱中国', () => {
  const result = pinyin('我爱中国', { segment: true, group: true });
  console.log('  结果:', JSON.stringify(result));
  // 我、爱、中国 应该分别分组，中国内部无空格
  return result.length === 3 && 
         result[2][0] === 'zhōngguó';
});

// ========================================
// P1-2: Tokenizer 管道测试
// ========================================
console.log('\n=== P1-2: Tokenizer 管道测试 ===');

test('PunctuationTokenizer - 你好，世界！', () => {
  const result = pinyin('你好，世界！', { segment: true });
  console.log('  结果:', JSON.stringify(result));
  // 标点应该被单独识别
  return result.some(r => r[0] === '，' || r[0] === '！');
});

test('ForeignTokenizer - A中B', () => {
  const result = pinyin('A中B', { segment: true });
  console.log('  结果:', JSON.stringify(result));
  // 英文字符应该保持原样
  return result.some(r => r[0] === 'A') && 
         result.some(r => r[0] === 'B');
});

test('ForeignTokenizer - 我有123个', () => {
  const result = pinyin('我有123个', { segment: true });
  console.log('  结果:', JSON.stringify(result));
  // 数字应该保持原样
  return result.some(r => r[0] === '123');
});

test('URLTokenizer - 访问http://baidu.com', () => {
  const result = pinyin('访问http://baidu.com', { segment: true });
  console.log('  结果:', JSON.stringify(result));
  // URL 应该保持完整
  return result.some(r => r[0].includes('http://'));
});

// ========================================
// 多音字处理（heteronym）
// ========================================
console.log('\n=== 多音字处理测试 ===');

test('heteronym - 重（多个读音）', () => {
  const result = pinyin('重', { heteronym: true });
  console.log('  结果:', JSON.stringify(result));
  // 应该包含 zhòng 和 chóng
  return result[0].length >= 2;
});

test('heteronym + segment - 音乐（消歧）', () => {
  const result = pinyin('音乐', { segment: true, heteronym: false });
  const expected = [['yīn'], ['yuè']];
  console.log('  结果:', JSON.stringify(result));
  console.log('  期望:', JSON.stringify(expected));
  return eq2D(result, expected);
});

// ========================================
// 综合测试
// ========================================
console.log('\n=== 综合测试 ===');

test('混合内容 - 我😀你', () => {
  const result = pinyin('我😀你', { segment: true });
  console.log('  结果:', JSON.stringify(result));
  // emoji 应该保持原样
  return result.some(r => r[0] === '😀');
});

test('空字符串', () => {
  const result = pinyin('', { segment: true });
  return isArray(result) && result.length === 0;
});

test('只有标点 - ，。！', () => {
  const result = pinyin('，。！', { segment: true });
  console.log('  结果:', JSON.stringify(result));
  // ⭐ 修正：根据 JS 原版逻辑，连续的非汉字字符会被累积为一个元素
  // normal_pinyin 会将 "，。！" 累积成一个元素: [["，。！"]]
  return result.length === 1 && result[0][0] === '，。！';
});

// ========================================
// 汇总
// ========================================
const totalDuration = Date.now() - startTime;
const successRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(2);

console.log('\n' + '='.repeat(60));
console.log('测试汇总');
console.log('='.repeat(60));
console.log(`总计: ${results.passed + results.failed} 个测试`);
console.log(`通过: ${results.passed} 个 ✅`);
console.log(`失败: ${results.failed} 个 ❌`);
console.log(`成功率: ${successRate}%`);
console.log(`总耗时: ${totalDuration}ms`);
console.log('='.repeat(60));

// 输出详细结果
const failedTests = results.tests.filter(t => t.status === 'failed');
if (failedTests.length > 0) {
  console.log('\n❌ 失败的测试:');
  failedTests.forEach(t => {
    console.log(`  - ${t.name}: ${t.error}`);
  });
}

const result = {
  summary: {
    total: results.passed + results.failed,
    passed: results.passed,
    failed: results.failed,
    successRate: `${successRate}%`,
    totalDuration: `${totalDuration}ms`
  },
  details: results.tests
};

console.log('\nJSON 输出:');
console.log(JSON.stringify(result, null, 2));
