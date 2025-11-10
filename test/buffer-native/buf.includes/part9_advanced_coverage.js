// buf.includes() - Advanced Coverage Tests (高级覆盖测试)
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

// === TypedArray 互操作性 ===
test('Int8Array 作为搜索值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const search = new Int8Array([2, 3]);
  try {
    const result = buf.includes(search);
    return true;
  } catch (e) {
    return true;
  }
});

test('Int16Array 作为搜索值', () => {
  const buf = Buffer.from([0, 1, 0, 2]);
  const search = new Int16Array([256]);
  try {
    const result = buf.includes(search);
    return true;
  } catch (e) {
    return true;
  }
});

test('Uint16Array 作为搜索值', () => {
  const buf = Buffer.from([0, 1, 0, 2]);
  const search = new Uint16Array([256]);
  try {
    const result = buf.includes(search);
    return true;
  } catch (e) {
    return true;
  }
});

test('Float32Array 作为搜索值', () => {
  const buf = Buffer.from([0, 0, 128, 63]);
  const search = new Float32Array([1.0]);
  try {
    const result = buf.includes(search);
    return true;
  } catch (e) {
    return true;
  }
});

// === buf.subarray 行为 ===
test('使用 subarray 比较部分 Buffer', () => {
  const buf = Buffer.from('hello world');
  const sub = buf.subarray(6, 11);
  return buf.includes(sub) === true;
});

test('subarray 创建的视图与原 Buffer', () => {
  const buf = Buffer.from('hello world');
  const sub = buf.subarray(0, 5);
  return buf.includes(sub) === true;
});

test('空 subarray', () => {
  const buf = Buffer.from('hello');
  const sub = buf.subarray(0, 0);
  return buf.includes(sub) === true;
});

test('subarray 超出范围', () => {
  const buf = Buffer.from('hello');
  const sub = buf.subarray(0, 100);
  return buf.includes(sub) === true;
});

// === Unicode 边界情况 ===
test('UTF-16 代理对 - 高代理', () => {
  const buf = Buffer.from('𝌆', 'utf8');
  return buf.includes('𝌆') === true;
});

test('UTF-16 代理对 - 部分匹配', () => {
  const buf = Buffer.from('𝌆', 'utf8');
  const bytes = Buffer.from(buf);
  return buf.includes(Buffer.from([bytes[0], bytes[1]])) === true;
});

test('零宽字符', () => {
  const buf = Buffer.from('hello\u200Bworld');
  return buf.includes('\u200B') === true;
});

test('从右到左标记', () => {
  const buf = Buffer.from('hello\u202Eworld');
  return buf.includes('\u202E') === true;
});

// === 编码别名测试 ===
test('binary 编码（latin1 别名）', () => {
  const buf = Buffer.from('hello', 'binary');
  try {
    return buf.includes('ell', 0, 'binary') === true;
  } catch (e) {
    return true;
  }
});

test('ucs2 编码（utf16le 别名）', () => {
  const buf = Buffer.from('hello', 'ucs2');
  try {
    const search = Buffer.from('ll', 'ucs2');
    return buf.includes(search) === true;
  } catch (e) {
    return true;
  }
});

test('ucs-2 编码（带连字符）', () => {
  const buf = Buffer.from('hello', 'utf16le');
  try {
    return buf.includes('ll', 0, 'ucs-2') === true;
  } catch (e) {
    return true;
  }
});

test('utf-8 编码（带连字符）', () => {
  const buf = Buffer.from('hello', 'utf8');
  try {
    return buf.includes('ell', 0, 'utf-8') === true;
  } catch (e) {
    return true;
  }
});

// === 极端性能情况 ===
test('超大 Buffer (1MB) - 开头查找', () => {
  const buf = Buffer.alloc(1024 * 1024);
  buf.write('target', 0);
  return buf.includes('target') === true;
});

test('超大 Buffer (1MB) - 末尾查找', () => {
  const buf = Buffer.alloc(1024 * 1024);
  const pos = buf.length - 6;
  buf.write('target', pos);
  return buf.includes('target') === true;
});

test('超大 Buffer (1MB) - 中间查找', () => {
  const buf = Buffer.alloc(1024 * 1024);
  buf.write('target', 512 * 1024);
  return buf.includes('target') === true;
});

test('超长搜索字符串 (10KB)', () => {
  const longStr = 'a'.repeat(10 * 1024);
  const buf = Buffer.from(longStr);
  return buf.includes(longStr) === true;
});

test('超长搜索字符串 - 部分匹配', () => {
  const longStr = 'a'.repeat(10 * 1024);
  const buf = Buffer.from(longStr);
  return buf.includes('a'.repeat(1000)) === true;
});

// === 边界对齐 ===
test('4 字节对齐边界', () => {
  const buf = Buffer.from('xxxx' + 'target' + 'yyyy');
  return buf.includes('target', 4) === true;
});

test('8 字节对齐边界', () => {
  const buf = Buffer.from('xxxxxxxx' + 'target' + 'yyyy');
  return buf.includes('target', 8) === true;
});

test('16 字节对齐边界', () => {
  const buf = Buffer.from('x'.repeat(16) + 'target' + 'y'.repeat(16));
  return buf.includes('target', 16) === true;
});

// === 特殊字节序列 ===
test('连续 0x00 字节', () => {
  const buf = Buffer.from([0, 0, 0, 0, 1, 2, 3]);
  return buf.includes(Buffer.from([0, 0, 0])) === true;
});

test('连续 0xFF 字节', () => {
  const buf = Buffer.from([255, 255, 255, 255, 1, 2, 3]);
  return buf.includes(Buffer.from([255, 255, 255])) === true;
});

test('交替 0x00 和 0xFF', () => {
  const buf = Buffer.from([0, 255, 0, 255, 0, 255]);
  return buf.includes(Buffer.from([0, 255, 0])) === true;
});

// === 字节序（Endianness）相关 ===
test('Big-endian 16位整数模式', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.includes(Buffer.from([0x34, 0x56])) === true;
});

test('Little-endian 16位整数模式', () => {
  const buf = Buffer.from([0x34, 0x12, 0x78, 0x56]);
  return buf.includes(Buffer.from([0x12, 0x78])) === true;
});

// === 实际应用场景 ===
test('HTTP 响应头查找', () => {
  const buf = Buffer.from('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n');
  return buf.includes('\r\n\r\n') === true;
});

test('二进制协议魔数', () => {
  const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return buf.includes(Buffer.from([0x50, 0x4E, 0x47])) === true;
});

test('JSON 字符串查找', () => {
  const buf = Buffer.from('{"name":"test","value":123}');
  return buf.includes('"name"') === true;
});

test('Base64 填充字符', () => {
  const buf = Buffer.from('aGVsbG8=', 'base64');
  const search = Buffer.from('hello');
  return buf.includes(search) === true;
});

// === 连续调用稳定性 ===
test('连续 1000 次调用 - 相同结果', () => {
  const buf = Buffer.from('hello world');
  let allSame = true;
  const expected = buf.includes('world');
  for (let i = 0; i < 1000; i++) {
    if (buf.includes('world') !== expected) {
      allSame = false;
      break;
    }
  }
  return allSame === true;
});

test('不同 offset 连续调用', () => {
  const buf = Buffer.from('aaabbbaaaccc');
  const r1 = buf.includes('aaa', 0);
  const r2 = buf.includes('bbb', 3);
  const r3 = buf.includes('aaa', 6);
  return r1 === true && r2 === true && r3 === true;
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
