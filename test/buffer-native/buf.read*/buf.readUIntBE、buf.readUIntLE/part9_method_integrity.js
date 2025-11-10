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

// === 方法存在性测试 ===

test('BE: readUIntBE 方法存在', () => {
  const buf = Buffer.alloc(6);
  return typeof buf.readUIntBE === 'function';
});

test('LE: readUIntLE 方法存在', () => {
  const buf = Buffer.alloc(6);
  return typeof buf.readUIntLE === 'function';
});

// === 方法不可枚举 ===

test('BE: readUIntBE 不可枚举', () => {
  const buf = Buffer.alloc(6);
  return !Object.keys(buf).includes('readUIntBE');
});

test('LE: readUIntLE 不可枚举', () => {
  const buf = Buffer.alloc(6);
  return !Object.keys(buf).includes('readUIntLE');
});

// === 方法在原型链上 ===

test('BE: readUIntBE 在原型链上', () => {
  const buf = Buffer.alloc(6);
  return buf.hasOwnProperty('readUIntBE') === false;
});

test('LE: readUIntLE 在原型链上', () => {
  const buf = Buffer.alloc(6);
  return buf.hasOwnProperty('readUIntLE') === false;
});

// === 方法名称 ===

test('BE: readUIntBE 方法名称正确', () => {
  const buf = Buffer.alloc(6);
  return buf.readUIntBE.name === 'readUIntBE';
});

test('LE: readUIntLE 方法名称正确', () => {
  const buf = Buffer.alloc(6);
  return buf.readUIntLE.name === 'readUIntLE';
});

// === 方法长度（参数个数）===

test('BE: readUIntBE 参数个数', () => {
  const buf = Buffer.alloc(6);
  return buf.readUIntBE.length === 2;
});

test('LE: readUIntLE 参数个数', () => {
  const buf = Buffer.alloc(6);
  return buf.readUIntLE.length === 2;
});

// === this 绑定测试 ===

test('BE: 方法调用需要正确的 this', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    const fn = buf.readUIntBE;
    fn.call(buf, 0, 2);
    return true;
  } catch (e) {
    return false;
  }
});

test('LE: 方法调用需要正确的 this', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    const fn = buf.readUIntLE;
    fn.call(buf, 0, 2);
    return true;
  } catch (e) {
    return false;
  }
});

// === 返回值类型 ===

test('BE: 返回值是数字', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const result = buf.readUIntBE(0, 2);
  return typeof result === 'number';
});

test('LE: 返回值是数字', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const result = buf.readUIntLE(0, 2);
  return typeof result === 'number';
});

test('BE: 返回值不是 NaN', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const result = buf.readUIntBE(0, 2);
  return !isNaN(result);
});

test('LE: 返回值不是 NaN', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const result = buf.readUIntLE(0, 2);
  return !isNaN(result);
});

test('BE: 返回值是有限数', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const result = buf.readUIntBE(0, 2);
  return isFinite(result);
});

test('LE: 返回值是有限数', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const result = buf.readUIntLE(0, 2);
  return isFinite(result);
});

// === 读取不修改 Buffer ===

test('BE: 读取不修改 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const before = Buffer.from(buf);
  buf.readUIntBE(0, 2);
  return buf.equals(before);
});

test('LE: 读取不修改 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const before = Buffer.from(buf);
  buf.readUIntLE(0, 2);
  return buf.equals(before);
});

// === 多次读取一致性 ===

test('BE: 多次读取返回相同值', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const r1 = buf.readUIntBE(0, 2);
  const r2 = buf.readUIntBE(0, 2);
  const r3 = buf.readUIntBE(0, 2);
  return r1 === r2 && r2 === r3;
});

test('LE: 多次读取返回相同值', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const r1 = buf.readUIntLE(0, 2);
  const r2 = buf.readUIntLE(0, 2);
  const r3 = buf.readUIntLE(0, 2);
  return r1 === r2 && r2 === r3;
});

// === 不同 Buffer 实例独立 ===

test('BE: 不同 Buffer 实例独立', () => {
  const buf1 = Buffer.from([0x12, 0x34]);
  const buf2 = Buffer.from([0x56, 0x78]);
  return buf1.readUIntBE(0, 2) !== buf2.readUIntBE(0, 2);
});

test('LE: 不同 Buffer 实例独立', () => {
  const buf1 = Buffer.from([0x12, 0x34]);
  const buf2 = Buffer.from([0x56, 0x78]);
  return buf1.readUIntLE(0, 2) !== buf2.readUIntLE(0, 2);
});

// === 参数顺序敏感 ===

test('BE: 参数顺序敏感', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const r1 = buf.readUIntBE(0, 2);
  const r2 = buf.readUIntBE(1, 2);
  return r1 !== r2;
});

test('LE: 参数顺序敏感', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const r1 = buf.readUIntLE(0, 2);
  const r2 = buf.readUIntLE(1, 2);
  return r1 !== r2;
});

// === byteLength 参数敏感 ===

test('BE: byteLength 参数敏感', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF]);
  const r1 = buf.readUIntBE(0, 1);
  const r2 = buf.readUIntBE(0, 2);
  const r3 = buf.readUIntBE(0, 3);
  return r1 !== r2 && r2 !== r3;
});

test('LE: byteLength 参数敏感', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF]);
  const r1 = buf.readUIntLE(0, 1);
  const r2 = buf.readUIntLE(0, 2);
  const r3 = buf.readUIntLE(0, 3);
  return r1 !== r2 && r2 !== r3;
});

// === 与 Buffer 长度无关（在边界内）===

test('BE: 读取与 Buffer 总长度无关', () => {
  const buf1 = Buffer.from([0x12, 0x34, 0x00, 0x00]);
  const buf2 = Buffer.from([0x12, 0x34, 0x00, 0x00, 0x00, 0x00]);
  return buf1.readUIntBE(0, 2) === buf2.readUIntBE(0, 2);
});

test('LE: 读取与 Buffer 总长度无关', () => {
  const buf1 = Buffer.from([0x12, 0x34, 0x00, 0x00]);
  const buf2 = Buffer.from([0x12, 0x34, 0x00, 0x00, 0x00, 0x00]);
  return buf1.readUIntLE(0, 2) === buf2.readUIntLE(0, 2);
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
