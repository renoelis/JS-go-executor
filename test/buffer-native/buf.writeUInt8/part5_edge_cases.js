// buf.writeUInt8() - 边界和特殊情况测试
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

// 单字节 Buffer
test('单字节 Buffer 写入', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(200, 0);
  return buf[0] === 200 && buf.length === 1;
});

test('单字节 Buffer offset 0', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(255);
  return buf[0] === 255;
});

// 大 Buffer
test('大 Buffer 写入到开头', () => {
  const buf = Buffer.alloc(1024);
  buf.writeUInt8(100, 0);
  return buf[0] === 100 && buf[1] === 0;
});

test('大 Buffer 写入到末尾', () => {
  const buf = Buffer.alloc(1024);
  buf.writeUInt8(200, 1023);
  return buf[1023] === 200 && buf[1022] === 0;
});

test('大 Buffer 写入到中间', () => {
  const buf = Buffer.alloc(1024);
  buf.writeUInt8(150, 512);
  return buf[512] === 150 && buf[511] === 0 && buf[513] === 0;
});

// 边界值组合
test('0 写入到 offset 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0, 0);
  return buf[0] === 0;
});

test('255 写入到最后位置', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(255, 3);
  return buf[3] === 255;
});

test('写入所有位置均为 255', () => {
  const buf = Buffer.alloc(4);
  for (let i = 0; i < 4; i++) {
    buf.writeUInt8(255, i);
  }
  return buf[0] === 255 && buf[1] === 255 && buf[2] === 255 && buf[3] === 255;
});

test('写入所有位置均为 0', () => {
  const buf = Buffer.from([255, 255, 255, 255]);
  for (let i = 0; i < 4; i++) {
    buf.writeUInt8(0, i);
  }
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0;
});

// 重复写入同一位置
test('重复写入同一位置', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(100, 1);
  buf.writeUInt8(200, 1);
  return buf[1] === 200;
});

test('多次覆盖写入', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0, 0);
  buf.writeUInt8(50, 0);
  buf.writeUInt8(100, 0);
  buf.writeUInt8(150, 0);
  buf.writeUInt8(200, 0);
  return buf[0] === 200;
});

// 特殊数值
test('写入 0x00', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(0x00, 0);
  return buf[0] === 0;
});

test('写入 0xFF', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(0xFF, 0);
  return buf[0] === 255;
});

test('写入 0x7F', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(0x7F, 0);
  return buf[0] === 127;
});

test('写入 0x80', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(0x80, 0);
  return buf[0] === 128;
});

// 不同方式创建的 Buffer
test('Buffer.alloc 创建后写入', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(123, 0);
  return buf[0] === 123;
});

test('Buffer.allocUnsafe 创建后写入', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt8(123, 0);
  return buf[0] === 123;
});

test('Buffer.from 创建后写入', () => {
  const buf = Buffer.from([0, 0, 0, 0]);
  buf.writeUInt8(123, 0);
  return buf[0] === 123;
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
