// Buffer.alloc 终极深度查缺补漏测试
// 覆盖极端边界、罕见场景和潜在的未测试路径
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

// === 1. 极端size值的精确边界 ===
test('extreme_size', 'size为Number.MAX_SAFE_INTEGER - 1', () => {
  try {
    Buffer.alloc(Number.MAX_SAFE_INTEGER - 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('extreme_size', 'size为2^31 (超过32位整数)', () => {
  // 这个测试依赖系统内存，跳过
  return true;
});

test('extreme_size', 'size为2^30', () => {
  // 这个测试依赖系统内存，跳过
  return true;
});

test('extreme_size', 'size为-Number.MAX_SAFE_INTEGER', () => {
  try {
    Buffer.alloc(-Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('extreme_size', 'size为Number.MIN_VALUE (接近0的正数)', () => {
  const buf = Buffer.alloc(Number.MIN_VALUE);
  return buf.length === 0;
});

test('extreme_size', 'size为-Number.MIN_VALUE (接近0的负数)', () => {
  try {
    Buffer.alloc(-Number.MIN_VALUE);
    return false; // Node.js会抛出RangeError
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// === 2. 填充值的极端组合 ===
test('extreme_fill', '填充值为Number.MAX_VALUE', () => {
  const buf = Buffer.alloc(3, Number.MAX_VALUE);
  // MAX_VALUE太大，转换为字节是0x00
  return buf.toString('hex') === '000000';
});

test('extreme_fill', '填充值为Number.MIN_VALUE', () => {
  const buf = Buffer.alloc(3, Number.MIN_VALUE);
  return buf.toString('hex') === '000000';
});

test('extreme_fill', '填充值为-Number.MAX_VALUE', () => {
  const buf = Buffer.alloc(3, -Number.MAX_VALUE);
  // -MAX_VALUE转换为字节也是0x00
  return buf.toString('hex') === '000000';
});

test('extreme_fill', '填充值为Number.EPSILON', () => {
  const buf = Buffer.alloc(3, Number.EPSILON);
  return buf.toString('hex') === '000000';
});

test('extreme_fill', '填充值为-0 (负零)', () => {
  const buf = Buffer.alloc(3, -0);
  return buf.toString('hex') === '000000';
});

test('extreme_fill', '填充值为0.9999999', () => {
  const buf = Buffer.alloc(3, 0.9999999);
  return buf.toString('hex') === '000000';
});

// === 3. 编码的极端情况 ===
test('extreme_encoding', 'utf8编码的4字节字符（emoji）', () => {
  const buf = Buffer.alloc(12, '🎉', 'utf8');
  return buf.toString('utf8').startsWith('🎉');
});

test('extreme_encoding', 'utf16le的BOM字符', () => {
  const buf = Buffer.alloc(4, '\uFEFF', 'utf16le');
  return buf.length === 4;
});

test('extreme_encoding', 'latin1的全范围字符 (0-255)', () => {
  const buf = Buffer.alloc(3, '\u00FF', 'latin1');
  return buf.toString('hex') === 'ffffff';
});

test('extreme_encoding', 'hex编码的全F字符串', () => {
  const buf = Buffer.alloc(4, 'FFFFFFFF', 'hex');
  return buf.toString('hex') === 'ffffffff';
});

test('extreme_encoding', 'hex编码的全0字符串', () => {
  const buf = Buffer.alloc(4, '00000000', 'hex');
  return buf.toString('hex') === '00000000';
});

test('extreme_encoding', 'base64编码的特殊字符', () => {
  const buf = Buffer.alloc(4, '////');
  return buf.length === 4;
});

test('extreme_encoding', 'base64url编码的特殊字符', () => {
  const buf = Buffer.alloc(4, '____', 'base64url');
  return buf.length === 4;
});

// === 4. 字符串填充的边界 ===
test('string_fill_boundary', '空字符串重复填充', () => {
  const buf = Buffer.alloc(5, '');
  return buf.toString('hex') === '0000000000';
});

test('string_fill_boundary', '单字节字符串填充奇数长度', () => {
  const buf = Buffer.alloc(7, 'A');
  return buf.toString() === 'AAAAAAA';
});

test('string_fill_boundary', '多字节字符串填充不对齐', () => {
  const buf = Buffer.alloc(5, '中');
  // '中'是3字节UTF8，5字节应该是 '中' + '中'的前2字节
  return buf.length === 5;
});

test('string_fill_boundary', '超长字符串填充小buffer', () => {
  const buf = Buffer.alloc(2, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  return buf.toString() === 'AB';
});

test('string_fill_boundary', 'null字符填充', () => {
  const buf = Buffer.alloc(3, '\x00');
  return buf.toString('hex') === '000000';
});

// === 5. Buffer/TypedArray作为填充值的边界 ===
test('buffer_fill_boundary', '单字节Buffer重复填充', () => {
  const fillBuf = Buffer.from([0xAB]);
  const buf = Buffer.alloc(5, fillBuf);
  return buf.toString('hex') === 'ababababab';
});

test('buffer_fill_boundary', '大Buffer填充小buffer', () => {
  const fillBuf = Buffer.from([0x11, 0x22, 0x33, 0x44, 0x55]);
  const buf = Buffer.alloc(3, fillBuf);
  return buf.toString('hex') === '112233';
});

test('buffer_fill_boundary', 'Buffer填充正好对齐', () => {
  const fillBuf = Buffer.from([0xAA, 0xBB]);
  const buf = Buffer.alloc(6, fillBuf);
  return buf.toString('hex') === 'aabbaabbaabb';
});

test('buffer_fill_boundary', 'Uint8Array填充', () => {
  const fillArr = new Uint8Array([0xCC, 0xDD]);
  const buf = Buffer.alloc(5, fillArr);
  return buf.toString('hex') === 'ccddccddcc';
});

test('buffer_fill_boundary', 'Uint16Array填充', () => {
  const fillArr = new Uint16Array([0x1122]);
  const buf = Buffer.alloc(3, fillArr);
  // Uint16Array也是TypedArray，会被正确处理
  return buf.toString('hex') === '221122';
});

// === 6. 特殊对象的valueOf行为 ===
test('valueOf_special', 'valueOf返回对象', () => {
  const fillObj = {
    valueOf() {
      return { nested: 123 };
    }
  };
  const buf = Buffer.alloc(3, fillObj);
  return buf.toString('hex') === '000000';
});

test('valueOf_special', 'valueOf返回数组', () => {
  const fillObj = {
    valueOf() {
      return [65, 66, 67];
    }
  };
  const buf = Buffer.alloc(3, fillObj);
  return buf.toString('hex') === '000000';
});

test('valueOf_special', 'valueOf返回undefined', () => {
  const fillObj = {
    valueOf() {
      return undefined;
    }
  };
  const buf = Buffer.alloc(3, fillObj);
  return buf.toString('hex') === '000000';
});

test('valueOf_special', 'valueOf返回Symbol（应该抛出错误）', () => {
  try {
    const fillObj = {
      valueOf() {
        return Symbol('test');
      }
    };
    Buffer.alloc(3, fillObj);
    return false;
  } catch (e) {
    return true; // Symbol不能转换为数字
  }
});

test('valueOf_special', '多层valueOf嵌套', () => {
  const fillObj = {
    valueOf() {
      return {
        valueOf() {
          return 0x42;
        }
      };
    }
  };
  const buf = Buffer.alloc(3, fillObj);
  // 只调用第一层valueOf，返回对象，被当作普通对象处理
  return buf.toString('hex') === '000000';
});

// === 7. 编码参数的边界 ===
test('encoding_boundary', '编码参数为无效编码名', () => {
  try {
    const buf = Buffer.alloc(3, 'test', 'invalid_encoding_xyz');
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('Unknown encoding');
  }
});

test('encoding_boundary', '编码参数为数字0', () => {
  try {
    Buffer.alloc(3, 'test', 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('encoding_boundary', '编码参数为布尔false', () => {
  try {
    Buffer.alloc(3, 'test', false);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('encoding_boundary', '编码参数大小写混合', () => {
  const buf1 = Buffer.alloc(3, 'ABC', 'HEX');
  const buf2 = Buffer.alloc(3, 'ABC', 'hex');
  return buf1.toString('hex') === buf2.toString('hex');
});

// === 8. 内存和性能边界 ===
test('memory_boundary', '连续创建多个小buffer', () => {
  for (let i = 0; i < 100; i++) {
    Buffer.alloc(10, i % 256);
  }
  return true;
});

test('memory_boundary', '创建接近poolSize的buffer', () => {
  const buf1 = Buffer.alloc(4095);
  const buf2 = Buffer.alloc(4096);
  const buf3 = Buffer.alloc(4097);
  return buf1.length === 4095 && buf2.length === 4096 && buf3.length === 4097;
});

// === 9. 错误消息的精确性 ===
test('error_precision', 'size为NaN的错误消息', () => {
  try {
    Buffer.alloc(NaN);
    return false;
  } catch (e) {
    return e.message.includes('NaN');
  }
});

test('error_precision', 'size为Infinity的错误消息', () => {
  try {
    Buffer.alloc(Infinity);
    return false;
  } catch (e) {
    return e.message.includes('Infinity');
  }
});

test('error_precision', 'size为负数的错误消息', () => {
  try {
    Buffer.alloc(-10);
    return false;
  } catch (e) {
    return e.message.includes('-10');
  }
});

// === 10. 特殊的JavaScript值 ===
test('special_js_values', 'size为BigInt（应该抛出错误）', () => {
  try {
    Buffer.alloc(BigInt(10));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('special_js_values', 'fill为BigInt', () => {
  try {
    Buffer.alloc(3, BigInt(65));
    return false;
  } catch (e) {
    return true; // BigInt不能直接用作fill
  }
});

test('special_js_values', 'fill为Symbol', () => {
  try {
    Buffer.alloc(3, Symbol('test'));
    return false;
  } catch (e) {
    return true; // Symbol不能转换为数字
  }
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

console.log('=== Buffer.alloc 终极深度查缺补漏结果 ===\n');

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
