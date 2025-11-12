// buffer.INSPECT_MAX_BYTES - 深度挑刺和边界组合测试
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

// 多字节字符的边界截断
test('UTF-8 多字节字符在截断边界', () => {
  buffer.INSPECT_MAX_BYTES = 2;
  const buf = Buffer.from('你好');
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('Emoji 字符在截断边界', () => {
  buffer.INSPECT_MAX_BYTES = 2;
  const buf = Buffer.from('😀😁');
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('混合 ASCII 和多字节字符截断', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from('abc你好');
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// 连续修改和恢复
test('保存并恢复 INSPECT_MAX_BYTES', () => {
  const saved = buffer.INSPECT_MAX_BYTES;
  buffer.INSPECT_MAX_BYTES = 77;
  buffer.INSPECT_MAX_BYTES = saved;
  return buffer.INSPECT_MAX_BYTES === saved;
});

test('嵌套修改和恢复', () => {
  const original = buffer.INSPECT_MAX_BYTES;
  buffer.INSPECT_MAX_BYTES = 10;
  const temp1 = buffer.INSPECT_MAX_BYTES;
  buffer.INSPECT_MAX_BYTES = 20;
  const temp2 = buffer.INSPECT_MAX_BYTES;
  buffer.INSPECT_MAX_BYTES = temp1;
  const result = buffer.INSPECT_MAX_BYTES;
  buffer.INSPECT_MAX_BYTES = original;
  return result === 10 && temp2 === 20;
});

// 特殊数值组合
test('INSPECT_MAX_BYTES=0.5 向下取整为 0', () => {
  buffer.INSPECT_MAX_BYTES = 0.5;
  const buf = Buffer.from([0x41, 0x42]);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('INSPECT_MAX_BYTES=1.9 按 1 处理', () => {
  buffer.INSPECT_MAX_BYTES = 1.9;
  const buf = Buffer.from([0x41, 0x42]);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('INSPECT_MAX_BYTES 为极大浮点数', () => {
  buffer.INSPECT_MAX_BYTES = 1e15;
  const buf = Buffer.alloc(100, 0xDD);
  const inspected = buf.inspect();
  return !inspected.includes('...');
});

test('INSPECT_MAX_BYTES 为极小正数', () => {
  buffer.INSPECT_MAX_BYTES = Number.MIN_VALUE;
  const buf = Buffer.from([0x41, 0x42]);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('INSPECT_MAX_BYTES 为 Number.EPSILON', () => {
  buffer.INSPECT_MAX_BYTES = Number.EPSILON;
  const buf = Buffer.from([0x41, 0x42]);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// 不同数值表示形式
test('科学计数法 1e2', () => {
  buffer.INSPECT_MAX_BYTES = 1e2;
  return buffer.INSPECT_MAX_BYTES === 100;
});

test('科学计数法 5e1', () => {
  buffer.INSPECT_MAX_BYTES = 5e1;
  return buffer.INSPECT_MAX_BYTES === 50;
});

test('八进制字面量（实际为十进制）', () => {
  buffer.INSPECT_MAX_BYTES = 64;
  return buffer.INSPECT_MAX_BYTES === 64;
});

test('十六进制字面量（实际为十进制）', () => {
  buffer.INSPECT_MAX_BYTES = 0x32;
  return buffer.INSPECT_MAX_BYTES === 50;
});

// Buffer 特殊状态
test('修改后的 Buffer（写入数据后）', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20);
  buf.fill(0xFF);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('被 fill 的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20);
  buf.fill('abc');
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('部分修改的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20, 0x00);
  buf.writeUInt8(0xFF, 10);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// 边界值的精确验证
test('INSPECT_MAX_BYTES 刚好等于 1', () => {
  buffer.INSPECT_MAX_BYTES = 1;
  const buf1 = Buffer.from([0xAA]);
  const buf2 = Buffer.from([0xAA, 0xBB]);
  const inspected1 = buf1.inspect();
  const inspected2 = buf2.inspect();
  return !inspected1.includes('...') && inspected2.includes('...');
});

test('INSPECT_MAX_BYTES 为 2 的幂次', () => {
  for (let i = 0; i < 10; i++) {
    buffer.INSPECT_MAX_BYTES = Math.pow(2, i);
    if (typeof buffer.INSPECT_MAX_BYTES !== 'number') return false;
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
