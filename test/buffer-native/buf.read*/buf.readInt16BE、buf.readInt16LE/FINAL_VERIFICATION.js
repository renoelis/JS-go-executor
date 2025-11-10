// 最终验证 - 确保100%覆盖
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

// === 确认官方文档所有示例 ===
test('官方示例1: Buffer.from([0, 5]).readInt16BE(0) === 5', () => {
  return Buffer.from([0, 5]).readInt16BE(0) === 5;
});

test('官方示例2: Buffer.from([0, 5]).readInt16LE(0) === 1280', () => {
  return Buffer.from([0, 5]).readInt16LE(0) === 1280;
});

test('官方示例3: Buffer.from([0, 5]).readInt16LE(1) 抛出错误', () => {
  try {
    Buffer.from([0, 5]).readInt16LE(1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

// === 确认两个补码行为 ===
test('两个补码: 0x8000 = -32768 (BE)', () => {
  return Buffer.from([0x80, 0x00]).readInt16BE(0) === -32768;
});

test('两个补码: 0x8000 = -32768 (LE)', () => {
  return Buffer.from([0x00, 0x80]).readInt16LE(0) === -32768;
});

test('两个补码: 0xFFFF = -1 (BE)', () => {
  return Buffer.from([0xFF, 0xFF]).readInt16BE(0) === -1;
});

test('两个补码: 0xFFFF = -1 (LE)', () => {
  return Buffer.from([0xFF, 0xFF]).readInt16LE(0) === -1;
});

// === 确认所有边界约束 ===
test('offset约束: 0 <= offset <= buf.length - 2 (边界值)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  let pass = true;
  
  // 有效: offset = 0
  try { buf.readInt16BE(0); } catch (e) { pass = false; }
  
  // 有效: offset = buf.length - 2 = 1
  try { buf.readInt16BE(1); } catch (e) { pass = false; }
  
  // 无效: offset = buf.length - 1 = 2
  try { buf.readInt16BE(2); pass = false; } catch (e) { /* 预期 */ }
  
  return pass;
});

// === 确认字节序 ===
test('字节序验证: BE高字节在前', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readInt16BE(0) === 0x1234; // (0x12 << 8) | 0x34
});

test('字节序验证: LE低字节在前', () => {
  const buf = Buffer.from([0x34, 0x12]);
  return buf.readInt16LE(0) === 0x1234; // (0x12 << 8) | 0x34
});

// === 确认默认offset ===
test('默认offset: readInt16BE() 等价于 readInt16BE(0)', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readInt16BE() === buf.readInt16BE(0);
});

test('默认offset: readInt16LE() 等价于 readInt16LE(0)', () => {
  const buf = Buffer.from([0x34, 0x12]);
  return buf.readInt16LE() === buf.readInt16LE(0);
});

// === 确认返回值类型 ===
test('返回值必须是number类型 - BE', () => {
  const result = Buffer.from([0x12, 0x34]).readInt16BE(0);
  return typeof result === 'number';
});

test('返回值必须是number类型 - LE', () => {
  const result = Buffer.from([0x34, 0x12]).readInt16LE(0);
  return typeof result === 'number';
});

test('返回值必须是整数 - BE', () => {
  const result = Buffer.from([0x12, 0x34]).readInt16BE(0);
  return Number.isInteger(result);
});

test('返回值必须是整数 - LE', () => {
  const result = Buffer.from([0x34, 0x12]).readInt16LE(0);
  return Number.isInteger(result);
});

// === 确认范围 ===
test('返回值范围: -32768 <= value <= 32767', () => {
  let pass = true;
  
  // 最小值
  const min = Buffer.from([0x80, 0x00]).readInt16BE(0);
  if (min !== -32768) pass = false;
  
  // 最大值
  const max = Buffer.from([0x7F, 0xFF]).readInt16BE(0);
  if (max !== 32767) pass = false;
  
  // 中间值
  const mid = Buffer.from([0x00, 0x00]).readInt16BE(0);
  if (mid !== 0) pass = false;
  
  return pass;
});

// === 确认方法属性 ===
test('方法name属性: Buffer.prototype.readInt16BE.name === "readInt16BE"', () => {
  return Buffer.prototype.readInt16BE.name === 'readInt16BE';
});

test('方法name属性: Buffer.prototype.readInt16LE.name === "readInt16LE"', () => {
  return Buffer.prototype.readInt16LE.name === 'readInt16LE';
});

test('方法length属性: Buffer.prototype.readInt16BE.length === 0', () => {
  return Buffer.prototype.readInt16BE.length === 0;
});

test('方法length属性: Buffer.prototype.readInt16LE.length === 0', () => {
  return Buffer.prototype.readInt16LE.length === 0;
});

// === 确认不修改Buffer ===
test('读取操作不修改Buffer内容 - BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const before = buf.toString('hex');
  buf.readInt16BE(0);
  const after = buf.toString('hex');
  return before === after;
});

test('读取操作不修改Buffer内容 - LE', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const before = buf.toString('hex');
  buf.readInt16LE(0);
  const after = buf.toString('hex');
  return before === after;
});

// === 确认不同Buffer长度 ===
test('最小Buffer长度: 2字节', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readInt16BE(0) === 0x1234;
});

test('1字节Buffer无法读取', () => {
  try {
    Buffer.from([0x12]).readInt16BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('0字节Buffer无法读取', () => {
  try {
    Buffer.alloc(0).readInt16BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// === 确认所有位的组合 ===
test('所有65536种可能的16位值采样验证', () => {
  let pass = true;
  // 采样测试 - 测试256个随机值
  for (let i = 0; i < 256; i++) {
    const value = Math.floor(Math.random() * 65536);
    const buf = Buffer.alloc(2);
    
    // 使用writeInt16BE写入
    buf.writeInt16BE(value >= 32768 ? value - 65536 : value, 0);
    
    // 使用readInt16BE读取
    const read = buf.readInt16BE(0);
    const expected = value >= 32768 ? value - 65536 : value;
    
    if (read !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 验证与Node.js完全一致性 ===
test('完整一致性验证: 关键值矩阵', () => {
  const keyValues = [
    [0x00, 0x00, 0],
    [0x00, 0x01, 1],
    [0xFF, 0xFF, -1],
    [0x7F, 0xFF, 32767],
    [0x80, 0x00, -32768],
  ];
  
  let pass = true;
  for (const [b1, b2, expected] of keyValues) {
    const bufBE = Buffer.from([b1, b2]);
    const bufLE = Buffer.from([b2, b1]);
    
    if (bufBE.readInt16BE(0) !== expected) {
      pass = false;
      break;
    }
    if (bufLE.readInt16LE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

const result = {
  success: failed === 0,
  summary: { 
    total: tests.length, 
    passed, 
    failed, 
    successRate: ((passed/tests.length)*100).toFixed(2)+'%',
    conclusion: failed === 0 ? '✅ 100% 覆盖确认！' : '❌ 发现遗漏'
  },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
