// buf.values() - 深度补充 Part 18: 读写方法和编码完整性
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌', passed: pass });
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
  }
}

// 测试 1: readUInt8 方法
test('readUInt8 应正确读取无符号字节', () => {
  const buf = Buffer.from([0x12, 0xFF, 0x00]);

  return buf.readUInt8(0) === 0x12 && buf.readUInt8(1) === 0xFF && buf.readUInt8(2) === 0x00;
});

// 测试 2: readUInt16BE 方法
test('readUInt16BE 应按大端序读取', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);

  return buf.readUInt16BE(0) === 0x1234 && buf.readUInt16BE(2) === 0x5678;
});

// 测试 3: readUInt16LE 方法
test('readUInt16LE 应按小端序读取', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);

  return buf.readUInt16LE(0) === 0x3412 && buf.readUInt16LE(2) === 0x7856;
});

// 测试 4: readUInt32BE 方法
test('readUInt32BE 应按大端序读取 32 位', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);

  return buf.readUInt32BE(0) === 0x12345678;
});

// 测试 5: readUInt32LE 方法
test('readUInt32LE 应按小端序读取 32 位', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);

  return buf.readUInt32LE(0) === 0x78563412;
});

// 测试 6: readBigUInt64BE 方法
test('readBigUInt64BE 应读取 64 位大端序', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]);

  const value = buf.readBigUInt64BE(0);

  return value === 0x123456789ABCDEF0n;
});

// 测试 7: readBigUInt64LE 方法
test('readBigUInt64LE 应读取 64 位小端序', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]);

  const value = buf.readBigUInt64LE(0);

  return value === 0xF0DEBC9A78563412n;
});

// 测试 8: writeUInt8 方法
test('writeUInt8 应正确写入字节', () => {
  const buf = Buffer.alloc(3);
  buf.writeUInt8(0xFF, 0);
  buf.writeUInt8(0x12, 1);
  buf.writeUInt8(0x00, 2);

  const values = [...buf.values()];

  return values[0] === 0xFF && values[1] === 0x12 && values[2] === 0x00;
});

// 测试 9: writeUInt16BE 方法
test('writeUInt16BE 应按大端序写入', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0x1234, 0);
  buf.writeUInt16BE(0x5678, 2);

  const values = [...buf.values()];

  return values[0] === 0x12 && values[1] === 0x34 && values[2] === 0x56 && values[3] === 0x78;
});

// 测试 10: writeUInt16LE 方法
test('writeUInt16LE 应按小端序写入', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0x1234, 0);
  buf.writeUInt16LE(0x5678, 2);

  const values = [...buf.values()];

  return values[0] === 0x34 && values[1] === 0x12 && values[2] === 0x78 && values[3] === 0x56;
});

// 测试 11: writeUInt32BE 方法
test('writeUInt32BE 应按大端序写入 32 位', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(0x12345678, 0);

  const values = [...buf.values()];

  return values[0] === 0x12 && values[1] === 0x34 && values[2] === 0x56 && values[3] === 0x78;
});

// 测试 12: writeUInt32LE 方法
test('writeUInt32LE 应按小端序写入 32 位', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(0x12345678, 0);

  const values = [...buf.values()];

  return values[0] === 0x78 && values[1] === 0x56 && values[2] === 0x34 && values[3] === 0x12;
});

// 测试 13: readFloatBE 方法
test('readFloatBE 应读取大端序浮点数', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(3.14, 0);

  const value = buf.readFloatBE(0);

  // 浮点数精度问题，检查接近即可
  return Math.abs(value - 3.14) < 0.01;
});

// 测试 14: readFloatLE 方法
test('readFloatLE 应读取小端序浮点数', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(3.14, 0);

  const value = buf.readFloatLE(0);

  return Math.abs(value - 3.14) < 0.01;
});

// 测试 15: readDoubleBE 方法
test('readDoubleBE 应读取大端序双精度', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(2.718281828, 0);

  const value = buf.readDoubleBE(0);

  return Math.abs(value - 2.718281828) < 0.000000001;
});

// 测试 16: readDoubleLE 方法
test('readDoubleLE 应读取小端序双精度', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(2.718281828, 0);

  const value = buf.readDoubleLE(0);

  return Math.abs(value - 2.718281828) < 0.000000001;
});

// 测试 17: readInt8 方法（有符号）
test('readInt8 应读取有符号字节', () => {
  const buf = Buffer.from([0x7F, 0x80, 0xFF]);

  return buf.readInt8(0) === 127 && buf.readInt8(1) === -128 && buf.readInt8(2) === -1;
});

// 测试 18: readInt16BE 方法（有符号）
test('readInt16BE 应读取有符号 16 位大端序', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0x80, 0x00]);

  return buf.readInt16BE(0) === 32767 && buf.readInt16BE(2) === -32768;
});

// 测试 19: write 字符串 UTF-8
test('write 应写入 UTF-8 字符串', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, 'utf8');

  const values = [...buf.values()];

  return written === 5 && values[0] === 104 && values[4] === 111; // 'h' = 104, 'o' = 111
});

// 测试 20: write 字符串 hex
test('write 应写入 hex 编码', () => {
  const buf = Buffer.alloc(4);
  buf.write('12345678', 0, 'hex');

  const values = [...buf.values()];

  return values[0] === 0x12 && values[3] === 0x78;
});

// 测试 21: write 字符串 base64
test('write 应写入 base64 编码', () => {
  const buf = Buffer.alloc(10);
  buf.write('SGVsbG8=', 0, 'base64');

  const str = buf.toString('utf8', 0, 5);

  return str === 'Hello';
});

// 测试 22: toString UTF-8
test('toString 应正确转换 UTF-8', () => {
  const buf = Buffer.from([72, 101, 108, 108, 111]);

  return buf.toString('utf8') === 'Hello';
});

// 测试 23: toString hex
test('toString 应正确转换 hex', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);

  return buf.toString('hex') === '12345678';
});

// 测试 24: toString base64
test('toString 应正确转换 base64', () => {
  const buf = Buffer.from('Hello');

  return buf.toString('base64') === 'SGVsbG8=';
});

// 测试 25: toString 指定范围
test('toString 应支持指定范围', () => {
  const buf = Buffer.from('Hello World');

  return buf.toString('utf8', 0, 5) === 'Hello' && buf.toString('utf8', 6, 11) === 'World';
});

// 测试 26: Buffer.byteLength UTF-8
test('Buffer.byteLength 应计算 UTF-8 字节长度', () => {
  const len = Buffer.byteLength('Hello');

  return len === 5;
});

// 测试 27: Buffer.byteLength 多字节字符
test('Buffer.byteLength 应正确计算多字节字符', () => {
  const len = Buffer.byteLength('测试', 'utf8');
  const buf = Buffer.from('测试', 'utf8');

  return len === buf.length && len === 6;
});

// 测试 28: Buffer.byteLength hex
test('Buffer.byteLength 应计算 hex 长度', () => {
  const len = Buffer.byteLength('1234', 'hex');

  return len === 2; // 每两个 hex 字符 = 1 字节
});

// 测试 29: transcode 函数
test('transcode 应转换编码', () => {
  const { transcode } = require('buffer');

  const buf = Buffer.from('test', 'utf8');
  const transcoded = transcode(buf, 'utf8', 'latin1');

  return transcoded.length === 4 && [...transcoded.values()].every(v => v < 128);
});

// 测试 30: Buffer.concat 后迭代完整性
test('Buffer.concat 后应能完整迭代', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const buf3 = Buffer.from([5, 6]);

  const concat = Buffer.concat([buf1, buf2, buf3]);

  const values = [...concat.values()];

  if (values.length !== 6) return false;
  if (values[0] !== 1 || values[5] !== 6) return false;

  return true;
});

const passed = tests.filter(t => t.passed === true).length;
const failed = tests.filter(t => t.passed === false).length;

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

return result
