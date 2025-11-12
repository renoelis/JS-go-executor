// Buffer.alloc 最终查缺补漏测试
const { Buffer } = require('buffer');

const tests = [];
function test(category, name, fn) {
  try {
    const pass = fn();
    tests.push({ category, name, status: pass ? '✅' : '❌', pass });
  } catch (e) {
    tests.push({ category, name, status: '❌', pass: false, error: e.message });
  }
}

// === 1. 特殊数值处理 ===
test('special_numbers', '0值填充', () => {
  const buf = Buffer.alloc(3, 0);
  return buf.toString('hex') === '000000';
});

test('special_numbers', '负零填充', () => {
  const buf = Buffer.alloc(3, -0);
  return buf.toString('hex') === '000000';
});

test('special_numbers', '浮点数填充', () => {
  const buf = Buffer.alloc(3, 65.7);
  return buf.toString('hex') === '414141';
});

test('special_numbers', '负浮点数填充', () => {
  const buf = Buffer.alloc(3, -65.7);
  return buf.toString('hex') === 'bfbfbf';
});

test('special_numbers', '大数值填充', () => {
  const buf = Buffer.alloc(3, 256);
  return buf.toString('hex') === '000000';
});

test('special_numbers', '大负数填充', () => {
  const buf = Buffer.alloc(3, -256);
  return buf.toString('hex') === '000000';
});

// === 2. 字符串编码边界 ===
test('string_encoding', '空字符串填充', () => {
  const buf = Buffer.alloc(3, '');
  return buf.toString('hex') === '000000';
});

test('string_encoding', '单字符填充', () => {
  const buf = Buffer.alloc(5, 'A');
  return buf.toString('hex') === '4141414141';
});

test('string_encoding', '多字节UTF8字符', () => {
  const buf = Buffer.alloc(6, '中');
  return buf.toString('hex') === 'e4b8ade4b8ad';
});

test('string_encoding', 'emoji字符填充', () => {
  const buf = Buffer.alloc(8, '😀');
  return buf.toString('hex') === 'f09f9880f09f9880';
});

test('string_encoding', 'hex编码空字符串', () => {
  const buf = Buffer.alloc(3, '', 'hex');
  return buf.toString('hex') === '000000';
});

test('string_encoding', 'base64编码空字符串', () => {
  const buf = Buffer.alloc(3, '', 'base64');
  return buf.toString('hex') === '000000';
});

// === 3. Buffer/TypedArray填充 ===
test('buffer_fill', 'Buffer作为fill参数', () => {
  const fillBuf = Buffer.from([0xAA, 0xBB]);
  const buf = Buffer.alloc(6, fillBuf);
  return buf.toString('hex') === 'aabbaabbaabb';
});

test('buffer_fill', 'Uint8Array作为fill参数', () => {
  const fillArr = new Uint8Array([0xCC, 0xDD]);
  const buf = Buffer.alloc(6, fillArr);
  return buf.toString('hex') === 'ccddccddccdd';
});

test('buffer_fill', '空Buffer作为fill参数', () => {
  try {
    const fillBuf = Buffer.from([]);
    Buffer.alloc(3, fillBuf);
    return false; // Node.js会抛出错误
  } catch (e) {
    return e.message.includes('invalid');
  }
});

test('buffer_fill', '单字节Buffer填充', () => {
  const fillBuf = Buffer.from([0xEE]);
  const buf = Buffer.alloc(4, fillBuf);
  return buf.toString('hex') === 'eeeeeeee';
});

// === 4. 编码参数验证 ===
test('encoding_validation', 'undefined编码参数', () => {
  const buf = Buffer.alloc(3, 'test', undefined);
  return buf.length === 3;
});

test('encoding_validation', 'null编码参数', () => {
  const buf = Buffer.alloc(3, 'test', null);
  return buf.length === 3; // null被当作undefined处理
});

test('encoding_validation', '数字编码参数', () => {
  try {
    Buffer.alloc(3, 'test', 123);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('encoding_validation', '对象编码参数', () => {
  try {
    Buffer.alloc(3, 'test', {});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// === 5. size参数边界 ===
test('size_boundaries', 'size为0.5', () => {
  const buf = Buffer.alloc(0.5);
  return buf.length === 0;
});

test('size_boundaries', 'size为1.9', () => {
  const buf = Buffer.alloc(1.9);
  return buf.length === 1;
});

test('size_boundaries', 'size为字符串"10"', () => {
  try {
    Buffer.alloc('10');
    return false; // Node.js严格类型检查
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('size_boundaries', 'size为字符串"0"', () => {
  try {
    Buffer.alloc('0');
    return false; // Node.js严格类型检查
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('size_boundaries', 'size为布尔true', () => {
  try {
    Buffer.alloc(true);
    return false; // Node.js严格类型检查
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('size_boundaries', 'size为布尔false', () => {
  try {
    Buffer.alloc(false);
    return false; // Node.js严格类型检查
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// === 6. 填充模式验证 ===
test('fill_pattern', '填充字符串长度大于buffer', () => {
  const buf = Buffer.alloc(3, 'ABCDEFGH');
  return buf.toString() === 'ABC';
});

test('fill_pattern', '填充字符串长度等于buffer', () => {
  const buf = Buffer.alloc(3, 'ABC');
  return buf.toString() === 'ABC';
});

test('fill_pattern', '填充字符串重复模式', () => {
  const buf = Buffer.alloc(7, 'AB');
  return buf.toString() === 'ABABABA';
});

// === 7. 内存安全性 ===
test('memory_safety', '连续分配不互相影响', () => {
  const buf1 = Buffer.alloc(3, 0xAA);
  const buf2 = Buffer.alloc(3, 0xBB);
  return buf1.toString('hex') === 'aaaaaa' && buf2.toString('hex') === 'bbbbbb';
});

test('memory_safety', '修改fill参数不影响已创建buffer', () => {
  const fillBuf = Buffer.from([0xCC]);
  const buf = Buffer.alloc(3, fillBuf);
  fillBuf[0] = 0xDD;
  return buf.toString('hex') === 'cccccc';
});

// === 8. 特殊对象处理 ===
test('special_objects', 'null作为fill参数', () => {
  const buf = Buffer.alloc(3, null);
  return buf.toString('hex') === '000000';
});

test('special_objects', 'undefined作为fill参数', () => {
  const buf = Buffer.alloc(3, undefined);
  return buf.toString('hex') === '000000';
});

test('special_objects', '数组作为fill参数', () => {
  const buf = Buffer.alloc(3, [65, 66]);
  return buf.toString('hex') === '000000'; // 数组被当作对象处理
});

test('special_objects', '函数作为fill参数', () => {
  const buf = Buffer.alloc(3, function() {});
  return buf.toString('hex') === '000000';
});

// === 9. 编码特殊情况 ===
test('encoding_special', 'latin1高位字符', () => {
  const buf = Buffer.alloc(3, '\xFF', 'latin1');
  return buf.toString('hex') === 'ffffff';
});

test('encoding_special', 'utf16le BOM', () => {
  const buf = Buffer.alloc(4, '\uFEFF', 'utf16le');
  return buf.length === 4;
});

test('encoding_special', 'hex奇数长度', () => {
  const buf = Buffer.alloc(3, 'ABC', 'hex');
  return buf.toString('hex') === 'ababab'; // hex奇数长度会截断最后一位，然后重复填充
});

test('encoding_special', 'base64 padding', () => {
  const buf = Buffer.alloc(4, 'YWJj', 'base64');
  return buf.toString('hex') === '61626361';
});

// 统计结果
const byCategory = {};
tests.forEach(t => {
  if (!byCategory[t.category]) {
    byCategory[t.category] = { total: 0, passed: 0 };
  }
  byCategory[t.category].total++;
  if (t.pass) byCategory[t.category].passed++;
});

const totalTests = tests.length;
const passedTests = tests.filter(t => t.pass).length;
const failedTests = tests.filter(t => !t.pass);

console.log('=== Buffer.alloc 查缺补漏测试结果 ===\n');

Object.keys(byCategory).forEach(cat => {
  const stats = byCategory[cat];
  const status = stats.passed === stats.total ? '✅' : '❌';
  console.log(`${status} ${cat}: ${stats.passed}/${stats.total}`);
});

console.log(`\n总计: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(2)}%)`);

if (failedTests.length > 0) {
  console.log('\n=== 失败的测试 ===');
  failedTests.forEach(t => {
    console.log(`❌ [${t.category}] ${t.name}${t.error ? ': ' + t.error : ''}`);
  });
}

return {
  total: totalTests,
  passed: passedTests,
  failed: failedTests.length,
  success_rate: ((passedTests/totalTests)*100).toFixed(2),
  by_category: byCategory,
  failed_tests: failedTests.map(t => ({ category: t.category, name: t.name, error: t.error }))
};
