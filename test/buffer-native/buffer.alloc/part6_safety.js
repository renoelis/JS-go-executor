// Buffer.alloc() - Part 6: Memory Safety and Isolation Tests
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

// 内存初始化测试
test('新 Buffer 默认全部为 0', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
});

test('新 Buffer 不包含残留数据', () => {
  const buf = Buffer.alloc(1000);
  return buf.every(byte => byte === 0);
});

test('大 Buffer 全部初始化为 0', () => {
  const buf = Buffer.alloc(100000);
  const samples = [0, 100, 1000, 10000, 50000, 99999];
  return samples.every(i => buf[i] === 0);
});

// 内存独立性测试
test('两个 Buffer 内存完全独立', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10);
  buf1.fill(0xFF);
  return buf2.every(byte => byte === 0);
});

test('修改一个 Buffer 不影响另一个', () => {
  const buf1 = Buffer.alloc(5, 0xAA);
  const buf2 = Buffer.alloc(5, 0xBB);
  buf1[0] = 0x11;
  buf2[0] = 0x22;
  return buf1[0] === 0x11 && buf2[0] === 0x22 && buf1[1] === 0xAA && buf2[1] === 0xBB;
});

test('连续分配的 Buffer 互不干扰', () => {
  const bufs = [];
  for (let i = 0; i < 10; i++) {
    bufs.push(Buffer.alloc(10, i));
  }
  for (let i = 0; i < 10; i++) {
    if (!bufs[i].every(byte => byte === i)) return false;
  }
  return true;
});

test('不同大小 Buffer 的内存隔离', () => {
  const small = Buffer.alloc(10, 0x11);
  const large = Buffer.alloc(10000, 0x22);
  small[5] = 0xFF;
  return small[5] === 0xFF && large.every(byte => byte === 0x22);
});

// 填充后的独立性
test('fill 为 Buffer 时是复制而非引用', () => {
  const fillBuf = Buffer.from([1, 2, 3]);
  const buf = Buffer.alloc(6, fillBuf);
  fillBuf[0] = 99;
  return buf[0] === 1 && buf[3] === 1;
});

test('fill 为 Uint8Array 时是复制而非引用', () => {
  const fillArr = new Uint8Array([10, 20, 30]);
  const buf = Buffer.alloc(6, fillArr);
  fillArr[0] = 99;
  return buf[0] === 10 && buf[3] === 10;
});

// 边界访问安全
test('访问超出范围的索引返回 undefined', () => {
  const buf = Buffer.alloc(5);
  return buf[5] === undefined && buf[100] === undefined && buf[-1] === undefined;
});

test('修改超出范围的索引不影响 Buffer', () => {
  const buf = Buffer.alloc(5, 0);
  buf[10] = 255;
  buf[-1] = 255;
  return buf.every(byte => byte === 0) && buf.length === 5;
});

test('length 属性不可修改（或修改无效）', () => {
  const buf = Buffer.alloc(10);
  const originalLength = buf.length;
  try {
    buf.length = 20;
    return buf.length === originalLength;
  } catch (e) {
    return true;
  }
});

// 零拷贝验证
test('Buffer.alloc 创建新内存，非视图', () => {
  const buf1 = Buffer.alloc(10, 1);
  const buf2 = Buffer.alloc(10, 1);
  buf1[0] = 99;
  return buf2[0] === 1;
});

test('相同 fill Buffer 创建独立副本', () => {
  const fillBuf = Buffer.from([0xAA, 0xBB]);
  const buf1 = Buffer.alloc(4, fillBuf);
  const buf2 = Buffer.alloc(4, fillBuf);
  buf1[0] = 0x11;
  return buf2[0] === 0xAA;
});

// 多次填充的一致性
test('重复填充保持一致性', () => {
  const buf = Buffer.alloc(100, 'abc');
  const pattern = Buffer.from('abc');
  for (let i = 0; i < 99; i++) {
    if (buf[i] !== pattern[i % 3]) return false;
  }
  return true;
});

test('数字填充的均匀性', () => {
  const buf = Buffer.alloc(1000, 123);
  return buf.every(byte => byte === 123);
});

test('Buffer 填充的精确重复', () => {
  const fillBuf = Buffer.from([1, 2, 3, 4, 5]);
  const buf = Buffer.alloc(15, fillBuf);
  for (let i = 0; i < 15; i++) {
    if (buf[i] !== fillBuf[i % 5]) return false;
  }
  return true;
});

// 并发安全（模拟）
test('快速连续分配多个 Buffer', () => {
  const bufs = [];
  for (let i = 0; i < 1000; i++) {
    bufs.push(Buffer.alloc(10, i % 256));
  }
  for (let i = 0; i < 1000; i++) {
    if (!bufs[i].every(byte => byte === (i % 256))) return false;
  }
  return true;
});

test('交替分配不同大小的 Buffer', () => {
  const bufs = [];
  for (let i = 0; i < 100; i++) {
    bufs.push(Buffer.alloc(i % 2 === 0 ? 10 : 100, i));
  }
  return bufs.every((buf, i) => buf[0] === i);
});

// 类型安全
test('Buffer.isBuffer 正确识别 alloc 创建的 Buffer', () => {
  const buf = Buffer.alloc(10);
  return Buffer.isBuffer(buf);
});

test('instanceof Buffer 正确工作', () => {
  const buf = Buffer.alloc(10);
  return buf instanceof Buffer;
});

test('typeof 返回 object', () => {
  const buf = Buffer.alloc(10);
  return typeof buf === 'object';
});

// 填充值的边界安全
test('fill 值不会溢出到其他 Buffer', () => {
  const buf1 = Buffer.alloc(5, 0xFF);
  const buf2 = Buffer.alloc(5, 0x00);
  return buf1.every(b => b === 0xFF) && buf2.every(b => b === 0x00);
});

test('大量数据填充不影响其他 Buffer', () => {
  const buf1 = Buffer.alloc(10000, 0xAA);
  const buf2 = Buffer.alloc(10, 0xBB);
  return buf1[0] === 0xAA && buf1[9999] === 0xAA &&
         buf2[0] === 0xBB && buf2[9] === 0xBB;
});

// 写入后的持久性
test('写入数据后保持不变', () => {
  const buf = Buffer.alloc(10);
  buf[0] = 100;
  buf[5] = 200;
  buf[9] = 255;
  return buf[0] === 100 && buf[5] === 200 && buf[9] === 255;
});

test('填充值持久保持', () => {
  const buf = Buffer.alloc(100, 42);
  const snapshot = [];
  for (let i = 0; i < 100; i++) {
    snapshot.push(buf[i]);
  }
  return snapshot.every(v => v === 42);
});

// 特殊情况的安全性
test('空 Buffer 的安全性', () => {
  const buf = Buffer.alloc(0);
  buf[0] = 255;
  return buf.length === 0 && buf[0] === undefined;
});

test('单字节 Buffer 的安全性', () => {
  const buf = Buffer.alloc(1, 123);
  buf[1] = 255;
  return buf.length === 1 && buf[0] === 123 && buf[1] === undefined;
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
