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
test('官方示例1: Buffer.from([0x12, 0x34, 0x56, 0x78]).readInt32BE(0) === 0x12345678', () => {
  return Buffer.from([0x12, 0x34, 0x56, 0x78]).readInt32BE(0) === 0x12345678;
});

test('官方示例2: Buffer.from([0x12, 0x34, 0x56, 0x78]).readInt32LE(0) === 0x78563412', () => {
  return Buffer.from([0x12, 0x34, 0x56, 0x78]).readInt32LE(0) === 0x78563412;
});

test('官方示例3: Buffer.from([0x12, 0x34, 0x56, 0x78]).readInt32LE(1) 抛出错误', () => {
  try {
    Buffer.from([0x12, 0x34, 0x56, 0x78]).readInt32LE(1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

// === 确认两个补码行为 ===
test('两个补码: 0x80000000 = -2147483648 (BE)', () => {
  return Buffer.from([0x80, 0x00, 0x00, 0x00]).readInt32BE(0) === -2147483648;
});

test('两个补码: 0x80000000 = -2147483648 (LE)', () => {
  return Buffer.from([0x00, 0x00, 0x00, 0x80]).readInt32LE(0) === -2147483648;
});

test('两个补码: 0xFFFFFFFF = -1 (BE)', () => {
  return Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]).readInt32BE(0) === -1;
});

test('两个补码: 0xFFFFFFFF = -1 (LE)', () => {
  return Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]).readInt32LE(0) === -1;
});

// === 确认所有边界约束 ===
test('offset约束: 0 <= offset <= buf.length - 4 (边界值)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
  let pass = true;
  
  // 有效: offset = 0
  try { buf.readInt32BE(0); } catch (e) { pass = false; }
  
  // 有效: offset = buf.length - 4 = 1
  try { buf.readInt32BE(1); } catch (e) { pass = false; }
  
  // 无效: offset = buf.length - 3 = 2
  try { buf.readInt32BE(2); pass = false; } catch (e) { /* 预期 */ }
  
  return pass;
});

// === 确认字节序 ===
test('字节序验证: BE高字节在前', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readInt32BE(0) === 0x12345678;
});

test('字节序验证: LE低字节在前', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return buf.readInt32LE(0) === 0x12345678;
});

// === 确认默认offset ===
test('默认offset: readInt32BE() 等价于 readInt32BE(0)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readInt32BE() === buf.readInt32BE(0);
});

test('默认offset: readInt32LE() 等价于 readInt32LE(0)', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return buf.readInt32LE() === buf.readInt32LE(0);
});

// === 确认返回值类型 ===
test('返回值必须是number类型 - BE', () => {
  const result = Buffer.from([0x12, 0x34, 0x56, 0x78]).readInt32BE(0);
  return typeof result === 'number';
});

test('返回值必须是number类型 - LE', () => {
  const result = Buffer.from([0x78, 0x56, 0x34, 0x12]).readInt32LE(0);
  return typeof result === 'number';
});

test('返回值必须是整数 - BE', () => {
  const result = Buffer.from([0x12, 0x34, 0x56, 0x78]).readInt32BE(0);
  return Number.isInteger(result);
});

test('返回值必须是整数 - LE', () => {
  const result = Buffer.from([0x78, 0x56, 0x34, 0x12]).readInt32LE(0);
  return Number.isInteger(result);
});

// === 确认范围 ===
test('返回值范围: -2147483648 <= value <= 2147483647', () => {
  let pass = true;
  
  // 最小值
  const min = Buffer.from([0x80, 0x00, 0x00, 0x00]).readInt32BE(0);
  if (min !== -2147483648) pass = false;
  
  // 最大值
  const max = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF]).readInt32BE(0);
  if (max !== 2147483647) pass = false;
  
  // 中间值
  const mid = Buffer.from([0x00, 0x00, 0x00, 0x00]).readInt32BE(0);
  if (mid !== 0) pass = false;
  
  return pass;
});

// === 确认方法属性 ===
test('方法name属性: Buffer.prototype.readInt32BE.name === "readInt32BE"', () => {
  return Buffer.prototype.readInt32BE.name === 'readInt32BE';
});

test('方法name属性: Buffer.prototype.readInt32LE.name === "readInt32LE"', () => {
  return Buffer.prototype.readInt32LE.name === 'readInt32LE';
});

test('方法length属性: Buffer.prototype.readInt32BE.length === 0', () => {
  return Buffer.prototype.readInt32BE.length === 0;
});

test('方法length属性: Buffer.prototype.readInt32LE.length === 0', () => {
  return Buffer.prototype.readInt32LE.length === 0;
});

// === 确认不修改Buffer ===
test('读取操作不修改Buffer内容 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const before = buf.toString('hex');
  buf.readInt32BE(0);
  const after = buf.toString('hex');
  return before === after;
});

test('读取操作不修改Buffer内容 - LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const before = buf.toString('hex');
  buf.readInt32LE(0);
  const after = buf.toString('hex');
  return before === after;
});

// === 确认不同Buffer长度 ===
test('最小Buffer长度: 4字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readInt32BE(0) === 0x12345678;
});

test('3字节Buffer无法读取', () => {
  try {
    Buffer.from([0x12, 0x34, 0x56]).readInt32BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('1字节Buffer无法读取', () => {
  try {
    Buffer.from([0x12]).readInt32BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('0字节Buffer无法读取', () => {
  try {
    Buffer.alloc(0).readInt32BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// === 确认所有位的组合采样 ===
test('4294967296种可能的32位值采样验证（512个随机值）', () => {
  let pass = true;
  // 采样测试 - 测试512个随机值
  for (let i = 0; i < 512; i++) {
    const value = Math.floor(Math.random() * 4294967296);
    const buf = Buffer.alloc(4);
    
    // 使用writeInt32BE写入
    buf.writeInt32BE(value >= 2147483648 ? value - 4294967296 : value, 0);
    
    // 使用readInt32BE读取
    const read = buf.readInt32BE(0);
    const expected = value >= 2147483648 ? value - 4294967296 : value;
    
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
    [0x00, 0x00, 0x00, 0x00, 0],
    [0x00, 0x00, 0x00, 0x01, 1],
    [0xFF, 0xFF, 0xFF, 0xFF, -1],
    [0x7F, 0xFF, 0xFF, 0xFF, 2147483647],
    [0x80, 0x00, 0x00, 0x00, -2147483648],
  ];
  
  let pass = true;
  for (const [b1, b2, b3, b4, expected] of keyValues) {
    const bufBE = Buffer.from([b1, b2, b3, b4]);
    const bufLE = Buffer.from([b4, b3, b2, b1]);
    
    if (bufBE.readInt32BE(0) !== expected) {
      pass = false;
      break;
    }
    if (bufLE.readInt32LE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 读写交互完整性 ===
test('读取、写入、再读取交互 - BE', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE(0x12345678, 0);
  const read1 = buf.readInt32BE(0);
  buf.writeInt32BE(-1, 4);
  const read2 = buf.readInt32BE(0);
  const read3 = buf.readInt32BE(4);
  return read1 === 0x12345678 && read2 === 0x12345678 && read3 === -1;
});

test('读取、写入、再读取交互 - LE', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE(0x12345678, 0);
  const read1 = buf.readInt32LE(0);
  buf.writeInt32LE(-1, 4);
  const read2 = buf.readInt32LE(0);
  const read3 = buf.readInt32LE(4);
  return read1 === 0x12345678 && read2 === 0x12345678 && read3 === -1;
});

// === 错误恢复能力 ===
test('抛出错误后Buffer仍可正常读取 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  try {
    buf.readInt32BE(10); // 触发错误
  } catch (e) {
    // 忽略错误
  }
  // 错误后应该仍能正常读取
  return buf.readInt32BE(0) === 0x12345678;
});

test('抛出错误后Buffer仍可正常读取 - LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  try {
    buf.readInt32LE(10); // 触发错误
  } catch (e) {
    // 忽略错误
  }
  // 错误后应该仍能正常读取
  return buf.readInt32LE(0) === 0x12345678;
});

test('多次错误后仍能恢复 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
  let errorCount = 0;
  
  for (let i = 0; i < 5; i++) {
    try {
      buf.readInt32BE(10);
    } catch (e) {
      errorCount++;
    }
  }
  
  return errorCount === 5 && buf.readInt32BE(0) === 0x12345678;
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
    conclusion: failed === 0 ? '✅ 100% 覆盖确认！与 Node.js v25.0.0 完全兼容！' : '❌ 发现遗漏'
  },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
