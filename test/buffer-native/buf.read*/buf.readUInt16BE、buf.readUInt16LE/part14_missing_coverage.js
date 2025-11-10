// 查缺补漏测试
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

// 多参数测试
test('BE: 传入多个参数（应只使用第一个）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const result = buf.readUInt16BE(1, 999, 'extra');
  return result === 0x3456;
});

test('LE: 传入多个参数（应只使用第一个）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const result = buf.readUInt16LE(1, 999, 'extra');
  return result === 0x5634;
});

test('BE: 传入 0 个参数（应使用默认值 0）', () => {
  const buf = Buffer.from([0xAB, 0xCD]);
  return buf.readUInt16BE() === 0xABCD;
});

test('LE: 传入 0 个参数（应使用默认值 0）', () => {
  const buf = Buffer.from([0xAB, 0xCD]);
  return buf.readUInt16LE() === 0xCDAB;
});

// 对象转换测试
test('BE: offset 为对象且有 toString 方法', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    const obj = { toString: () => '1' };
    buf.readUInt16BE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset 为对象且有 toString 方法', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    const obj = { toString: () => '1' };
    buf.readUInt16LE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('BE: offset 为对象且有 valueOf 返回非数字', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    const obj = { valueOf: () => 'not a number' };
    buf.readUInt16BE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset 为对象且有 valueOf 返回非数字', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    const obj = { valueOf: () => 'not a number' };
    buf.readUInt16LE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 负零测试
test('BE: offset 为 -0（应等同于 0）', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUInt16BE(-0) === 0xFFFF;
});

test('LE: offset 为 -0（应等同于 0）', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUInt16LE(-0) === 0xFFFF;
});

test('BE: offset 为 -0.0（应等同于 0）', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUInt16BE(-0.0) === 0x1234;
});

test('LE: offset 为 -0.0（应等同于 0）', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUInt16LE(-0.0) === 0x3412;
});

// 与数组索引对比
test('BE: 高低字节与数组索引对比', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const val = buf.readUInt16BE(0);
  const high = buf[0];
  const low = buf[1];
  return val === ((high << 8) | low);
});

test('LE: 高低字节与数组索引对比', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const val = buf.readUInt16LE(0);
  const low = buf[0];
  const high = buf[1];
  return val === (low | (high << 8));
});

// 连续读取模式测试
test('BE: 从头到尾连续读取', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  const expected = [0x1234, 0x3456, 0x5678, 0x789A, 0x9ABC];
  for (let i = 0; i < expected.length; i++) {
    if (buf.readUInt16BE(i) !== expected[i]) return false;
  }
  return true;
});

test('LE: 从头到尾连续读取', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  const expected = [0x3412, 0x5634, 0x7856, 0x9A78, 0xBC9A];
  for (let i = 0; i < expected.length; i++) {
    if (buf.readUInt16LE(i) !== expected[i]) return false;
  }
  return true;
});

test('BE: 从尾到头倒序读取', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const values = [];
  for (let i = 2; i >= 0; i--) {
    values.push(buf.readUInt16BE(i));
  }
  return values[0] === 0x5678 && values[1] === 0x3456 && values[2] === 0x1234;
});

test('LE: 从尾到头倒序读取', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const values = [];
  for (let i = 2; i >= 0; i--) {
    values.push(buf.readUInt16LE(i));
  }
  return values[0] === 0x7856 && values[1] === 0x5634 && values[2] === 0x3412;
});

// offset 精确边界测试
test('BE: offset = buf.length - 2（精确边界）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt16BE(2) === 0x5678;
});

test('LE: offset = buf.length - 2（精确边界）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt16LE(2) === 0x7856;
});

test('BE: offset = buf.length - 2 + 1（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt16BE(3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = buf.length - 2 + 1（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt16LE(3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 特殊数值序列测试
test('BE: 递增序列', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt16BE(i * 100, i * 2);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt16BE(i * 2) !== i * 100) return false;
  }
  return true;
});

test('LE: 递增序列', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt16LE(i * 100, i * 2);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt16LE(i * 2) !== i * 100) return false;
  }
  return true;
});

test('BE: 递减序列', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt16BE(65535 - i * 100, i * 2);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt16BE(i * 2) !== 65535 - i * 100) return false;
  }
  return true;
});

test('LE: 递减序列', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt16LE(65535 - i * 100, i * 2);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt16LE(i * 2) !== 65535 - i * 100) return false;
  }
  return true;
});

// 重复值测试
test('BE: 重复值读取', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0xAB);
  return buf.readUInt16BE(0) === 0xABAB &&
         buf.readUInt16BE(2) === 0xABAB &&
         buf.readUInt16BE(4) === 0xABAB;
});

test('LE: 重复值读取', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0xAB);
  return buf.readUInt16LE(0) === 0xABAB &&
         buf.readUInt16LE(2) === 0xABAB &&
         buf.readUInt16LE(4) === 0xABAB;
});

// 性能测试（同位置读取多次）
test('BE: 同位置读取 1000 次', () => {
  const buf = Buffer.from([0x12, 0x34]);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt16BE(0) !== 0x1234) return false;
  }
  return true;
});

test('LE: 同位置读取 1000 次', () => {
  const buf = Buffer.from([0x12, 0x34]);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt16LE(0) !== 0x3412) return false;
  }
  return true;
});

// 整数边界值
test('BE: 整数最大安全值附近', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(65535, 0);
  return buf.readUInt16BE(0) === 65535;
});

test('LE: 整数最大安全值附近', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(65535, 0);
  return buf.readUInt16LE(0) === 65535;
});

// offset 为整数边界
test('BE: offset 为 Number.MAX_SAFE_INTEGER（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16BE(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset 为 Number.MAX_SAFE_INTEGER（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readUInt16LE(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
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
