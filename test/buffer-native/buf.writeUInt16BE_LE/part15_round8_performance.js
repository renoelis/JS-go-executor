// buf.writeUInt16BE/LE() - Round 8: 性能与压力测试
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

// 1. 大量连续写入
test('writeUInt16BE: 1万次连续写入', () => {
  const buf = Buffer.alloc(20000);
  for (let i = 0; i < 10000; i++) {
    buf.writeUInt16BE(i & 0xFFFF, i * 2);
  }
  return buf.readUInt16BE(0) === 0 && buf.readUInt16BE(9999 * 2) === 9999;
});

test('writeUInt16LE: 1万次连续写入', () => {
  const buf = Buffer.alloc(20000);
  for (let i = 0; i < 10000; i++) {
    buf.writeUInt16LE(i & 0xFFFF, i * 2);
  }
  return buf.readUInt16LE(0) === 0 && buf.readUInt16LE(9999 * 2) === 9999;
});

// 2. 重复覆盖写入
test('writeUInt16BE: 同一位置 1000 次覆盖', () => {
  const buf = Buffer.alloc(2);
  for (let i = 0; i < 1000; i++) {
    buf.writeUInt16BE(i & 0xFFFF, 0);
  }
  return buf.readUInt16BE(0) === 999;
});

test('writeUInt16LE: 同一位置 1000 次覆盖', () => {
  const buf = Buffer.alloc(2);
  for (let i = 0; i < 1000; i++) {
    buf.writeUInt16LE(i & 0xFFFF, 0);
  }
  return buf.readUInt16LE(0) === 999;
});

// 3. 交替位置写入
test('writeUInt16BE: 奇偶位置交替写入', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < 499; i++) {
    buf.writeUInt16BE(i, i * 2);
  }
  let pass = true;
  for (let i = 0; i < 499; i++) {
    if (buf.readUInt16BE(i * 2) !== i) pass = false;
  }
  return pass;
});

test('writeUInt16LE: 奇偶位置交替写入', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < 499; i++) {
    buf.writeUInt16LE(i, i * 2);
  }
  let pass = true;
  for (let i = 0; i < 499; i++) {
    if (buf.readUInt16LE(i * 2) !== i) pass = false;
  }
  return pass;
});

// 4. 随机位置写入
test('writeUInt16BE: 随机 offset 写入 100 次', () => {
  const buf = Buffer.alloc(1000);
  const written = [];
  for (let i = 0; i < 100; i++) {
    const offset = Math.floor(Math.random() * 499) * 2;
    const value = Math.floor(Math.random() * 65536);
    buf.writeUInt16BE(value, offset);
    written.push({ offset, value });
  }
  // 验证最后写入的值
  const last = written[written.length - 1];
  return buf.readUInt16BE(last.offset) === last.value;
});

test('writeUInt16LE: 随机 offset 写入 100 次', () => {
  const buf = Buffer.alloc(1000);
  const written = [];
  for (let i = 0; i < 100; i++) {
    const offset = Math.floor(Math.random() * 499) * 2;
    const value = Math.floor(Math.random() * 65536);
    buf.writeUInt16LE(value, offset);
    written.push({ offset, value });
  }
  const last = written[written.length - 1];
  return buf.readUInt16LE(last.offset) === last.value;
});

// 5. 全值域遍历
test('writeUInt16BE: 写入所有 256 的倍数', () => {
  const buf = Buffer.alloc(512);
  for (let i = 0; i < 256; i++) {
    buf.writeUInt16BE(i * 256, i * 2);
  }
  return buf.readUInt16BE(0) === 0 && buf.readUInt16BE(255 * 2) === 65280;
});

test('writeUInt16LE: 写入所有 256 的倍数', () => {
  const buf = Buffer.alloc(512);
  for (let i = 0; i < 256; i++) {
    buf.writeUInt16LE(i * 256, i * 2);
  }
  return buf.readUInt16LE(0) === 0 && buf.readUInt16LE(255 * 2) === 65280;
});

// 6. 边界值密集测试
test('writeUInt16BE: 边界值密集写入', () => {
  const buf = Buffer.alloc(20);
  const values = [0, 1, 127, 128, 255, 256, 32767, 32768, 65534, 65535];
  for (let i = 0; i < values.length; i++) {
    buf.writeUInt16BE(values[i], i * 2);
  }
  let pass = true;
  for (let i = 0; i < values.length; i++) {
    if (buf.readUInt16BE(i * 2) !== values[i]) pass = false;
  }
  return pass;
});

test('writeUInt16LE: 边界值密集写入', () => {
  const buf = Buffer.alloc(20);
  const values = [0, 1, 127, 128, 255, 256, 32767, 32768, 65534, 65535];
  for (let i = 0; i < values.length; i++) {
    buf.writeUInt16LE(values[i], i * 2);
  }
  let pass = true;
  for (let i = 0; i < values.length; i++) {
    if (buf.readUInt16LE(i * 2) !== values[i]) pass = false;
  }
  return pass;
});

// 7. 大 buffer 分散写入
test('writeUInt16BE: 100KB buffer 每 1KB 写入', () => {
  const size = 100 * 1024;
  const buf = Buffer.alloc(size);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt16BE(i, i * 1024);
  }
  return buf.readUInt16BE(0) === 0 && buf.readUInt16BE(99 * 1024) === 99;
});

test('writeUInt16LE: 100KB buffer 每 1KB 写入', () => {
  const size = 100 * 1024;
  const buf = Buffer.alloc(size);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt16LE(i, i * 1024);
  }
  return buf.readUInt16LE(0) === 0 && buf.readUInt16LE(99 * 1024) === 99;
});

// 8. 模式填充
test('writeUInt16BE: 0xAA55 模式填充 1000 次', () => {
  const buf = Buffer.alloc(2000);
  for (let i = 0; i < 1000; i++) {
    buf.writeUInt16BE(0xAA55, i * 2);
  }
  return buf[0] === 0xAA && buf[1] === 0x55 && buf[1998] === 0xAA && buf[1999] === 0x55;
});

test('writeUInt16LE: 0x55AA 模式填充 1000 次', () => {
  const buf = Buffer.alloc(2000);
  for (let i = 0; i < 1000; i++) {
    buf.writeUInt16LE(0x55AA, i * 2);
  }
  return buf[0] === 0xAA && buf[1] === 0x55 && buf[1998] === 0xAA && buf[1999] === 0x55;
});

// 9. 逐字节递增
test('writeUInt16BE: 0x0000 到 0x0100 连续写入', () => {
  const buf = Buffer.alloc(514);
  for (let i = 0; i <= 256; i++) {
    buf.writeUInt16BE(i, i * 2);
  }
  return buf.readUInt16BE(0) === 0 && buf.readUInt16BE(256 * 2) === 256;
});

test('writeUInt16LE: 0x0000 到 0x0100 连续写入', () => {
  const buf = Buffer.alloc(514);
  for (let i = 0; i <= 256; i++) {
    buf.writeUInt16LE(i, i * 2);
  }
  return buf.readUInt16LE(0) === 0 && buf.readUInt16LE(256 * 2) === 256;
});

// 10. 多 buffer 并行写入
test('writeUInt16BE: 多个 buffer 独立写入', () => {
  const bufs = [];
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.alloc(10);
    buf.writeUInt16BE(i, 0);
    buf.writeUInt16BE(i * 2, 2);
    buf.writeUInt16BE(i * 3, 4);
    bufs.push(buf);
  }
  return bufs[0].readUInt16BE(0) === 0 && bufs[99].readUInt16BE(0) === 99 && bufs[50].readUInt16BE(4) === 150;
});

test('writeUInt16LE: 多个 buffer 独立写入', () => {
  const bufs = [];
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.alloc(10);
    buf.writeUInt16LE(i, 0);
    buf.writeUInt16LE(i * 2, 2);
    buf.writeUInt16LE(i * 3, 4);
    bufs.push(buf);
  }
  return bufs[0].readUInt16LE(0) === 0 && bufs[99].readUInt16LE(0) === 99 && bufs[50].readUInt16LE(4) === 150;
});

// 11. slice 大量创建和写入
test('writeUInt16BE: 创建 100 个 slice 并写入', () => {
  const buf = Buffer.alloc(1000);
  const slices = [];
  for (let i = 0; i < 100; i++) {
    const slice = buf.slice(i * 10, i * 10 + 10);
    slice.writeUInt16BE(i, 0);
    slices.push(slice);
  }
  return buf.readUInt16BE(0) === 0 && buf.readUInt16BE(990) === 99;
});

test('writeUInt16LE: 创建 100 个 slice 并写入', () => {
  const buf = Buffer.alloc(1000);
  const slices = [];
  for (let i = 0; i < 100; i++) {
    const slice = buf.slice(i * 10, i * 10 + 10);
    slice.writeUInt16LE(i, 0);
    slices.push(slice);
  }
  return buf.readUInt16LE(0) === 0 && buf.readUInt16LE(990) === 99;
});

// 12. 交替字节序写入
test('writeUInt16BE + LE: 交替写入 500 次', () => {
  const buf = Buffer.alloc(2000);
  for (let i = 0; i < 500; i++) {
    if (i % 2 === 0) {
      buf.writeUInt16BE(i, i * 4);
    } else {
      buf.writeUInt16LE(i, i * 4);
    }
  }
  return buf.readUInt16BE(0) === 0 && buf.readUInt16LE(4) === 1;
});

// 13. 位翻转模式
test('writeUInt16BE: 0x0000 和 0xFFFF 交替 500 次', () => {
  const buf = Buffer.alloc(2000);
  for (let i = 0; i < 1000; i++) {
    buf.writeUInt16BE(i % 2 === 0 ? 0x0000 : 0xFFFF, i * 2);
  }
  return buf.readUInt16BE(0) === 0x0000 && buf.readUInt16BE(2) === 0xFFFF;
});

test('writeUInt16LE: 0x0000 和 0xFFFF 交替 500 次', () => {
  const buf = Buffer.alloc(2000);
  for (let i = 0; i < 1000; i++) {
    buf.writeUInt16LE(i % 2 === 0 ? 0x0000 : 0xFFFF, i * 2);
  }
  return buf.readUInt16LE(0) === 0x0000 && buf.readUInt16LE(2) === 0xFFFF;
});

// 14. 返回值验证压力
test('writeUInt16BE: 1000 次返回值验证', () => {
  const buf = Buffer.alloc(2000);
  for (let i = 0; i < 1000; i++) {
    const result = buf.writeUInt16BE(i, i * 2);
    if (result !== i * 2 + 2) return false;
  }
  return true;
});

test('writeUInt16LE: 1000 次返回值验证', () => {
  const buf = Buffer.alloc(2000);
  for (let i = 0; i < 1000; i++) {
    const result = buf.writeUInt16LE(i, i * 2);
    if (result !== i * 2 + 2) return false;
  }
  return true;
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
