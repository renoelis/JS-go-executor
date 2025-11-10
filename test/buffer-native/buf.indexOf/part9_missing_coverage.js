// buf.indexOf() - Missing Coverage Tests
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

function testError(name, fn, expectedErrorType) {
  try {
    fn();
    tests.push({ name, status: '❌', error: 'Expected error but none thrown' });
  } catch (e) {
    const pass = e.name === expectedErrorType || e.message.includes(expectedErrorType);
    tests.push({ name, status: pass ? '✅' : '❌', error: pass ? undefined : e.message });
  }
}

// buf.subarray 使用测试
test('使用 buf.subarray 进行部分比较', () => {
  const buf = Buffer.from('this is a buffer');
  const search = Buffer.from('a buffer example');
  return buf.indexOf(search.subarray(0, 8)) === 8;
});

test('使用 buf.subarray 查找子序列', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const search = Buffer.from([3, 4, 5, 6, 7]);
  return buf.indexOf(search.subarray(0, 3)) === 2;
});

test('使用 buf.subarray 空子数组', () => {
  const buf = Buffer.from('hello');
  const search = Buffer.from('world');
  return buf.indexOf(search.subarray(0, 0)) === 0;
});

// 空值边界行为测试
test('空字符串 byteOffset 等于 length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('', 5) === 5;
});

test('空字符串 byteOffset 大于 length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('', 10) === 5;
});

test('空 Buffer byteOffset 等于 length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(Buffer.alloc(0), 5) === 5;
});

test('空 Buffer byteOffset 大于 length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(Buffer.alloc(0), 10) === 5;
});

test('空 Uint8Array byteOffset 等于 length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(new Uint8Array(0), 5) === 5;
});

test('空 Uint8Array byteOffset 大于 length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(new Uint8Array(0), 10) === 5;
});

// TypedArray 子类更多测试
test('Int16Array 作为搜索值', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const search = new Int16Array([0x0201]);
  return buf.indexOf(Buffer.from(search.buffer)) === 0;
});

test('Uint32Array 作为搜索值', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const search = new Uint32Array([0x04030201]);
  return buf.indexOf(Buffer.from(search.buffer)) === 0;
});

test('Float32Array 作为搜索值', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0x3f]);
  const search = new Float32Array([1.0]);
  return buf.indexOf(Buffer.from(search.buffer)) === 0;
});

// byteOffset 为有效编码名称的测试
test('byteOffset 为 "utf8" 应被当作 encoding', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 'utf8') === 6;
});

test('byteOffset 为 "hex" 应被当作 encoding', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  return buf.indexOf('6c6c', 'hex') === 2;
});

test('byteOffset 为 "base64" 应被当作 encoding', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64');
  return buf.indexOf('Hello', 'utf8') === 0;
});

// 数字转换边界测试
test('数字 256 应转换为 0', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(256) === 0;
});

test('数字 257 应转换为 1', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(257) === 1;
});

test('数字 -1 应转换为 255', () => {
  const buf = Buffer.from([0, 1, 255, 3]);
  return buf.indexOf(-1) === 2;
});

test('数字 -256 应转换为 0', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(-256) === 0;
});

// 更多的 NaN/undefined/null 测试
test('byteOffset 为 NaN 应搜索整个 buffer', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', NaN) === 6;
});

test('byteOffset 为 "not a number" 应抛出错误', () => {
  const buf = Buffer.from('hello world');
  try {
    buf.indexOf('world', 'not-a-number');
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

// 多字节字符边界测试
test('查找多字节字符 - 从字符边界开始', () => {
  const buf = Buffer.from('你好世界');
  return buf.indexOf('世', 6) === 6;
});

test('查找多字节字符 - 从字符中间开始', () => {
  const buf = Buffer.from('你好世界');
  return buf.indexOf('世', 7) === -1;
});

test('查找多字节字符 - 从字符中间开始（应该找到下一个）', () => {
  const buf = Buffer.from('你好世界');
  return buf.indexOf('界', 7) === 9;
});

// 重叠搜索模式测试
test('重叠模式 - AAAA 查找 AAA', () => {
  const buf = Buffer.from('AAAA');
  return buf.indexOf('AAA') === 0;
});

test('重叠模式 - AAAA 查找 AAA 偏移 1', () => {
  const buf = Buffer.from('AAAA');
  return buf.indexOf('AAA', 1) === 1;
});

test('重叠模式 - ABCABC 查找 BCAB', () => {
  const buf = Buffer.from('ABCABC');
  return buf.indexOf('BCAB') === 1;
});

// 二进制搜索高级测试
test('二进制 - 查找全 0 序列', () => {
  const buf = Buffer.from([1, 2, 0, 0, 0, 3]);
  return buf.indexOf(Buffer.from([0, 0, 0])) === 2;
});

test('二进制 - 查找全 0xFF 序列', () => {
  const buf = Buffer.from([1, 2, 0xFF, 0xFF, 0xFF, 3]);
  return buf.indexOf(Buffer.from([0xFF, 0xFF, 0xFF])) === 2;
});

test('二进制 - 查找混合序列', () => {
  const buf = Buffer.from([0x00, 0xFF, 0x00, 0xFF, 0x00]);
  return buf.indexOf(Buffer.from([0xFF, 0x00, 0xFF])) === 1;
});

// 性能相关测试
test('大 Buffer - 100KB 查找开头', () => {
  const buf = Buffer.alloc(102400);
  buf.write('target', 0);
  return buf.indexOf('target') === 0;
});

test('大 Buffer - 100KB 查找末尾', () => {
  const buf = Buffer.alloc(102400);
  buf.write('target', 102394);
  return buf.indexOf('target') === 102394;
});

test('大 Buffer - 100KB 未找到', () => {
  const buf = Buffer.alloc(102400);
  return buf.indexOf('target') === -1;
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
