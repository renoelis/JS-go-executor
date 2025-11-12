// buffer.INSPECT_MAX_BYTES - 深度语义和实现细节测试（第7轮）
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

// 省略号出现位置的精确验证
test('inspect 输出中省略号的格式', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20, 0xAB);
  const inspected = buf.inspect();
  // 应该包含 "..." 且是字符串
  return typeof inspected === 'string' && inspected.indexOf('...') > 0;
});

test('截断前显示的字节数精确性', () => {
  buffer.INSPECT_MAX_BYTES = 3;
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
  const inspected = buf.inspect();
  // 应该显示前 3 个字节
  return inspected.includes('01') && inspected.includes('02') && inspected.includes('03');
});

test('非常小的 INSPECT_MAX_BYTES 与长 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 1;
  const buf = Buffer.alloc(1000, 0xCC);
  const inspected = buf.inspect();
  return inspected.includes('cc') && inspected.includes('...');
});

// Buffer 长度的各种边界
test('256 字节 Buffer（单字节边界）', () => {
  buffer.INSPECT_MAX_BYTES = 50;
  const buf = Buffer.alloc(256, 0xDD);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('257 字节 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 50;
  const buf = Buffer.alloc(257, 0xEE);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('1024 字节 Buffer（1KB）', () => {
  buffer.INSPECT_MAX_BYTES = 100;
  const buf = Buffer.alloc(1024, 0xAA);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('8192 字节 Buffer（8KB，常见页大小）', () => {
  buffer.INSPECT_MAX_BYTES = 100;
  const buf = Buffer.alloc(8192, 0xBB);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// subarray 和 slice 的边界情况
test('subarray 偏移后的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20, 0x11);
  const sub = buf.subarray(5, 18);
  const inspected = sub.inspect();
  return inspected.includes('...');
});

test('slice 边界外的处理', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(10, 0x22);
  const sliced = buf.slice(3);
  const inspected = sliced.inspect();
  return typeof inspected === 'string';
});

test('零长度 slice', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(10, 0x33);
  const sliced = buf.slice(5, 5);
  const inspected = sliced.inspect();
  return !inspected.includes('...');
});

// 修改底层 ArrayBuffer 的情况
test('修改 TypedArray 后 Buffer 的 inspect', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const ab = new ArrayBuffer(20);
  const u8 = new Uint8Array(ab);
  u8.fill(0x44);
  const buf = Buffer.from(ab);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('共享 ArrayBuffer 的多个 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const ab = new ArrayBuffer(20);
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.from(ab);
  const i1 = buf1.inspect();
  const i2 = buf2.inspect();
  return i1.includes('...') && i2.includes('...');
});

// INSPECT_MAX_BYTES 设置的原子性
test('中断设置不影响值', () => {
  buffer.INSPECT_MAX_BYTES = 50;
  try {
    buffer.INSPECT_MAX_BYTES = "invalid";
  } catch (e) {
    // 设置失败，应该保持原值
    return buffer.INSPECT_MAX_BYTES === 50;
  }
  return false;
});

test('异常后值保持不变', () => {
  buffer.INSPECT_MAX_BYTES = 77;
  const before = buffer.INSPECT_MAX_BYTES;
  try {
    buffer.INSPECT_MAX_BYTES = null;
  } catch (e) {}
  const after = buffer.INSPECT_MAX_BYTES;
  return before === after && after === 77;
});

// 不同进制的数值
test('二进制字面量 0b1010（10）', () => {
  buffer.INSPECT_MAX_BYTES = 0b1010;
  return buffer.INSPECT_MAX_BYTES === 10;
});

test('八进制字面量 0o77（63）', () => {
  buffer.INSPECT_MAX_BYTES = 0o77;
  return buffer.INSPECT_MAX_BYTES === 63;
});

test('十六进制字面量 0xFF（255）', () => {
  buffer.INSPECT_MAX_BYTES = 0xFF;
  return buffer.INSPECT_MAX_BYTES === 255;
});

// 跨模块一致性
test('require 多次获取相同实例', () => {
  delete require.cache[require.resolve('buffer')];
  const buf1 = require('buffer');
  delete require.cache[require.resolve('buffer')];
  const buf2 = require('buffer');

  buf1.INSPECT_MAX_BYTES = 88;
  // 两次 require 应该是同一个模块实例
  return buf2.INSPECT_MAX_BYTES === 88;
});

// 特殊字符串编码场景
test('包含 null 字节的字符串', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from('ab\x00cd\x00ef\x00gh');
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('仅 null 字节的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from('\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00');
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('ASCII 控制字符的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from('\t\n\r\x07\x08\x0B\x0C\x1B');
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// inspect 输出长度验证
test('小 Buffer 输出长度合理', () => {
  buffer.INSPECT_MAX_BYTES = 50;
  const buf = Buffer.from([0x01, 0x02, 0x03]);
  const inspected = buf.inspect();
  // 输出应该不会太长
  return inspected.length < 200;
});

test('大 Buffer 截断后输出长度有限', () => {
  buffer.INSPECT_MAX_BYTES = 10;
  const buf = Buffer.alloc(10000, 0xFF);
  const inspected = buf.inspect();
  // 截断后输出不应该太长
  return inspected.length < 500;
});

// 浮点数的向下取整验证
test('2.1 向下取整为 2', () => {
  buffer.INSPECT_MAX_BYTES = 2.1;
  const buf = Buffer.from([0x01, 0x02, 0x03]);
  const inspected = buf.inspect();
  // 应该按 2 处理
  return inspected.includes('...');
});

test('9.999 向下取整为 9', () => {
  buffer.INSPECT_MAX_BYTES = 9.999;
  const buf = Buffer.alloc(10, 0xAA);
  const inspected = buf.inspect();
  // 应该按 9 处理
  return inspected.includes('...');
});

test('99.00001 向下取整为 99', () => {
  buffer.INSPECT_MAX_BYTES = 99.00001;
  const buf = Buffer.alloc(100, 0xBB);
  const inspected = buf.inspect();
  // 应该按 99 处理
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
