// 全面矩阵测试 - 关键值和offset组合
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

// === 关键值完整验证 ===

test('所有关键值精确验证 - BE', () => {
  const keyValues = [
    [[0x00, 0x00, 0x00, 0x00], 0],
    [[0x00, 0x00, 0x00, 0x01], 1],
    [[0xFF, 0xFF, 0xFF, 0xFF], -1],
    [[0x7F, 0xFF, 0xFF, 0xFF], 2147483647],
    [[0x80, 0x00, 0x00, 0x00], -2147483648],
    [[0x00, 0x00, 0x00, 0x80], 128],
    [[0x00, 0x00, 0x01, 0x00], 256],
    [[0x00, 0x01, 0x00, 0x00], 65536],
    [[0x01, 0x00, 0x00, 0x00], 16777216],
    [[0x12, 0x34, 0x56, 0x78], 0x12345678],
    [[0xDE, 0xAD, 0xBE, 0xEF], -559038737],
  ];
  
  let pass = true;
  for (const [bytes, expected] of keyValues) {
    const buf = Buffer.from(bytes);
    if (buf.readInt32BE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('所有关键值精确验证 - LE', () => {
  const keyValues = [
    [[0x00, 0x00, 0x00, 0x00], 0],
    [[0x01, 0x00, 0x00, 0x00], 1],
    [[0xFF, 0xFF, 0xFF, 0xFF], -1],
    [[0xFF, 0xFF, 0xFF, 0x7F], 2147483647],
    [[0x00, 0x00, 0x00, 0x80], -2147483648],
    [[0x80, 0x00, 0x00, 0x00], 128],
    [[0x00, 0x01, 0x00, 0x00], 256],
    [[0x00, 0x00, 0x01, 0x00], 65536],
    [[0x00, 0x00, 0x00, 0x01], 16777216],
    [[0x78, 0x56, 0x34, 0x12], 0x12345678],
    [[0xEF, 0xBE, 0xAD, 0xDE], -559038737],
  ];
  
  let pass = true;
  for (const [bytes, expected] of keyValues) {
    const buf = Buffer.from(bytes);
    if (buf.readInt32LE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 所有有效 offset 测试 ===

test('4字节Buffer所有offset测试 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  try {
    buf.readInt32BE(0); // 合法
    buf.readInt32BE(1); // 非法
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('5字节Buffer所有offset测试 - LE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
  let pass = true;
  try {
    buf.readInt32LE(0); // 合法
    buf.readInt32LE(1); // 合法
    buf.readInt32LE(2); // 非法
    pass = false;
  } catch (e) {
    if (e.name !== 'RangeError') pass = false;
  }
  return pass;
});

test('8字节Buffer所有offset测试 - BE', () => {
  const buf = Buffer.alloc(8);
  let pass = true;
  try {
    for (let i = 0; i <= 4; i++) {
      buf.readInt32BE(i); // 0-4 合法
    }
    buf.readInt32BE(5); // 非法
    pass = false;
  } catch (e) {
    if (e.name !== 'RangeError') pass = false;
  }
  return pass;
});

// === 无效offset类型完整测试 ===

test('所有无效offset类型拒绝 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const invalidOffsets = [
    null,
    true,
    false,
    {},
    [],
    'string',
    Symbol('test'),
  ];
  
  let pass = true;
  for (const offset of invalidOffsets) {
    try {
      buf.readInt32BE(offset);
      pass = false;
      break;
    } catch (e) {
      if (e.name !== 'TypeError') {
        pass = false;
        break;
      }
    }
  }
  return pass;
});

test('所有无效offset类型拒绝 - LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const invalidOffsets = [
    null,
    true,
    false,
    {},
    [],
    'string',
    Symbol('test'),
  ];
  
  let pass = true;
  for (const offset of invalidOffsets) {
    try {
      buf.readInt32LE(offset);
      pass = false;
      break;
    } catch (e) {
      if (e.name !== 'TypeError') {
        pass = false;
        break;
      }
    }
  }
  return pass;
});

// === 符号扩展完整验证 ===

test('符号扩展序列 - BE', () => {
  const tests = [
    [[0x7F, 0xFF, 0xFF, 0xFF], 2147483647],   // 最大正数
    [[0x80, 0x00, 0x00, 0x00], -2147483648],  // 最小负数
    [[0xFF, 0xFF, 0xFF, 0xFE], -2],           // -2
    [[0xFF, 0xFF, 0xFF, 0xFF], -1],           // -1
    [[0x00, 0x00, 0x00, 0x00], 0],            // 0
    [[0x00, 0x00, 0x00, 0x01], 1],            // 1
  ];
  
  let pass = true;
  for (const [bytes, expected] of tests) {
    const buf = Buffer.from(bytes);
    if (buf.readInt32BE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 单个位设置模式 ===

test('单个位设置 - 位31 - BE', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00]);
  return buf.readInt32BE(0) === -2147483648;
});

test('单个位设置 - 位0 - LE', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00]);
  return buf.readInt32LE(0) === 1;
});

test('单个位设置 - 位30 - BE', () => {
  const buf = Buffer.from([0x40, 0x00, 0x00, 0x00]);
  return buf.readInt32BE(0) === 1073741824;
});

test('单个位设置 - 位31 - LE', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x80]);
  return buf.readInt32LE(0) === -2147483648;
});

// === 随机采样验证 ===

test('随机采样256组验证 - BE', () => {
  let pass = true;
  for (let i = 0; i < 256; i++) {
    const b0 = (i * 7) % 256;
    const b1 = (i * 13) % 256;
    const b2 = (i * 17) % 256;
    const b3 = (i * 19) % 256;
    
    const buf = Buffer.from([b0, b1, b2, b3]);
    const value = buf.readInt32BE(0);
    
    let expected = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
    if (expected > 2147483647) {
      expected = expected - 4294967296;
    }
    
    if (value !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 读-写-读序列完整性 ===

test('读-写-读序列完整性 - BE', () => {
  const buf = Buffer.alloc(4);
  const values = [-2147483648, -1000, 0, 1000, 2147483647];
  
  let pass = true;
  for (const val of values) {
    buf.writeInt32BE(val, 0);
    if (buf.readInt32BE(0) !== val) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('读-写-读序列完整性 - LE', () => {
  const buf = Buffer.alloc(4);
  const values = [-2147483648, -1000, 0, 1000, 2147483647];
  
  let pass = true;
  for (const val of values) {
    buf.writeInt32LE(val, 0);
    if (buf.readInt32LE(0) !== val) {
      pass = false;
      break;
    }
  }
  return pass;
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
