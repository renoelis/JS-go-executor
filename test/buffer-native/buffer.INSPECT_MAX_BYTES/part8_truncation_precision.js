// buffer.INSPECT_MAX_BYTES - inspect 截断精确行为测试
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

// 精确边界测试
test('INSPECT_MAX_BYTES=1 时显示最多 1 字节', () => {
  buffer.INSPECT_MAX_BYTES = 1;
  const buf = Buffer.from([0x01, 0x02, 0x03]);
  const inspected = buf.inspect();
  return inspected.includes('...') && inspected.includes('01');
});

test('INSPECT_MAX_BYTES=2 时显示最多 2 字节', () => {
  buffer.INSPECT_MAX_BYTES = 2;
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const inspected = buf.inspect();
  return inspected.includes('...') && inspected.includes('01') && inspected.includes('02');
});

test('刚好等于长度时完整显示', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
  const inspected = buf.inspect();
  return !inspected.includes('...') && inspected.includes('05');
});

test('超出 1 字节时截断', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('INSPECT_MAX_BYTES=0 时所有 Buffer 都截断', () => {
  buffer.INSPECT_MAX_BYTES = 0;
  const buf1 = Buffer.from([0x01]);
  const buf2 = Buffer.from([0x01, 0x02, 0x03]);
  const inspected1 = buf1.inspect();
  const inspected2 = buf2.inspect();
  return inspected1.includes('...') && inspected2.includes('...');
});

test('大 Buffer 截断时省略号的位置', () => {
  buffer.INSPECT_MAX_BYTES = 3;
  const buf = Buffer.alloc(100, 0xAA);
  const inspected = buf.inspect();
  return inspected.includes('...') && inspected.includes('aa');
});

// 不同内容模式的截断
test('全零 Buffer 截断正确', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20, 0x00);
  const inspected = buf.inspect();
  return inspected.includes('00') && inspected.includes('...');
});

test('全 FF Buffer 截断正确', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20, 0xFF);
  const inspected = buf.inspect();
  return inspected.includes('ff') && inspected.includes('...');
});

test('混合内容 Buffer 截断正确', () => {
  buffer.INSPECT_MAX_BYTES = 4;
  const buf = Buffer.from([0x00, 0xFF, 0xAA, 0x55, 0x12, 0x34, 0x56, 0x78]);
  const inspected = buf.inspect();
  return inspected.includes('...') && (inspected.includes('00') || inspected.includes('ff'));
});

// 修改 INSPECT_MAX_BYTES 对已存在 Buffer 的影响
test('修改后对新 Buffer 立即生效', () => {
  buffer.INSPECT_MAX_BYTES = 100;
  const buf1 = Buffer.alloc(50, 0x41);
  const inspected1 = buf1.inspect();

  buffer.INSPECT_MAX_BYTES = 5;
  const buf2 = Buffer.alloc(50, 0x42);
  const inspected2 = buf2.inspect();

  return !inspected1.includes('...') && inspected2.includes('...');
});

test('修改后对已存在 Buffer 也生效', () => {
  buffer.INSPECT_MAX_BYTES = 100;
  const buf = Buffer.alloc(50, 0x41);
  const inspected1 = buf.inspect();

  buffer.INSPECT_MAX_BYTES = 5;
  const inspected2 = buf.inspect();

  return !inspected1.includes('...') && inspected2.includes('...');
});

// 浮点数的处理
test('浮点数 INSPECT_MAX_BYTES 向下取整行为', () => {
  buffer.INSPECT_MAX_BYTES = 5.9;
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const inspected = buf.inspect();
  // 应该按照 5 处理
  return inspected.includes('...');
});

test('极小浮点数 0.1', () => {
  buffer.INSPECT_MAX_BYTES = 0.1;
  const buf = Buffer.from([0x01, 0x02]);
  const inspected = buf.inspect();
  // 应该按照 0 处理
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
