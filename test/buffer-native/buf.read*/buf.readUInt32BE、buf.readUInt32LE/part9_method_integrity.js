// 方法完整性测试
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

// 方法存在性
test('readUInt32BE 方法存在', () => {
  const buf = Buffer.alloc(4);
  return typeof buf.readUInt32BE === 'function';
});

test('readUInt32LE 方法存在', () => {
  const buf = Buffer.alloc(4);
  return typeof buf.readUInt32LE === 'function';
});

// 方法返回值类型
test('BE: 返回值是 number 类型', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return typeof buf.readUInt32BE(0) === 'number';
});

test('LE: 返回值是 number 类型', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return typeof buf.readUInt32LE(0) === 'number';
});

// 方法不修改 Buffer
test('BE: 读取不修改 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const before = buf.toString('hex');
  buf.readUInt32BE(0);
  const after = buf.toString('hex');
  return before === after;
});

test('LE: 读取不修改 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const before = buf.toString('hex');
  buf.readUInt32LE(0);
  const after = buf.toString('hex');
  return before === after;
});

// 多次读取返回相同值
test('BE: 多次读取返回相同值', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const v1 = buf.readUInt32BE(0);
  const v2 = buf.readUInt32BE(0);
  const v3 = buf.readUInt32BE(0);
  return v1 === v2 && v2 === v3 && v1 === 0x12345678;
});

test('LE: 多次读取返回相同值', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const v1 = buf.readUInt32LE(0);
  const v2 = buf.readUInt32LE(0);
  const v3 = buf.readUInt32LE(0);
  return v1 === v2 && v2 === v3 && v1 === 0x78563412;
});

// 参数数量测试
test('BE: 无参数调用 (使用默认 offset 0)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt32BE() === 0x12345678;
});

test('LE: 无参数调用 (使用默认 offset 0)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt32LE() === 0x78563412;
});

// 链式调用
test('BE: 可以在表达式中使用', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x0A]);
  const result = buf.readUInt32BE(0) + 5;
  return result === 15;
});

test('LE: 可以在表达式中使用', () => {
  const buf = Buffer.from([0x0A, 0x00, 0x00, 0x00]);
  const result = buf.readUInt32LE(0) + 5;
  return result === 15;
});

// 与其他方法组合
test('BE: 与 writeUInt32BE 组合', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(0xDEADBEEF, 0);
  return buf.readUInt32BE(0) === 0xDEADBEEF;
});

test('LE: 与 writeUInt32LE 组合', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(0xDEADBEEF, 0);
  return buf.readUInt32LE(0) === 0xDEADBEEF;
});

// 与 slice 组合
test('BE: 与 slice 组合', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x56, 0x78, 0x00]);
  return buf.slice(1, 5).readUInt32BE(0) === 0x12345678;
});

test('LE: 与 slice 组合', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x56, 0x78, 0x00]);
  return buf.slice(1, 5).readUInt32LE(0) === 0x78563412;
});

// 不同实例独立性
test('BE: 不同 Buffer 实例独立', () => {
  const buf1 = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const buf2 = Buffer.from([0x9A, 0xBC, 0xDE, 0xF0]);
  return buf1.readUInt32BE(0) === 0x12345678 && buf2.readUInt32BE(0) === 0x9ABCDEF0;
});

test('LE: 不同 Buffer 实例独立', () => {
  const buf1 = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const buf2 = Buffer.from([0x9A, 0xBC, 0xDE, 0xF0]);
  return buf1.readUInt32LE(0) === 0x78563412 && buf2.readUInt32LE(0) === 0xF0DEBC9A;
});

// 返回值精度
test('BE: 返回值精度正确 (最大值)', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  const val = buf.readUInt32BE(0);
  return val === 4294967295 && val === 0xFFFFFFFF;
});

test('LE: 返回值精度正确 (最大值)', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  const val = buf.readUInt32LE(0);
  return val === 4294967295 && val === 0xFFFFFFFF;
});

// 返回值是整数
test('BE: 返回值是整数', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const val = buf.readUInt32BE(0);
  return Number.isInteger(val);
});

test('LE: 返回值是整数', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const val = buf.readUInt32LE(0);
  return Number.isInteger(val);
});

// 返回值非负
test('BE: 返回值非负', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  const val = buf.readUInt32BE(0);
  return val >= 0;
});

test('LE: 返回值非负', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  const val = buf.readUInt32LE(0);
  return val >= 0;
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
