const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    tests.push({ name, passed: result, details: result ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, error: e.message, stack: e.stack });
  }
}

test('极端情况 - 超长循环填充模式', () => {
  const buf = Buffer.allocUnsafeSlow(10000);
  buf.fill('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  let ok = true;
  for (let i = 0; i < 10000; i++) {
    const expected = 65 + (i % 26); // ASCII A-Z
    if (buf[i] !== expected) { ok = false; break; }
  }
  return ok;
});

test('极端情况 - 单字节重复采样', () => {
  const buf = Buffer.allocUnsafeSlow(50000);
  buf.fill(85); // 字节 85
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 85) return false;
  }
  return true;
});

test('极端情况 - 超大规模但受限测试（8MB）', () => {
  const size = 8 * 1024 * 1024;
  try {
    const buf = Buffer.allocUnsafeSlow(size);
    // 快速老化：测试首尾
    buf[0] = 42;
    buf[size - 1] = 24;
    return buf.length === size && buf[0] === 42 && buf[size - 1] === 24;
  } catch (e) {
    return e.message && e.message.includes('size') || e.message.includes('memory');
  }
});

test('极端情况 - fill 深度多段覆盖性测试', () => {
  const buf = Buffer.allocUnsafeSlow(3000);
  const parts = [1000, 1000, 1000];
  const fills = ['A', 'B', 'C'];

  let offset = 0;
  parts.forEach((len, idx) => {
    buf.fill(fills[idx], offset, offset + len);
    offset += len;
  });

  const sectionA = buf.subarray(0, 1000);
  const sectionB = buf.subarray(1000, 2000);
  const sectionC = buf.subarray(2000, 3000);

  return sectionA.every(b => b === 65) && sectionB.every(b => b === 66) && sectionC.every(b => b === 67);
});

test('极端情况 - allocUnsafeSlow 忽略填充参数', () => {
  const input = '世界'; // 6 bytes in utf8
  const buf = Buffer.allocUnsafeSlow(4, input, 'utf8'); // 后两个参数被忽略
  return buf.length === 4;
});

test('极端情况 - 模拟大型基准测试堆分配', () => {
  const stressCount = 200;
  const sizes = [512, 1024, 2048, 4096, 8192];
  const buffers = [];
  for (let i = 0; i < stressCount; i++) {
    const size = sizes[i % sizes.length];
    const buf = Buffer.allocUnsafeSlow(size);
    buf.fill(i % 256);
    buffers.push(buf);
  }
  return buffers.every((buf, i) => buf.length === sizes[i % sizes.length] && buf[0] === i % 256);
});

test('极端情况 - 尺寸跨多数量级稳定性', () => {
  const sizes = [1, 15, 255, 1023, 4095, 16383, 65536];
  let ok = true;
  sizes.forEach(size => {
    try {
      const buf = Buffer.allocUnsafeSlow(size);
      buf.fill(Math.floor(Math.random() * 256));
      if (buf.length !== size) ok = false;
    } catch (e) {
      ok = false;
    }
  });
  return ok;
});

test('极端情况 - 快速多重复制 overlay 内存稳定', () => {
  const fill = Buffer.from('XYZ');
  const buf = Buffer.allocUnsafeSlow(9000);
  buf.fill(fill);
  let i = 0;
  while (i < 9000) {
    if (buf[i] !== 88 || buf[i + 1] !== 89 || buf[i + 2] !== 90) return false;
    i += 3;
  }
  return true;
});

test('极端情况 - 快速迭代子视图非破坏测试', () => {
  const base = Buffer.allocUnsafeSlow(10000);
  base.fill('A');
  const views = [];
  for (let start = 0; start < 10000; start += 1000) {
    const view = base.subarray(start, start + 500);
    view.fill('B');
    views.push(view);
  }
  return views.every(v => v.length === 500 && v[0] === 66) && base[0] === 66 && base[499] === 66 && base[1000] === 66;
});

test('极端情况 - 超大组合参数组合稳定性', () => {
  const buf = Buffer.allocUnsafeSlow(1024 * 1024);
  buf.fill('encoding-test', 0, buf.length, 'ascii');
  const expected = 'encoding-tes'; // 前12字节是 "encoding-tes"
  return buf.length === 1024 * 1024 && buf.slice(0, 12).toString() === expected;
});

test('极端情况 - long-lived buffer 视图内存依赖稳定性', () => {
  let buf1 = Buffer.allocUnsafeSlow(5000);
  buf1.fill('X');
  let buf2 = Buffer.allocUnsafeSlow(5000);
  buf2.fill('Y');

  const combo = [buf1.subarray(0, 1000), buf2.subarray(500, 1500)];
  combo[0].fill('Z');
  combo[1].fill('W');

  return buf1[0] === 90 && buf2[500] === 87;
});

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

try {
  const result = {
    success: failed === 0,
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
    },
    tests: tests,
    roundInfo: {
      round: 5,
      description: '极端场景和性能压力补充测试'
    }
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