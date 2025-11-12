// buffer.INSPECT_MAX_BYTES - 终极查缺补漏（第8轮）
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

// 超长 Buffer 的测试（避免 OOM）
test('接近 1MB 的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 100;
  const buf = Buffer.alloc(1024 * 1024 - 1, 0xAA);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('Buffer.concat 大量小 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 50;
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    buffers.push(Buffer.from([i % 256]));
  }
  const concatenated = Buffer.concat(buffers);
  const inspected = concatenated.inspect();
  return inspected.includes('...');
});

// 写入方法后的 inspect
test('writeInt8 后的 inspect', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(10);
  buf.writeInt8(-128, 0);
  buf.writeInt8(127, 1);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('writeUInt32LE 后的 inspect', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20);
  buf.writeUInt32LE(0xFFFFFFFF, 0);
  buf.writeUInt32LE(0x12345678, 4);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('writeDoubleBE 后的 inspect', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20);
  buf.writeDoubleBE(3.141592653589793, 0);
  buf.writeDoubleBE(-2.718281828459045, 8);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('writeBigInt64LE 后的 inspect', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20);
  buf.writeBigInt64LE(9223372036854775807n, 0);
  buf.writeBigInt64LE(-9223372036854775808n, 8);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// 读取方法不影响 inspect
test('readUInt8 后 inspect 保持一致', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const before = buf.inspect();
  buf.readUInt8(0);
  buf.readUInt8(5);
  const after = buf.inspect();
  return before === after;
});

// fill 的各种参数
test('fill 单字节值', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20);
  buf.fill(0x42);
  const inspected = buf.inspect();
  return inspected.includes('42') && inspected.includes('...');
});

test('fill 字符串值', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20);
  buf.fill('abc');
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('fill Buffer 值', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20);
  const fillBuf = Buffer.from([0xAA, 0xBB, 0xCC]);
  buf.fill(fillBuf);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('fill 带 offset 和 end', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20, 0x00);
  buf.fill(0xFF, 5, 15);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// copy 方法测试
test('copy 到另一个 Buffer 后两者的 inspect', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const src = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const dest = Buffer.alloc(10, 0xFF);
  src.copy(dest, 1);
  const srcInspected = src.inspect();
  const destInspected = dest.inspect();
  return srcInspected.includes('...') && destInspected.includes('...');
});

// swap 方法测试
test('swap16 后的 inspect', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap16();
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('swap32 后的 inspect', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap32();
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('swap64 后的 inspect', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// compare 和 equals 不影响 inspect
test('compare 后 inspect 保持一致', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf1 = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const buf2 = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x07]);
  const before = buf1.inspect();
  buf1.compare(buf2);
  const after = buf1.inspect();
  return before === after;
});

test('equals 后 inspect 保持一致', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf1 = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const buf2 = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const before = buf1.inspect();
  buf1.equals(buf2);
  const after = buf1.inspect();
  return before === after;
});

// includes、indexOf、lastIndexOf 不影响 inspect
test('indexOf 后 inspect 保持一致', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from('abcdefghijk');
  const before = buf.inspect();
  buf.indexOf('def');
  buf.indexOf(0x64);
  const after = buf.inspect();
  return before === after;
});

test('lastIndexOf 后 inspect 保持一致', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from('abcdefgdefhi');
  const before = buf.inspect();
  buf.lastIndexOf('def');
  const after = buf.inspect();
  return before === after;
});

test('includes 后 inspect 保持一致', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from('abcdefghijk');
  const before = buf.inspect();
  buf.includes('def');
  buf.includes(0x65);
  const after = buf.inspect();
  return before === after;
});

// entries、keys、values 迭代器不影响 inspect
test('entries 迭代后 inspect 保持一致', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const before = buf.inspect();
  for (const entry of buf.entries()) {
    // 迭代
  }
  const after = buf.inspect();
  return before === after;
});

test('keys 迭代后 inspect 保持一致', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const before = buf.inspect();
  for (const key of buf.keys()) {
    // 迭代
  }
  const after = buf.inspect();
  return before === after;
});

test('values 迭代后 inspect 保持一致', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const before = buf.inspect();
  for (const val of buf.values()) {
    // 迭代
  }
  const after = buf.inspect();
  return before === after;
});

// INSPECT_MAX_BYTES 在不同操作中的稳定性
test('Buffer.isBuffer 不影响 INSPECT_MAX_BYTES', () => {
  buffer.INSPECT_MAX_BYTES = 73;
  const buf = Buffer.from([0x01]);
  Buffer.isBuffer(buf);
  Buffer.isBuffer({});
  return buffer.INSPECT_MAX_BYTES === 73;
});

test('Buffer.isEncoding 不影响 INSPECT_MAX_BYTES', () => {
  buffer.INSPECT_MAX_BYTES = 84;
  Buffer.isEncoding('utf8');
  Buffer.isEncoding('invalid');
  return buffer.INSPECT_MAX_BYTES === 84;
});

test('Buffer.byteLength 不影响 INSPECT_MAX_BYTES', () => {
  buffer.INSPECT_MAX_BYTES = 95;
  Buffer.byteLength('hello');
  Buffer.byteLength('你好', 'utf8');
  return buffer.INSPECT_MAX_BYTES === 95;
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
