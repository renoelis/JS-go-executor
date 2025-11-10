// 内存安全与性能测试
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

// === 内存安全测试 ===

test('BE: 多次创建销毁 Buffer 一致性', () => {
  const data = [0x12, 0x34, 0x56];
  const results = [];
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.from(data);
    results.push(buf.readUIntBE(0, 3));
  }
  return results.every(r => r === 0x123456);
});

test('LE: 多次创建销毁 Buffer 一致性', () => {
  const data = [0x12, 0x34, 0x56];
  const results = [];
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.from(data);
    results.push(buf.readUIntLE(0, 3));
  }
  return results.every(r => r === 0x563412);
});

// === 大量连续读取 ===

test('BE: 同一位置 10000 次读取', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const expected = 0x123456;
  for (let i = 0; i < 10000; i++) {
    if (buf.readUIntBE(0, 3) !== expected) {
      return false;
    }
  }
  return true;
});

test('LE: 同一位置 10000 次读取', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const expected = 0x563412;
  for (let i = 0; i < 10000; i++) {
    if (buf.readUIntLE(0, 3) !== expected) {
      return false;
    }
  }
  return true;
});

test('BE: 1000 个不同位置读取', () => {
  const buf = Buffer.alloc(2000);
  for (let i = 0; i < 1000; i++) {
    buf.writeUIntBE(i, i * 2, 2);
  }
  for (let i = 0; i < 1000; i++) {
    if (buf.readUIntBE(i * 2, 2) !== i) {
      return false;
    }
  }
  return true;
});

test('LE: 1000 个不同位置读取', () => {
  const buf = Buffer.alloc(2000);
  for (let i = 0; i < 1000; i++) {
    buf.writeUIntLE(i, i * 2, 2);
  }
  for (let i = 0; i < 1000; i++) {
    if (buf.readUIntLE(i * 2, 2) !== i) {
      return false;
    }
  }
  return true;
});

// === 交替读写测试 ===

test('BE: 1000 次交替读写', () => {
  const buf = Buffer.alloc(6);
  for (let i = 0; i < 1000; i++) {
    buf.writeUIntBE(i, 0, 3);
    if (buf.readUIntBE(0, 3) !== i) {
      return false;
    }
  }
  return true;
});

test('LE: 1000 次交替读写', () => {
  const buf = Buffer.alloc(6);
  for (let i = 0; i < 1000; i++) {
    buf.writeUIntLE(i, 0, 3);
    if (buf.readUIntLE(0, 3) !== i) {
      return false;
    }
  }
  return true;
});

// === 随机访问模式 ===

test('BE: 随机位置读取', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 50; i++) {
    buf.writeUIntBE(i * 2, i * 2, 2);
  }
  const positions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
  for (const pos of positions) {
    const expected = pos / 2 * 2;
    if (buf.readUIntBE(pos, 2) !== expected) {
      return false;
    }
  }
  return true;
});

test('LE: 随机位置读取', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 50; i++) {
    buf.writeUIntLE(i * 2, i * 2, 2);
  }
  const positions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
  for (const pos of positions) {
    const expected = pos / 2 * 2;
    if (buf.readUIntLE(pos, 2) !== expected) {
      return false;
    }
  }
  return true;
});

// === 内存对齐测试 ===

test('BE: 非对齐地址（奇数 offset）', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x56]);
  return buf.readUIntBE(1, 3) === 0x123456;
});

test('LE: 非对齐地址（奇数 offset）', () => {
  const buf = Buffer.from([0x00, 0x56, 0x34, 0x12]);
  return buf.readUIntLE(1, 3) === 0x123456;
});

// === 访问模式测试 ===

test('BE: 稀疏访问（每隔 16 字节）', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 6; i++) {
    buf.writeUIntBE(i * 100, i * 16, 2);
  }
  for (let i = 0; i < 6; i++) {
    if (buf.readUIntBE(i * 16, 2) !== i * 100) {
      return false;
    }
  }
  return true;
});

test('LE: 稀疏访问（每隔 16 字节）', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 6; i++) {
    buf.writeUIntLE(i * 100, i * 16, 2);
  }
  for (let i = 0; i < 6; i++) {
    if (buf.readUIntLE(i * 16, 2) !== i * 100) {
      return false;
    }
  }
  return true;
});

test('BE: 密集访问（连续字节）', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 9; i++) {
    buf.writeUIntBE(i * 10, i * 2, 2);
  }
  for (let i = 0; i < 9; i++) {
    if (buf.readUIntBE(i * 2, 2) !== i * 10) {
      return false;
    }
  }
  return true;
});

test('LE: 密集访问（连续字节）', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 9; i++) {
    buf.writeUIntLE(i * 10, i * 2, 2);
  }
  for (let i = 0; i < 9; i++) {
    if (buf.readUIntLE(i * 2, 2) !== i * 10) {
      return false;
    }
  }
  return true;
});

test('BE: 向前扫描', () => {
  const buf = Buffer.alloc(30);
  for (let i = 0; i < 10; i++) {
    buf.writeUIntBE(i * 10, i * 3, 3);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUIntBE(i * 3, 3) !== i * 10) {
      return false;
    }
  }
  return true;
});

test('LE: 向前扫描', () => {
  const buf = Buffer.alloc(30);
  for (let i = 0; i < 10; i++) {
    buf.writeUIntLE(i * 10, i * 3, 3);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUIntLE(i * 3, 3) !== i * 10) {
      return false;
    }
  }
  return true;
});

test('BE: 向后扫描', () => {
  const buf = Buffer.alloc(30);
  for (let i = 0; i < 10; i++) {
    buf.writeUIntBE(i * 10, i * 3, 3);
  }
  for (let i = 9; i >= 0; i--) {
    if (buf.readUIntBE(i * 3, 3) !== i * 10) {
      return false;
    }
  }
  return true;
});

test('LE: 向后扫描', () => {
  const buf = Buffer.alloc(30);
  for (let i = 0; i < 10; i++) {
    buf.writeUIntLE(i * 10, i * 3, 3);
  }
  for (let i = 9; i >= 0; i--) {
    if (buf.readUIntLE(i * 3, 3) !== i * 10) {
      return false;
    }
  }
  return true;
});

test('BE: 跳跃扫描（步长 8）', () => {
  const buf = Buffer.alloc(80);
  for (let i = 0; i < 10; i++) {
    buf.writeUIntBE(i * 100, i * 8, 2);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUIntBE(i * 8, 2) !== i * 100) {
      return false;
    }
  }
  return true;
});

test('LE: 跳跃扫描（步长 8）', () => {
  const buf = Buffer.alloc(80);
  for (let i = 0; i < 10; i++) {
    buf.writeUIntLE(i * 100, i * 8, 2);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUIntLE(i * 8, 2) !== i * 100) {
      return false;
    }
  }
  return true;
});

// === 不同大小 Buffer 性能 ===

test('BE: 小 Buffer（20 字节）', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 9; i++) {
    buf.writeUIntBE(i * 10, i * 2, 2);
  }
  for (let i = 0; i < 9; i++) {
    if (buf.readUIntBE(i * 2, 2) !== i * 10) {
      return false;
    }
  }
  return true;
});

test('LE: 小 Buffer（20 字节）', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 9; i++) {
    buf.writeUIntLE(i * 10, i * 2, 2);
  }
  for (let i = 0; i < 9; i++) {
    if (buf.readUIntLE(i * 2, 2) !== i * 10) {
      return false;
    }
  }
  return true;
});

test('BE: 中等 Buffer（1000 字节）', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < 100; i++) {
    buf.writeUIntBE(i, i * 10, 3);
  }
  for (let i = 0; i < 100; i++) {
    if (buf.readUIntBE(i * 10, 3) !== i) {
      return false;
    }
  }
  return true;
});

test('LE: 中等 Buffer（1000 字节）', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < 100; i++) {
    buf.writeUIntLE(i, i * 10, 3);
  }
  for (let i = 0; i < 100; i++) {
    if (buf.readUIntLE(i * 10, 3) !== i) {
      return false;
    }
  }
  return true;
});

test('BE: 大 Buffer（10000 字节）', () => {
  const buf = Buffer.alloc(10000);
  for (let i = 0; i < 100; i++) {
    buf.writeUIntBE(i, i * 100, 3);
  }
  for (let i = 0; i < 100; i++) {
    if (buf.readUIntBE(i * 100, 3) !== i) {
      return false;
    }
  }
  return true;
});

test('LE: 大 Buffer（10000 字节）', () => {
  const buf = Buffer.alloc(10000);
  for (let i = 0; i < 100; i++) {
    buf.writeUIntLE(i, i * 100, 3);
  }
  for (let i = 0; i < 100; i++) {
    if (buf.readUIntLE(i * 100, 3) !== i) {
      return false;
    }
  }
  return true;
});

// === 内存复用与完整性 ===

test('BE: 同一 Buffer 不同值', () => {
  const buf = Buffer.alloc(6);
  const values = [100, 200, 300, 400, 500];
  for (const val of values) {
    buf.writeUIntBE(val, 0, 3);
    if (buf.readUIntBE(0, 3) !== val) {
      return false;
    }
  }
  return true;
});

test('LE: 同一 Buffer 不同值', () => {
  const buf = Buffer.alloc(6);
  const values = [100, 200, 300, 400, 500];
  for (const val of values) {
    buf.writeUIntLE(val, 0, 3);
    if (buf.readUIntLE(0, 3) !== val) {
      return false;
    }
  }
  return true;
});

test('BE: 数据完整性验证', () => {
  const buf = Buffer.alloc(100);
  const testData = [];
  for (let i = 0; i < 50; i++) {
    const val = Math.floor(Math.random() * 65536);
    testData.push({ offset: i * 2, value: val });
    buf.writeUIntBE(val, i * 2, 2);
  }
  for (const { offset, value } of testData) {
    if (buf.readUIntBE(offset, 2) !== value) {
      return false;
    }
  }
  return true;
});

test('LE: 数据完整性验证', () => {
  const buf = Buffer.alloc(100);
  const testData = [];
  for (let i = 0; i < 50; i++) {
    const val = Math.floor(Math.random() * 65536);
    testData.push({ offset: i * 2, value: val });
    buf.writeUIntLE(val, i * 2, 2);
  }
  for (const { offset, value } of testData) {
    if (buf.readUIntLE(offset, 2) !== value) {
      return false;
    }
  }
  return true;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;
const result = {
  success: failed === 0,
  summary: { total: tests.length, passed, failed, successRate: ((passed / tests.length) * 100).toFixed(2) + '%' },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
