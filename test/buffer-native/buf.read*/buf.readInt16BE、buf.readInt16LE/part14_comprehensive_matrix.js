// 全面矩阵测试 - 所有可能的边界组合
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

// === 所有16位有符号整数的关键点 ===

const criticalValues = [
  { bytes: [0x00, 0x00], value: 0, name: '零' },
  { bytes: [0x00, 0x01], value: 1, name: '最小正数BE' },
  { bytes: [0x7F, 0xFF], value: 32767, name: '最大正数' },
  { bytes: [0x80, 0x00], value: -32768, name: '最小负数' },
  { bytes: [0xFF, 0xFF], value: -1, name: '最大负数' },
  { bytes: [0x01, 0x00], value: 256, name: '256' },
  { bytes: [0xFF, 0x00], value: -256, name: '-256' },
  { bytes: [0x00, 0xFF], value: 255, name: '255' },
  { bytes: [0xFF, 0x01], value: -255, name: '-255' },
  { bytes: [0x7F, 0xFE], value: 32766, name: '最大-1' },
  { bytes: [0x80, 0x01], value: -32767, name: '最小+1' },
];

test('所有关键值BE精确验证', () => {
  let pass = true;
  for (const cv of criticalValues) {
    const buf = Buffer.from(cv.bytes);
    if (buf.readInt16BE(0) !== cv.value) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('所有关键值LE精确验证', () => {
  let pass = true;
  for (const cv of criticalValues) {
    const reversedBytes = [cv.bytes[1], cv.bytes[0]];
    const buf = Buffer.from(reversedBytes);
    if (buf.readInt16LE(0) !== cv.value) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === offset边界完全测试 ===

test('所有可能的有效offset - BE (2字节)', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readInt16BE(0) === 0x1234;
});

test('所有可能的有效offset - BE (3字节)', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34]);
  return buf.readInt16BE(0) === 0x0012 && buf.readInt16BE(1) === 0x1234;
});

test('所有可能的有效offset - BE (4字节)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readInt16BE(0) === 0x1234 && 
         buf.readInt16BE(1) === 0x3456 && 
         buf.readInt16BE(2) === 0x5678;
});

test('所有可能的有效offset - LE (4字节)', () => {
  const buf = Buffer.from([0x34, 0x12, 0x78, 0x56]);
  return buf.readInt16LE(0) === 0x1234 && 
         buf.readInt16LE(1) === 0x7812 && 
         buf.readInt16LE(2) === 0x5678;
});

// === 无效offset边界完全测试 ===

test('所有无效offset类型 - BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const invalidOffsets = [
    buf.length - 1,
    buf.length,
    buf.length + 1,
    -1,
    -2,
    NaN,
    Infinity,
    -Infinity,
  ];
  
  let allFailed = true;
  for (const offset of invalidOffsets) {
    try {
      buf.readInt16BE(offset);
      allFailed = false;
      break;
    } catch (e) {
      if (e.name !== 'RangeError' && e.name !== 'TypeError') {
        allFailed = false;
        break;
      }
    }
  }
  return allFailed;
});

// === 跨字节边界模式测试 ===

test('低字节溢出到高字节 - BE', () => {
  const testCases = [
    [[0x00, 0xFF], 255],
    [[0x01, 0x00], 256],
    [[0x01, 0xFF], 511],
    [[0x02, 0x00], 512],
  ];
  
  let pass = true;
  for (const [bytes, expected] of testCases) {
    const buf = Buffer.from(bytes);
    if (buf.readInt16BE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('高字节溢出处理 - LE', () => {
  const testCases = [
    [[0xFF, 0x00], 255],
    [[0x00, 0x01], 256],
    [[0xFF, 0x01], 511],
    [[0x00, 0x02], 512],
  ];
  
  let pass = true;
  for (const [bytes, expected] of testCases) {
    const buf = Buffer.from(bytes);
    if (buf.readInt16LE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 符号扩展验证 ===

test('符号扩展从正到负边界 - BE', () => {
  const tests = [
    [[0x7F, 0xFD], 32765],
    [[0x7F, 0xFE], 32766],
    [[0x7F, 0xFF], 32767],
    [[0x80, 0x00], -32768],
    [[0x80, 0x01], -32767],
    [[0x80, 0x02], -32766],
  ];
  
  let pass = true;
  for (const [bytes, expected] of tests) {
    const buf = Buffer.from(bytes);
    if (buf.readInt16BE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('符号扩展从正到负边界 - LE', () => {
  const tests = [
    [[0xFD, 0x7F], 32765],
    [[0xFE, 0x7F], 32766],
    [[0xFF, 0x7F], 32767],
    [[0x00, 0x80], -32768],
    [[0x01, 0x80], -32767],
    [[0x02, 0x80], -32766],
  ];
  
  let pass = true;
  for (const [bytes, expected] of tests) {
    const buf = Buffer.from(bytes);
    if (buf.readInt16LE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 特定位模式测试 ===

test('单个位设置 - 高字节 BE', () => {
  const bits = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80];
  let pass = true;
  
  for (let i = 0; i < bits.length; i++) {
    const buf = Buffer.from([bits[i], 0x00]);
    const result = buf.readInt16BE(0);
    const expected = bits[i] < 0x80 ? (bits[i] << 8) : ((bits[i] << 8) - 0x10000);
    if (result !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('单个位设置 - 低字节 LE', () => {
  const bits = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80];
  let pass = true;
  
  for (let i = 0; i < bits.length; i++) {
    const buf = Buffer.from([bits[i], 0x00]);
    const result = buf.readInt16LE(0);
    const expected = bits[i];
    if (result !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 完整性：所有可能的2字节组合采样 ===

test('随机采样256组2字节组合 - BE', () => {
  let pass = true;
  for (let i = 0; i < 256; i++) {
    const b1 = Math.floor(Math.random() * 256);
    const b2 = Math.floor(Math.random() * 256);
    const buf = Buffer.from([b1, b2]);
    
    const raw = (b1 << 8) | b2;
    const expected = raw >= 0x8000 ? raw - 0x10000 : raw;
    
    if (buf.readInt16BE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('随机采样256组2字节组合 - LE', () => {
  let pass = true;
  for (let i = 0; i < 256; i++) {
    const b1 = Math.floor(Math.random() * 256);
    const b2 = Math.floor(Math.random() * 256);
    const buf = Buffer.from([b1, b2]);
    
    const raw = (b2 << 8) | b1;
    const expected = raw >= 0x8000 ? raw - 0x10000 : raw;
    
    if (buf.readInt16LE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 混合操作顺序测试 ===

test('读-写-读序列 - BE', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0x1234, 0);
  const r1 = buf.readInt16BE(0);
  buf.writeInt16BE(0x5678, 0);
  const r2 = buf.readInt16BE(0);
  return r1 === 0x1234 && r2 === 0x5678;
});

test('读-写-读序列 - LE', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(0x1234, 0);
  const r1 = buf.readInt16LE(0);
  buf.writeInt16LE(0x5678, 0);
  const r2 = buf.readInt16LE(0);
  return r1 === 0x1234 && r2 === 0x5678;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

const result = {
  success: failed === 0,
  summary: { total: tests.length, passed, failed, successRate: ((passed/tests.length)*100).toFixed(2)+'%' },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
