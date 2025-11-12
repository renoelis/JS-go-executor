// buf.writeUInt8() - 连续写入场景测试
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

// 顺序写入
test('顺序写入 4 个字节', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0xAA, 0);
  buf.writeUInt8(0xBB, 1);
  buf.writeUInt8(0xCC, 2);
  buf.writeUInt8(0xDD, 3);
  return buf[0] === 0xAA && buf[1] === 0xBB && buf[2] === 0xCC && buf[3] === 0xDD;
});

test('逆序写入', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0xDD, 3);
  buf.writeUInt8(0xCC, 2);
  buf.writeUInt8(0xBB, 1);
  buf.writeUInt8(0xAA, 0);
  return buf[0] === 0xAA && buf[1] === 0xBB && buf[2] === 0xCC && buf[3] === 0xDD;
});

test('间隔写入', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt8(1, 0);
  buf.writeUInt8(2, 2);
  buf.writeUInt8(3, 4);
  buf.writeUInt8(4, 6);
  buf.writeUInt8(5, 8);
  return buf[0] === 1 && buf[2] === 2 && buf[4] === 3 && buf[6] === 4 && buf[8] === 5 &&
         buf[1] === 0 && buf[3] === 0 && buf[5] === 0 && buf[7] === 0 && buf[9] === 0;
});

// 循环写入
test('循环写入递增值', () => {
  const buf = Buffer.alloc(10);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt8(i * 10, i);
  }
  let pass = true;
  for (let i = 0; i < 10; i++) {
    if (buf[i] !== i * 10) pass = false;
  }
  return pass;
});

test('循环写入相同值', () => {
  const buf = Buffer.alloc(10);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt8(123, i);
  }
  let pass = true;
  for (let i = 0; i < 10; i++) {
    if (buf[i] !== 123) pass = false;
  }
  return pass;
});

test('循环写入交替值', () => {
  const buf = Buffer.alloc(10);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt8(i % 2 === 0 ? 0xFF : 0x00, i);
  }
  let pass = true;
  for (let i = 0; i < 10; i++) {
    if (buf[i] !== (i % 2 === 0 ? 0xFF : 0x00)) pass = false;
  }
  return pass;
});

// 批量写入
test('批量写入 100 个字节', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt8(i % 256, i);
  }
  let pass = true;
  for (let i = 0; i < 100; i++) {
    if (buf[i] !== i % 256) pass = false;
  }
  return pass;
});

test('批量写入后检查边界', () => {
  const buf = Buffer.alloc(50);
  for (let i = 0; i < 50; i++) {
    buf.writeUInt8(200, i);
  }
  return buf[0] === 200 && buf[25] === 200 && buf[49] === 200;
});

// 重复写入同一位置
test('重复写入同一位置 10 次', () => {
  const buf = Buffer.alloc(4);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt8(i, 0);
  }
  return buf[0] === 9;
});

test('交替重复写入', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(100, 0);
  buf.writeUInt8(200, 1);
  buf.writeUInt8(150, 0);
  buf.writeUInt8(250, 1);
  return buf[0] === 150 && buf[1] === 250;
});

// 使用返回值链式写入
test('使用返回值链式写入填满 Buffer', () => {
  const buf = Buffer.alloc(10);
  let pos = 0;
  for (let i = 0; i < 10; i++) {
    pos = buf.writeUInt8(i + 10, pos);
  }
  let pass = pos === 10;
  for (let i = 0; i < 10; i++) {
    if (buf[i] !== i + 10) pass = false;
  }
  return pass;
});

// 跳跃式写入
test('跳跃式写入奇数位置', () => {
  const buf = Buffer.alloc(10);
  for (let i = 1; i < 10; i += 2) {
    buf.writeUInt8(i * 10, i);
  }
  return buf[1] === 10 && buf[3] === 30 && buf[5] === 50 && buf[7] === 70 && buf[9] === 90 &&
         buf[0] === 0 && buf[2] === 0 && buf[4] === 0 && buf[6] === 0 && buf[8] === 0;
});

test('跳跃式写入偶数位置', () => {
  const buf = Buffer.alloc(10);
  for (let i = 0; i < 10; i += 2) {
    buf.writeUInt8(i * 10, i);
  }
  return buf[0] === 0 && buf[2] === 20 && buf[4] === 40 && buf[6] === 60 && buf[8] === 80 &&
         buf[1] === 0 && buf[3] === 0 && buf[5] === 0 && buf[7] === 0 && buf[9] === 0;
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
