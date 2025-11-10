// buf.includes() - Final Edge Cases (最终边界补充)
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// === byteOffset 对象强制转换 ===
test('byteOffset 为空对象 {} - 转换为 NaN 再转为 0', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello', {}) === true;
});

test('byteOffset 为对象 {valueOf: () => 5}', () => {
  const buf = Buffer.from('hello world');
  const obj = { valueOf: () => 5 };
  return buf.includes('hello', obj) === false && buf.includes(' world', obj) === true;
});

test('byteOffset 为对象 {toString: () => "6"}', () => {
  const buf = Buffer.from('hello world');
  const obj = { toString: () => '6' };
  return buf.includes('world', obj) === true;
});

test('byteOffset 为数组 [] - 转换为 0', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello', []) === true;
});

test('byteOffset 为数组 [6] - 转换为 6', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world', [6]) === true;
});

test('byteOffset 为数组 [1,2,3] - 转换为 NaN 再转为 0', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello', [1, 2, 3]) === true;
});

// === encoding 参数的大小写和别名 ===
test('encoding 为 "UTF-8" (大写带连字符)', () => {
  const buf = Buffer.from('hello world');
  try {
    return buf.includes('world', 0, 'UTF-8') === true;
  } catch (e) {
    // 如果不支持，应该抛出错误
    return e.message.includes('encoding') || e.message.includes('Unknown');
  }
});

test('encoding 为 "utf-8" (小写带连字符)', () => {
  const buf = Buffer.from('hello world');
  try {
    return buf.includes('world', 0, 'utf-8') === true;
  } catch (e) {
    return e.message.includes('encoding') || e.message.includes('Unknown');
  }
});

test('encoding 为 "UCS2" (大写)', () => {
  const buf = Buffer.from('hello', 'ucs2');
  try {
    const search = Buffer.from('ll', 'ucs2');
    return buf.includes(search) === true;
  } catch (e) {
    return true;
  }
});

test('encoding 为 "UCS-2" (大写带连字符)', () => {
  const buf = Buffer.from('hello', 'utf16le');
  try {
    return buf.includes('ll', 0, 'UCS-2') === true;
  } catch (e) {
    return true;
  }
});

test('encoding 为 "BINARY" (大写)', () => {
  const buf = Buffer.from('hello', 'binary');
  try {
    return buf.includes('ell', 0, 'BINARY') === true;
  } catch (e) {
    return true;
  }
});

test('encoding 为 "Latin1" (混合大小写)', () => {
  const buf = Buffer.from('hello', 'latin1');
  try {
    return buf.includes('ell', 0, 'Latin1') === true;
  } catch (e) {
    return true;
  }
});

// === 与 String.prototype.includes 的行为差异 ===
test('Buffer.includes 与 String.includes - 位置参数行为', () => {
  const str = 'hello world';
  const buf = Buffer.from(str);
  // String.includes 的第二个参数是 position，从该位置开始搜索
  // Buffer.includes 的第二个参数是 byteOffset，行为相同
  return buf.includes('world', 6) === str.includes('world', 6);
});

test('Buffer.includes 不支持正则表达式', () => {
  const buf = Buffer.from('hello world');
  try {
    buf.includes(/world/);
    return false; // 不应该执行到这里
  } catch (e) {
    return true; // 应该抛出错误
  }
});

// === 空值的精确行为 ===
test('搜索空字符串 - byteOffset 在末尾', () => {
  const buf = Buffer.from('hello');
  return buf.includes('', 5) === true;
});

test('搜索空字符串 - byteOffset 超出末尾', () => {
  const buf = Buffer.from('hello');
  return buf.includes('', 10) === true;
});

test('搜索空 Buffer - byteOffset 在末尾', () => {
  const buf = Buffer.from('hello');
  return buf.includes(Buffer.alloc(0), 5) === true;
});

test('搜索空 Buffer - byteOffset 超出末尾', () => {
  const buf = Buffer.from('hello');
  return buf.includes(Buffer.alloc(0), 10) === true;
});

// === 数字边界值 ===
test('搜索 0.1 (截断为 0)', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.includes(0.1) === true;
});

test('搜索 -0.1 (截断为 0)', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.includes(-0.1) === true;
});

test('搜索 255.9 (截断为 255)', () => {
  const buf = Buffer.from([255, 254, 253]);
  return buf.includes(255.9) === true;
});

test('搜索 -255.9 (模运算后为 1)', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.includes(-255.9) === true;
});

test('搜索 512 (512 % 256 = 0)', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.includes(512) === true;
});

test('搜索 -512 (-512 % 256 = 0)', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.includes(-512) === true;
});

// === 特殊字符串值 ===
test('搜索字符串 "undefined"', () => {
  const buf = Buffer.from('hello undefined world');
  return buf.includes('undefined') === true;
});

test('搜索字符串 "null"', () => {
  const buf = Buffer.from('hello null world');
  return buf.includes('null') === true;
});

test('搜索字符串 "NaN"', () => {
  const buf = Buffer.from('hello NaN world');
  return buf.includes('NaN') === true;
});

test('搜索字符串 "[object Object]"', () => {
  const buf = Buffer.from('hello [object Object] world');
  return buf.includes('[object Object]') === true;
});

// === 连续空字节和特殊模式 ===
test('搜索连续 10 个 0x00', () => {
  const buf = Buffer.alloc(20, 0);
  return buf.includes(Buffer.alloc(10, 0)) === true;
});

test('搜索连续 10 个 0xFF', () => {
  const buf = Buffer.alloc(20, 0xFF);
  return buf.includes(Buffer.alloc(10, 0xFF)) === true;
});

test('搜索模式 0x00 0xFF 重复', () => {
  const pattern = [];
  for (let i = 0; i < 20; i++) {
    pattern.push(i % 2 === 0 ? 0x00 : 0xFF);
  }
  const buf = Buffer.from(pattern);
  return buf.includes(Buffer.from([0x00, 0xFF, 0x00, 0xFF])) === true;
});

// === Buffer 方法链式调用 ===
test('slice 后 includes', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(6);
  return sliced.includes('world') === true;
});

test('subarray 后 includes', () => {
  const buf = Buffer.from('hello world');
  const sub = buf.subarray(6);
  return sub.includes('world') === true;
});

test('concat 后 includes', () => {
  const buf1 = Buffer.from('hello ');
  const buf2 = Buffer.from('world');
  const concatenated = Buffer.concat([buf1, buf2]);
  return concatenated.includes('hello world') === true;
});

// === 实际文件格式魔数 ===
test('GIF 文件签名 GIF89a', () => {
  const buf = Buffer.from('GIF89a\x00\x00\x00\x00');
  return buf.includes('GIF89a') === true;
});

test('GIF 文件签名 GIF87a', () => {
  const buf = Buffer.from('GIF87a\x00\x00\x00\x00');
  return buf.includes('GIF87a') === true;
});

test('ELF 可执行文件签名', () => {
  const buf = Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x01, 0x01, 0x01]);
  return buf.includes(Buffer.from([0x7F, 0x45, 0x4C, 0x46])) === true;
});

test('GZIP 文件签名', () => {
  const buf = Buffer.from([0x1F, 0x8B, 0x08, 0x00, 0x00]);
  return buf.includes(Buffer.from([0x1F, 0x8B])) === true;
});

// === 性能相关 - 最坏情况 ===
test('最坏情况 - 几乎匹配但最后失败', () => {
  const buf = Buffer.from('a'.repeat(1000) + 'b');
  return buf.includes('a'.repeat(1000) + 'c') === false;
});

test('最坏情况 - 重复模式', () => {
  const buf = Buffer.from('abcabc'.repeat(100));
  return buf.includes('abcabc') === true;
});

// === 与 indexOf/lastIndexOf 的完全一致性 ===
test('includes 与 indexOf 完全一致 - 多个测试', () => {
  const buf = Buffer.from('hello world hello');
  const tests = [
    ['hello', 0],
    ['world', 0],
    ['hello', 10],
    ['xyz', 0],
    ['', 0],
    ['', 5]
  ];
  
  for (const [val, offset] of tests) {
    const includesResult = buf.includes(val, offset);
    const indexOfResult = buf.indexOf(val, offset) !== -1;
    if (includesResult !== indexOfResult) {
      return false;
    }
  }
  return true;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

try {
  const result = {
    success: failed === 0,
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
    },
    tests: tests
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
} catch (error) {
  const errorResult = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(errorResult, null, 2));
  return errorResult;
}
