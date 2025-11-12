// buffer.INSPECT_MAX_BYTES - 额外查缺补漏测试（第6轮）
const { Buffer } = require('buffer');
const buffer = require('buffer');

const tests = [];
const originalValue = buffer.INSPECT_MAX_BYTES;

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  } finally {
    buffer.INSPECT_MAX_BYTES = originalValue;
  }
}

// 特殊数值边界
test('设置为 0.0000001', () => {
  buffer.INSPECT_MAX_BYTES = 0.0000001;
  const buf = Buffer.from([0x41, 0x42]);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('设置为 -0 应该等同于 0', () => {
  buffer.INSPECT_MAX_BYTES = -0;
  const buf = Buffer.from([0x41]);
  const inspected = buf.inspect();
  // -0 在 JavaScript 中等于 0
  return inspected.includes('...');
});

test('设置为 1.0 精确值', () => {
  buffer.INSPECT_MAX_BYTES = 1.0;
  return buffer.INSPECT_MAX_BYTES === 1;
});

test('设置为 50.0 与默认值比较', () => {
  buffer.INSPECT_MAX_BYTES = 50.0;
  return buffer.INSPECT_MAX_BYTES === 50;
});

// 连续边界测试
test('从 0 到 10 逐个测试', () => {
  for (let i = 0; i <= 10; i++) {
    buffer.INSPECT_MAX_BYTES = i;
    if (buffer.INSPECT_MAX_BYTES !== i) return false;
  }
  return true;
});

test('快速在 0 和 100 之间切换 20 次', () => {
  for (let i = 0; i < 20; i++) {
    buffer.INSPECT_MAX_BYTES = i % 2 === 0 ? 0 : 100;
  }
  return buffer.INSPECT_MAX_BYTES === 100;
});

// Buffer 特殊长度组合
test('空 Buffer 与 INSPECT_MAX_BYTES=0', () => {
  buffer.INSPECT_MAX_BYTES = 0;
  const buf = Buffer.alloc(0);
  const inspected = buf.inspect();
  // 空 Buffer 不应该有省略号
  return !inspected.includes('...');
});

test('1 字节 Buffer 与各种 INSPECT_MAX_BYTES 值', () => {
  const buf = Buffer.from([0xFF]);
  const values = [0, 1, 2, 10, 100, 1000];
  for (const val of values) {
    buffer.INSPECT_MAX_BYTES = val;
    const inspected = buf.inspect();
    if (typeof inspected !== 'string') return false;
  }
  return true;
});

test('2 字节 Buffer 在 INSPECT_MAX_BYTES=1 和 2 的边界', () => {
  const buf = Buffer.from([0xAA, 0xBB]);

  buffer.INSPECT_MAX_BYTES = 1;
  const inspected1 = buf.inspect();

  buffer.INSPECT_MAX_BYTES = 2;
  const inspected2 = buf.inspect();

  // 1 时应该截断，2 时应该完整
  return inspected1.includes('...') && !inspected2.includes('...');
});

// 并发场景模拟
test('同一个 Buffer 多次 inspect 不同 INSPECT_MAX_BYTES', () => {
  const buf = Buffer.alloc(100, 0xCC);
  const results = [];

  for (let i = 10; i <= 100; i += 10) {
    buffer.INSPECT_MAX_BYTES = i;
    results.push(buf.inspect());
  }

  // 所有 inspect 都应该返回字符串
  return results.every(r => typeof r === 'string');
});

test('多个不同 Buffer 共享 INSPECT_MAX_BYTES 设置', () => {
  buffer.INSPECT_MAX_BYTES = 5;

  const buf1 = Buffer.alloc(10, 0x11);
  const buf2 = Buffer.alloc(20, 0x22);
  const buf3 = Buffer.alloc(3, 0x33);

  const i1 = buf1.inspect();
  const i2 = buf2.inspect();
  const i3 = buf3.inspect();

  // buf1 和 buf2 应该截断，buf3 不应该
  return i1.includes('...') && i2.includes('...') && !i3.includes('...');
});

// 特殊内容模式
test('交替 0x00 和 0xFF 的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from([0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF]);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('所有可打印 ASCII 字符', () => {
  buffer.INSPECT_MAX_BYTES = 10;
  const arr = [];
  for (let i = 32; i <= 126; i++) arr.push(i);
  const buf = Buffer.from(arr);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('所有不可打印字符 0x00-0x1F', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const arr = [];
  for (let i = 0; i < 32; i++) arr.push(i);
  const buf = Buffer.from(arr);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// INSPECT_MAX_BYTES 与 Buffer 操作的时序
test('先创建 Buffer 再修改 INSPECT_MAX_BYTES', () => {
  buffer.INSPECT_MAX_BYTES = 100;
  const buf = Buffer.alloc(50, 0x77);

  buffer.INSPECT_MAX_BYTES = 10;
  const inspected = buf.inspect();

  // 应该按新的 INSPECT_MAX_BYTES 截断
  return inspected.includes('...');
});

test('修改 Buffer 内容不影响 INSPECT_MAX_BYTES', () => {
  buffer.INSPECT_MAX_BYTES = 10;
  const savedValue = buffer.INSPECT_MAX_BYTES;

  const buf = Buffer.alloc(20);
  buf.fill(0xFF);
  buf.writeUInt32BE(0x12345678, 0);

  return buffer.INSPECT_MAX_BYTES === savedValue;
});

// 极端浮点数
test('设置为 Number.MAX_VALUE', () => {
  buffer.INSPECT_MAX_BYTES = Number.MAX_VALUE;
  const buf = Buffer.alloc(100, 0x88);
  const inspected = buf.inspect();
  return !inspected.includes('...');
});

test('设置为接近 0 的正数 1e-10', () => {
  buffer.INSPECT_MAX_BYTES = 1e-10;
  const buf = Buffer.from([0x41]);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('设置为大浮点数 1e10', () => {
  buffer.INSPECT_MAX_BYTES = 1e10;
  const buf = Buffer.alloc(100, 0x99);
  const inspected = buf.inspect();
  return !inspected.includes('...');
});

// 重复赋值相同值
test('重复设置相同值 10 次', () => {
  for (let i = 0; i < 10; i++) {
    buffer.INSPECT_MAX_BYTES = 77;
  }
  return buffer.INSPECT_MAX_BYTES === 77;
});

test('在循环中反复赋值和读取', () => {
  for (let i = 0; i < 50; i++) {
    buffer.INSPECT_MAX_BYTES = i + 1;
    const val = buffer.INSPECT_MAX_BYTES;
    if (val !== i + 1) return false;
  }
  return true;
});

// Buffer.from 各种来源
test('从 SharedArrayBuffer 创建的 Buffer', () => {
  try {
    buffer.INSPECT_MAX_BYTES = 5;
    const sab = new SharedArrayBuffer(16);
    const buf = Buffer.from(sab);
    const inspected = buf.inspect();
    return inspected.includes('...');
  } catch (e) {
    // SharedArrayBuffer 可能不支持
    return true;
  }
});

test('从 DataView 的 buffer 创建', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const ab = new ArrayBuffer(20);
  const dv = new DataView(ab);
  const buf = Buffer.from(dv.buffer);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('从 Uint16Array 创建的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const arr = new Uint16Array([0x0102, 0x0304, 0x0506, 0x0708]);
  const buf = Buffer.from(arr.buffer);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// 二进制编码边界
test('包含所有字节值 0x00-0xFF 的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 100;
  const arr = [];
  for (let i = 0; i <= 255; i++) arr.push(i);
  const buf = Buffer.from(arr);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('Latin1 编码字符串', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from('Café résumé', 'latin1');
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('Binary 编码字符串', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from('\x00\x01\x02\x03\x04\x05\x06', 'binary');
  const inspected = buf.inspect();
  return inspected.includes('...');
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
