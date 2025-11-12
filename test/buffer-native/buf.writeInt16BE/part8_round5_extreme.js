// buf.writeInt16BE() - 第5轮补充：极端场景和压力测试
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

// 大 buffer 测试
test('在 10KB buffer 中间写入', () => {
  const buf = Buffer.alloc(10240);
  const offset = 5000;
  buf.writeInt16BE(12345, offset);
  return buf.readInt16BE(offset) === 12345;
});

test('在 1MB buffer 末尾写入', () => {
  const size = 1024 * 1024;
  const buf = Buffer.alloc(size);
  const offset = size - 2;
  buf.writeInt16BE(-9999, offset);
  return buf.readInt16BE(offset) === -9999;
});

// 边界对齐测试
test('写入到偶数 offset', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16BE(1111, 0);
  buf.writeInt16BE(2222, 2);
  buf.writeInt16BE(3333, 4);
  return buf.readInt16BE(0) === 1111 &&
         buf.readInt16BE(2) === 2222 &&
         buf.readInt16BE(4) === 3333;
});

test('写入到奇数 offset', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16BE(1111, 1);
  buf.writeInt16BE(2222, 3);
  buf.writeInt16BE(3333, 5);
  return buf.readInt16BE(1) === 1111 &&
         buf.readInt16BE(3) === 2222 &&
         buf.readInt16BE(5) === 3333;
});

// 所有可能的两字节组合测试（采样）
test('测试256个不同的低字节值', () => {
  const buf = Buffer.alloc(4);
  for (let i = 0; i < 256; i++) {
    buf.writeInt16BE(i, 0);
    if (buf[1] !== i) return false;
  }
  return true;
});

test('测试高字节0-127的值', () => {
  const buf = Buffer.alloc(4);
  for (let i = 0; i < 128; i++) {
    const val = i * 256;
    buf.writeInt16BE(val, 0);
    if (buf[0] !== i || buf[1] !== 0) return false;
  }
  return true;
});

// 连续写入压力测试
test('连续写入1000次到不同位置', () => {
  const buf = Buffer.alloc(2000);
  for (let i = 0; i < 1000; i++) {
    buf.writeInt16BE((i % 32767) - 16384, i * 2);
  }
  // 验证前10个和后10个
  for (let i = 0; i < 10; i++) {
    if (buf.readInt16BE(i * 2) !== (i % 32767) - 16384) return false;
  }
  for (let i = 990; i < 1000; i++) {
    if (buf.readInt16BE(i * 2) !== (i % 32767) - 16384) return false;
  }
  return true;
});

// 交叉读写测试
test('边写边读验证', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 50; i++) {
    const val = (i * 123) % 32767 - 16384;
    buf.writeInt16BE(val, i * 2);
    if (buf.readInt16BE(i * 2) !== val) return false;
  }
  return true;
});

// Buffer 方法调用语义
test('方法返回的 buffer 引用不变', () => {
  const buf = Buffer.alloc(10);
  const ret = buf.writeInt16BE(100, 0);
  return typeof ret === 'number' && ret === 2;
});

test('在 frozen buffer 上调用', () => {
  const buf = Buffer.alloc(4);
  // Buffer 无法被 freeze，但可以测试写入行为
  buf.writeInt16BE(100, 0);
  return buf.readInt16BE(0) === 100;
});

// 特殊数值模式的完整测试
test('写入所有位为0的值', () => {
  const buf = Buffer.alloc(4, 0xFF);
  buf.writeInt16BE(0b0000000000000000, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('写入所有位为1的值(-1)', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0b1111111111111111 << 16 >> 16, 0); // 确保作为有符号数
  return buf[0] === 0xFF && buf[1] === 0xFF;
});

test('写入位模式 0101010101010101', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0b0101010101010101, 0);
  return buf[0] === 0x55 && buf[1] === 0x55;
});

test('写入位模式 1010101010101010 (需在范围内)', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-21846, 0); // 0xAAAA 作为有符号数
  return buf[0] === 0xAA && buf[1] === 0xAA;
});

// 边界值细粒度测试
test('写入 32765', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(32765, 0);
  return buf.readInt16BE(0) === 32765;
});

test('写入 -32766', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-32766, 0);
  return buf.readInt16BE(0) === -32766;
});

// 零拷贝行为验证
test('写入不创建新 buffer', () => {
  const buf = Buffer.alloc(4);
  const oldBuf = buf;
  buf.writeInt16BE(100, 0);
  return buf === oldBuf;
});

// offset 边界的精确测试
test('offset 为 buffer.length - 2', () => {
  const buf = Buffer.alloc(10);
  const offset = buf.length - 2;
  buf.writeInt16BE(999, offset);
  return buf.readInt16BE(offset) === 999;
});

test('offset 为 0 时的边界', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16BE(500, 0);
  return buf.readInt16BE(0) === 500;
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
