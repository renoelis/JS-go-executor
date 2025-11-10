// buf.length - Part 15: Additional Scenarios
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

// Buffer.from 所有重载形式
test('Buffer.from(string) 的长度', () => {
  const buf = Buffer.from('test');
  return buf.length === 4;
});

test('Buffer.from(string, encoding) 的长度', () => {
  const buf = Buffer.from('test', 'utf8');
  return buf.length === 4;
});

test('Buffer.from(array) 的长度', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf.length === 3;
});

test('Buffer.from(arrayBuffer) 的长度', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  return buf.length === 10;
});

test('Buffer.from(arrayBuffer, offset) 的长度', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 2);
  return buf.length === 8;
});

test('Buffer.from(arrayBuffer, offset, length) 的长度', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 2, 5);
  return buf.length === 5;
});

test('Buffer.from(buffer) 复制的长度', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(buf1);
  return buf2.length === 5 && buf1.length === 5;
});

// Buffer.allocUnsafeSlow 测试
test('Buffer.allocUnsafeSlow 的长度', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.length === 10;
});

test('Buffer.allocUnsafeSlow(0) 的长度', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.length === 0;
});

test('Buffer.allocUnsafeSlow 大尺寸的长度', () => {
  const buf = Buffer.allocUnsafeSlow(1024 * 1024);
  return buf.length === 1024 * 1024;
});

// JSON 序列化测试
test('Buffer toJSON 后再创建的长度', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const json = buf1.toJSON();
  const buf2 = Buffer.from(json.data);
  return buf2.length === 5;
});

test('空 Buffer toJSON 后的长度', () => {
  const buf1 = Buffer.alloc(0);
  const json = buf1.toJSON();
  const buf2 = Buffer.from(json.data);
  return buf2.length === 0;
});

// Buffer.compare 不影响 length
test('Buffer.compare 后长度不变', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('def');
  Buffer.compare(buf1, buf2);
  return buf1.length === 3 && buf2.length === 3;
});

// Buffer.equals 不影响 length
test('Buffer.equals 后长度不变', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  buf1.equals(buf2);
  return buf1.length === 4 && buf2.length === 4;
});

// Buffer.indexOf 不影响 length
test('Buffer.indexOf 后长度不变', () => {
  const buf = Buffer.from('hello world');
  buf.indexOf('world');
  return buf.length === 11;
});

// Buffer.lastIndexOf 不影响 length
test('Buffer.lastIndexOf 后长度不变', () => {
  const buf = Buffer.from('hello world hello');
  buf.lastIndexOf('hello');
  return buf.length === 17;
});

// Buffer.includes 不影响 length
test('Buffer.includes 后长度不变', () => {
  const buf = Buffer.from('hello world');
  buf.includes('world');
  return buf.length === 11;
});

// toString 不影响 length
test('toString 后长度不变', () => {
  const buf = Buffer.from('hello');
  buf.toString();
  return buf.length === 5;
});

test('toString 指定编码后长度不变', () => {
  const buf = Buffer.from('hello');
  buf.toString('hex');
  return buf.length === 5;
});

test('toString 指定范围后长度不变', () => {
  const buf = Buffer.from('hello world');
  buf.toString('utf8', 0, 5);
  return buf.length === 11;
});

// swap 操作测试
test('swap16 后长度不变', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();
  return buf.length === 4;
});

test('swap32 后长度不变', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();
  return buf.length === 4;
});

test('swap64 后长度不变', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();
  return buf.length === 8;
});

// reverse 操作测试
test('reverse 后长度不变', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.reverse();
  return buf.length === 5;
});

// 特殊值测试
test('包含 NaN 的数组创建的长度', () => {
  const buf = Buffer.from([1, 2, NaN, 4]);
  return buf.length === 4;
});

test('包含 Infinity 的数组创建的长度', () => {
  const buf = Buffer.from([1, 2, Infinity, 4]);
  return buf.length === 4;
});

test('包含负数的数组创建的长度', () => {
  const buf = Buffer.from([1, 2, -1, 4]);
  return buf.length === 4;
});

test('包含大于 255 的数组创建的长度', () => {
  const buf = Buffer.from([1, 2, 256, 4]);
  return buf.length === 4;
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
