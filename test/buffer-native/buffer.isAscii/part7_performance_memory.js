// buffer.isAscii() - Part 7: Performance and Memory Tests
const { Buffer, isAscii } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 性能测试 - 不同大小的 Buffer
test('小 Buffer - 10 字节 ASCII', () => {
  const buf = Buffer.alloc(10, 0x41);
  return isAscii(buf) === true;
});

test('中等 Buffer - 1KB ASCII', () => {
  const buf = Buffer.alloc(1024, 0x41);
  return isAscii(buf) === true;
});

test('大 Buffer - 1MB ASCII', () => {
  const buf = Buffer.alloc(1024 * 1024, 0x41);
  return isAscii(buf) === true;
});

test('超大 Buffer - 10MB ASCII', () => {
  const buf = Buffer.alloc(10 * 1024 * 1024, 0x41);
  return isAscii(buf) === true;
});

test('小 Buffer - 10 字节非 ASCII 在末尾', () => {
  const buf = Buffer.alloc(10, 0x41);
  buf[9] = 0x80;
  return isAscii(buf) === false;
});

test('中等 Buffer - 1KB 非 ASCII 在末尾', () => {
  const buf = Buffer.alloc(1024, 0x41);
  buf[1023] = 0x80;
  return isAscii(buf) === false;
});

test('大 Buffer - 1MB 非 ASCII 在末尾', () => {
  const buf = Buffer.alloc(1024 * 1024, 0x41);
  buf[1024 * 1024 - 1] = 0x80;
  return isAscii(buf) === false;
});

test('大 Buffer - 1MB 非 ASCII 在开头', () => {
  const buf = Buffer.alloc(1024 * 1024, 0x41);
  buf[0] = 0x80;
  return isAscii(buf) === false;
});

test('大 Buffer - 1MB 非 ASCII 在中间', () => {
  const buf = Buffer.alloc(1024 * 1024, 0x41);
  buf[512 * 1024] = 0x80;
  return isAscii(buf) === false;
});

// 边界对齐测试
test('8 字节对齐 - ASCII', () => {
  const buf = Buffer.alloc(8, 0x41);
  return isAscii(buf) === true;
});

test('16 字节对齐 - ASCII', () => {
  const buf = Buffer.alloc(16, 0x41);
  return isAscii(buf) === true;
});

test('32 字节对齐 - ASCII', () => {
  const buf = Buffer.alloc(32, 0x41);
  return isAscii(buf) === true;
});

test('64 字节对齐 - ASCII', () => {
  const buf = Buffer.alloc(64, 0x41);
  return isAscii(buf) === true;
});

test('非对齐 - 7 字节 ASCII', () => {
  const buf = Buffer.alloc(7, 0x41);
  return isAscii(buf) === true;
});

test('非对齐 - 15 字节 ASCII', () => {
  const buf = Buffer.alloc(15, 0x41);
  return isAscii(buf) === true;
});

test('非对齐 - 33 字节 ASCII', () => {
  const buf = Buffer.alloc(33, 0x41);
  return isAscii(buf) === true;
});

// 特殊长度测试
test('长度 1 - ASCII', () => {
  const buf = Buffer.from([0x41]);
  return isAscii(buf) === true;
});

test('长度 2 - ASCII', () => {
  const buf = Buffer.from([0x41, 0x42]);
  return isAscii(buf) === true;
});

test('长度 3 - ASCII', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  return isAscii(buf) === true;
});

test('长度 4 - ASCII', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x44]);
  return isAscii(buf) === true;
});

test('长度 5 - ASCII', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x44, 0x45]);
  return isAscii(buf) === true;
});

test('长度 255 - ASCII', () => {
  const buf = Buffer.alloc(255, 0x41);
  return isAscii(buf) === true;
});

test('长度 256 - ASCII', () => {
  const buf = Buffer.alloc(256, 0x41);
  return isAscii(buf) === true;
});

test('长度 257 - ASCII', () => {
  const buf = Buffer.alloc(257, 0x41);
  return isAscii(buf) === true;
});

// 重复调用测试
test('重复调用 - 相同 Buffer ASCII', () => {
  const buf = Buffer.from('hello');
  const result1 = isAscii(buf);
  const result2 = isAscii(buf);
  const result3 = isAscii(buf);
  return result1 === true && result2 === true && result3 === true;
});

test('重复调用 - 相同 Buffer 非 ASCII', () => {
  const buf = Buffer.from([0x80]);
  const result1 = isAscii(buf);
  const result2 = isAscii(buf);
  const result3 = isAscii(buf);
  return result1 === false && result2 === false && result3 === false;
});

test('修改 Buffer 后重新检查', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  const result1 = isAscii(buf);
  buf[1] = 0x80;
  const result2 = isAscii(buf);
  buf[1] = 0x42;
  const result3 = isAscii(buf);
  return result1 === true && result2 === false && result3 === true;
});

// 内存共享场景
test('共享 ArrayBuffer - 修改前 ASCII', () => {
  const ab = new ArrayBuffer(5);
  const buf = Buffer.from(ab);
  const arr = new Uint8Array(ab);
  arr.fill(0x41);
  return isAscii(buf) === true;
});

test('共享 ArrayBuffer - 修改为非 ASCII', () => {
  const ab = new ArrayBuffer(5);
  const buf = Buffer.from(ab);
  const arr = new Uint8Array(ab);
  arr.fill(0x41);
  const beforeModify = isAscii(buf);
  arr[0] = 0x80;
  const afterModify = isAscii(buf);
  return beforeModify === true && afterModify === false;
});

// 极端模式测试
test('交替 ASCII 和边界值', () => {
  const buf = Buffer.from([0x00, 0x7F, 0x01, 0x7E, 0x20, 0x7D]);
  return isAscii(buf) === true;
});

test('所有 ASCII 边界值 0x00-0x7F', () => {
  const arr = [];
  for (let i = 0; i <= 0x7F; i++) {
    arr.push(i);
  }
  const buf = Buffer.from(arr);
  return isAscii(buf) === true;
});

test('ASCII + 单个 0x80', () => {
  const arr = [];
  for (let i = 0; i <= 0x7F; i++) {
    arr.push(i);
  }
  arr.push(0x80);
  const buf = Buffer.from(arr);
  return isAscii(buf) === false;
});

test('密集非 ASCII - 全 0xFF', () => {
  const buf = Buffer.alloc(1000, 0xFF);
  return isAscii(buf) === false;
});

test('稀疏非 ASCII - 每 100 字节一个', () => {
  const buf = Buffer.alloc(1000, 0x41);
  for (let i = 0; i < 1000; i += 100) {
    buf[i] = 0x80;
  }
  return isAscii(buf) === false;
});

// 连续内存块测试
test('连续分配多个 Buffer', () => {
  const buffers = [];
  for (let i = 0; i < 10; i++) {
    buffers.push(Buffer.alloc(100, 0x41));
  }
  const results = buffers.map(b => isAscii(b));
  return results.every(r => r === true);
});

test('连续分配 - 部分非 ASCII', () => {
  const buffers = [];
  for (let i = 0; i < 10; i++) {
    const buf = Buffer.alloc(100, 0x41);
    if (i % 2 === 0) {
      buf[0] = 0x80;
    }
    buffers.push(buf);
  }
  const results = buffers.map(b => isAscii(b));
  return results.filter(r => r === true).length === 5 &&
         results.filter(r => r === false).length === 5;
});

// TypedArray 大数组
test('大 Uint8Array - 1MB ASCII', () => {
  const arr = new Uint8Array(1024 * 1024);
  arr.fill(0x41);
  return isAscii(arr) === true;
});

test('大 Uint8Array - 1MB 非 ASCII 在末尾', () => {
  const arr = new Uint8Array(1024 * 1024);
  arr.fill(0x41);
  arr[1024 * 1024 - 1] = 0x80;
  return isAscii(arr) === false;
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
