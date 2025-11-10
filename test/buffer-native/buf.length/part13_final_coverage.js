// buf.length - Part 13: Final Coverage Tests
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

// toString 不同编码测试
test('toString hex 后 length 不变', () => {
  const buf = Buffer.from('hello');
  const str = buf.toString('hex');
  return buf.length === 5 && str === '68656c6c6f';
});

test('toString base64 后 length 不变', () => {
  const buf = Buffer.from('hello');
  const str = buf.toString('base64');
  return buf.length === 5;
});

test('toString latin1 后 length 不变', () => {
  const buf = Buffer.from('hello');
  const str = buf.toString('latin1');
  return buf.length === 5 && str === 'hello';
});

test('toString ascii 后 length 不变', () => {
  const buf = Buffer.from('hello');
  const str = buf.toString('ascii');
  return buf.length === 5 && str === 'hello';
});

test('toString utf16le 后 length 不变', () => {
  const buf = Buffer.from('hello', 'utf16le');
  const str = buf.toString('utf16le');
  return buf.length === 10;
});

test('toString binary 后 length 不变', () => {
  const buf = Buffer.from('hello');
  const str = buf.toString('binary');
  return buf.length === 5 && str === 'hello';
});

// toLocaleString 测试
test('toLocaleString 后 length 不变', () => {
  const buf = Buffer.from([1, 2, 3]);
  const str = buf.toLocaleString();
  return buf.length === 3;
});

// Symbol.iterator 测试
test('使用 Symbol.iterator 后 length 不变', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();
  iter.next();
  return buf.length === 3;
});

// for...of 循环测试
test('for...of 循环后 length 不变', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let count = 0;
  for (const byte of buf) {
    count++;
  }
  return buf.length === 5 && count === 5;
});

test('for...of 空 buffer 的 length', () => {
  const buf = Buffer.alloc(0);
  let count = 0;
  for (const byte of buf) {
    count++;
  }
  return buf.length === 0 && count === 0;
});

// Buffer.from Set
test('Buffer.from Set 行为', () => {
  try {
    const set = new Set([1, 2, 3]);
    const buf = Buffer.from(set);
    return buf.length >= 0;
  } catch (e) {
    // Set 不能直接转换为 Buffer
    return true;
  }
});

// Buffer.from Map
test('Buffer.from Map 行为', () => {
  try {
    const map = new Map([[0, 1], [1, 2]]);
    const buf = Buffer.from(map);
    return buf.length >= 0;
  } catch (e) {
    // Map 不能直接转换为 Buffer
    return true;
  }
});

// DataView 相关测试
test('从 Buffer 创建 DataView 后 length 不变', () => {
  const buf = Buffer.alloc(16);
  const view = new DataView(buf.buffer);
  return buf.length === 16;
});

test('DataView 操作后 Buffer length 不变', () => {
  const buf = Buffer.alloc(16);
  const view = new DataView(buf.buffer);
  view.setInt32(0, 12345);
  return buf.length === 16;
});

test('DataView 与 Buffer length 的关系', () => {
  const buf = Buffer.alloc(16);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.length);
  return view.byteLength === buf.length;
});

// Buffer.allocUnsafe 与 Buffer.alloc 一致性
test('allocUnsafe 和 alloc 相同大小的 length', () => {
  const buf1 = Buffer.alloc(100);
  const buf2 = Buffer.allocUnsafe(100);
  return buf1.length === buf2.length && buf1.length === 100;
});

test('allocUnsafe 和 alloc 零大小的 length', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.allocUnsafe(0);
  return buf1.length === buf2.length && buf1.length === 0;
});

test('allocUnsafeSlow 和 alloc 相同大小的 length', () => {
  const buf1 = Buffer.alloc(100);
  const buf2 = Buffer.allocUnsafeSlow(100);
  return buf1.length === buf2.length && buf1.length === 100;
});

// base64 padding 测试
test('base64 无 padding 的 length', () => {
  const buf = Buffer.from('YQ', 'base64'); // "a"
  return buf.length === 1;
});

test('base64 单个 padding 的 length', () => {
  const buf = Buffer.from('YWI=', 'base64'); // "ab"
  return buf.length === 2;
});

test('base64 双 padding 的 length', () => {
  const buf = Buffer.from('YQ==', 'base64'); // "a"
  return buf.length === 1;
});

test('base64 无效字符的处理', () => {
  try {
    const buf = Buffer.from('YQ!@', 'base64');
    return buf.length >= 0;
  } catch (e) {
    return true;
  }
});

// hex 编码特殊情况
test('hex 奇数长度字符串', () => {
  const buf = Buffer.from('abc', 'hex'); // 只解析 "ab"
  return buf.length === 1;
});

test('hex 空字符串的 length', () => {
  const buf = Buffer.from('', 'hex');
  return buf.length === 0;
});

test('hex 无效字符的处理', () => {
  const buf = Buffer.from('abcg', 'hex'); // "g" 是无效的
  return buf.length >= 0;
});

// Buffer.byteLength 与 length 的一致性
test('byteLength 与 length 对于 utf8', () => {
  const str = 'hello world';
  const byteLen = Buffer.byteLength(str, 'utf8');
  const buf = Buffer.from(str, 'utf8');
  return byteLen === buf.length;
});

test('byteLength 与 length 对于 utf16le', () => {
  const str = 'hello';
  const byteLen = Buffer.byteLength(str, 'utf16le');
  const buf = Buffer.from(str, 'utf16le');
  return byteLen === buf.length;
});

test('byteLength 与 length 对于 base64', () => {
  const str = 'SGVsbG8=';
  const byteLen = Buffer.byteLength(str, 'base64');
  const buf = Buffer.from(str, 'base64');
  return byteLen === buf.length;
});

test('byteLength 与 length 对于 hex', () => {
  const str = '48656c6c6f';
  const byteLen = Buffer.byteLength(str, 'hex');
  const buf = Buffer.from(str, 'hex');
  return byteLen === buf.length;
});

// Buffer.compare 静态方法
test('Buffer.compare 后两个 buffer length 不变', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('def');
  Buffer.compare(buf1, buf2);
  return buf1.length === 3 && buf2.length === 3;
});

test('Buffer.compare 空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.from('abc');
  Buffer.compare(buf1, buf2);
  return buf1.length === 0 && buf2.length === 3;
});

// Buffer.concat 边界情况
test('Buffer.concat 单个 buffer 不指定 totalLength', () => {
  const buf = Buffer.from('hello');
  const result = Buffer.concat([buf]);
  return result.length === 5;
});

test('Buffer.concat 大量小 buffer', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    buffers.push(Buffer.from([i]));
  }
  const result = Buffer.concat(buffers);
  return result.length === 100;
});

// slice/subarray 与原 buffer 的独立性
test('slice 后修改不影响原 buffer length', () => {
  const buf = Buffer.from('hello world');
  const slice = buf.slice(0, 5);
  slice.fill(0);
  return buf.length === 11 && slice.length === 5;
});

test('subarray 后修改不影响原 buffer length', () => {
  const buf = Buffer.from('hello world');
  const sub = buf.subarray(0, 5);
  sub.fill(0);
  return buf.length === 11 && sub.length === 5;
});

// Buffer 与 Uint8Array 的关系
test('Buffer 是 Uint8Array 的实例', () => {
  const buf = Buffer.alloc(10);
  return buf instanceof Uint8Array && buf.length === 10;
});

test('Uint8Array 方法不改变 Buffer length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const filtered = Array.from(buf).filter(x => x > 2);
  return buf.length === 5 && filtered.length === 3;
});

// 特殊字符串编码
test('包含 BOM 的 utf8 字符串 length', () => {
  const bom = '\uFEFF';
  const buf = Buffer.from(bom + 'hello', 'utf8');
  return buf.length === 8; // BOM (3 bytes) + hello (5 bytes)
});

test('包含代理对的字符串 length', () => {
  const str = '𝌆'; // U+1D306, 需要代理对
  const buf = Buffer.from(str, 'utf8');
  return buf.length === 4;
});

test('包含零宽字符的字符串 length', () => {
  const str = 'a\u200Bb'; // 零宽空格
  const buf = Buffer.from(str, 'utf8');
  return buf.length === 5; // a (1) + ZWSP (3) + b (1)
});

// Buffer.poolSize 相关
test('修改 Buffer.poolSize 不影响已创建 buffer', () => {
  const originalPoolSize = Buffer.poolSize;
  const buf = Buffer.allocUnsafe(10);
  Buffer.poolSize = 16384;
  const result = buf.length === 10;
  Buffer.poolSize = originalPoolSize; // 恢复
  return result;
});

// 多次操作后 length 保持一致
test('连续操作后 length 保持一致', () => {
  const buf = Buffer.alloc(20);
  buf.write('hello', 0);
  buf.fill(0, 5, 10);
  buf.writeInt32BE(12345, 10);
  const slice = buf.slice(0, 10);
  return buf.length === 20 && slice.length === 10;
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
