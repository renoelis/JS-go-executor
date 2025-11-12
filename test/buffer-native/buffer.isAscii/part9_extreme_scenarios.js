// buffer.isAscii() - Part 9: Extreme Scenarios and Final Gap Coverage
const { Buffer, isAscii } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 极端位置的非 ASCII 字节
test('仅第 1 个字节非 ASCII - 1000 字节 Buffer', () => {
  const buf = Buffer.alloc(1000, 0x41);
  buf[0] = 0x80;
  return isAscii(buf) === false;
});

test('仅第 500 个字节非 ASCII - 1000 字节 Buffer', () => {
  const buf = Buffer.alloc(1000, 0x41);
  buf[499] = 0x80;
  return isAscii(buf) === false;
});

test('仅最后一个字节非 ASCII - 1000 字节 Buffer', () => {
  const buf = Buffer.alloc(1000, 0x41);
  buf[999] = 0x80;
  return isAscii(buf) === false;
});

test('第 2 和倒数第 2 个字节非 ASCII', () => {
  const buf = Buffer.alloc(1000, 0x41);
  buf[1] = 0x80;
  buf[998] = 0xFF;
  return isAscii(buf) === false;
});

// 所有非 ASCII 值遍历
test('测试所有非 ASCII 值 0x80-0xFF', () => {
  for (let i = 0x80; i <= 0xFF; i++) {
    const buf = Buffer.from([i]);
    if (isAscii(buf) !== false) {
      return false;
    }
  }
  return true;
});

test('测试所有 ASCII 值 0x00-0x7F', () => {
  for (let i = 0x00; i <= 0x7F; i++) {
    const buf = Buffer.from([i]);
    if (isAscii(buf) !== true) {
      return false;
    }
  }
  return true;
});

// ASCII 边界精确测试
test('0x7E (126) - ASCII 最大可打印', () => {
  const buf = Buffer.from([0x7E]);
  return isAscii(buf) === true;
});

test('0x7F (127) - DEL 控制字符', () => {
  const buf = Buffer.from([0x7F]);
  return isAscii(buf) === true;
});

test('0x80 (128) - 非 ASCII 最小值', () => {
  const buf = Buffer.from([0x80]);
  return isAscii(buf) === false;
});

test('0x7F 和 0x80 相邻', () => {
  const buf = Buffer.from([0x7F, 0x80]);
  return isAscii(buf) === false;
});

// 每个位的测试
test('测试位模式 - 0b01111111 (0x7F)', () => {
  const buf = Buffer.from([0b01111111]);
  return isAscii(buf) === true;
});

test('测试位模式 - 0b10000000 (0x80)', () => {
  const buf = Buffer.from([0b10000000]);
  return isAscii(buf) === false;
});

test('测试位模式 - 0b11111111 (0xFF)', () => {
  const buf = Buffer.from([0b11111111]);
  return isAscii(buf) === false;
});

test('测试位模式 - 0b10101010 (0xAA)', () => {
  const buf = Buffer.from([0b10101010]);
  return isAscii(buf) === false;
});

test('测试位模式 - 0b01010101 (0x55)', () => {
  const buf = Buffer.from([0b01010101]);
  return isAscii(buf) === true;
});

// 混合 TypedArray 边界
test('Int8Array - 127 (最大正值)', () => {
  const arr = new Int8Array([127]);
  return isAscii(arr) === true;
});

test('Int8Array - -128 (最小负值)', () => {
  const arr = new Int8Array([-128]);
  return isAscii(arr) === false;
});

test('Int8Array - -1', () => {
  const arr = new Int8Array([-1]);
  return isAscii(arr) === false;
});

// UTF-16 代理对边界
test('UTF-16 高代理 - 0xD800', () => {
  const buf = Buffer.from([0xD8, 0x00]);
  return isAscii(buf) === false;
});

test('UTF-16 低代理 - 0xDC00', () => {
  const buf = Buffer.from([0xDC, 0x00]);
  return isAscii(buf) === false;
});

// Unicode 特殊字符原始字节
test('Emoji 笑脸原始字节 - 0xF0 0x9F 0x98 0x80', () => {
  const buf = Buffer.from([0xF0, 0x9F, 0x98, 0x80]);
  return isAscii(buf) === false;
});

test('中文"中"原始字节 - 0xE4 0xB8 0xAD', () => {
  const buf = Buffer.from([0xE4, 0xB8, 0xAD]);
  return isAscii(buf) === false;
});

// 内存模式测试
test('交替 0x00 和 0x7F - 100 字节', () => {
  const arr = [];
  for (let i = 0; i < 100; i++) {
    arr.push(i % 2 === 0 ? 0x00 : 0x7F);
  }
  const buf = Buffer.from(arr);
  return isAscii(buf) === true;
});

test('交替 0x00 和 0x80 - 100 字节', () => {
  const arr = [];
  for (let i = 0; i < 100; i++) {
    arr.push(i % 2 === 0 ? 0x00 : 0x80);
  }
  const buf = Buffer.from(arr);
  return isAscii(buf) === false;
});

test('递增序列 0x00-0x7F', () => {
  const arr = [];
  for (let i = 0; i <= 0x7F; i++) {
    arr.push(i);
  }
  const buf = Buffer.from(arr);
  return isAscii(buf) === true;
});

test('递增序列 0x00-0x80', () => {
  const arr = [];
  for (let i = 0; i <= 0x80; i++) {
    arr.push(i);
  }
  const buf = Buffer.from(arr);
  return isAscii(buf) === false;
});

// 对齐和未对齐组合
test('9 字节 ASCII (未对齐)', () => {
  const buf = Buffer.alloc(9, 0x41);
  return isAscii(buf) === true;
});

test('17 字节 ASCII (未对齐)', () => {
  const buf = Buffer.alloc(17, 0x41);
  return isAscii(buf) === true;
});

test('31 字节 ASCII (未对齐)', () => {
  const buf = Buffer.alloc(31, 0x41);
  return isAscii(buf) === true;
});

test('63 字节 ASCII (未对齐)', () => {
  const buf = Buffer.alloc(63, 0x41);
  return isAscii(buf) === true;
});

test('127 字节 ASCII (未对齐)', () => {
  const buf = Buffer.alloc(127, 0x41);
  return isAscii(buf) === true;
});

// 极端 slice 场景
test('slice 从末尾开始 - 空 slice', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(5);
  return isAscii(slice) === true;
});

test('slice 超出范围 - 自动截断', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(0, 100);
  return isAscii(slice) === true;
});

test('slice 负索引到负索引', () => {
  const buf = Buffer.from('hello world');
  const slice = buf.slice(-5, -1); // 'worl'
  return isAscii(slice) === true;
});

// 多次修改和检查
test('循环修改检查 - ASCII 到非 ASCII 到 ASCII', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  if (isAscii(buf) !== true) return false;

  buf[1] = 0x80;
  if (isAscii(buf) !== false) return false;

  buf[1] = 0x42;
  if (isAscii(buf) !== true) return false;

  buf[0] = 0xFF;
  if (isAscii(buf) !== false) return false;

  buf[0] = 0x41;
  return isAscii(buf) === true;
});

// 空 Buffer 各种创建方式
test('Buffer.alloc(0) - 空', () => {
  const buf = Buffer.alloc(0);
  return isAscii(buf) === true;
});

test('Buffer.allocUnsafe(0) - 空', () => {
  const buf = Buffer.allocUnsafe(0);
  return isAscii(buf) === true;
});

test('Buffer.from([]) - 空', () => {
  const buf = Buffer.from([]);
  return isAscii(buf) === true;
});

test('Buffer.from("") - 空字符串', () => {
  const buf = Buffer.from('');
  return isAscii(buf) === true;
});

test('Buffer.concat([]) - 空数组', () => {
  const buf = Buffer.concat([]);
  return isAscii(buf) === true;
});

test('new Uint8Array(0) - 空', () => {
  const arr = new Uint8Array(0);
  return isAscii(arr) === true;
});

test('new ArrayBuffer(0) - 空', () => {
  const ab = new ArrayBuffer(0);
  return isAscii(ab) === true;
});

// 特殊编码组合
test('Base64url 编码测试', () => {
  if (Buffer.from('test', 'base64url')) {
    const buf = Buffer.from('SGVsbG8', 'base64url');
    return isAscii(buf) === true;
  }
  return true; // 跳过
});

// 字节频率测试
test('重复单个 ASCII 字符 - 10000 次', () => {
  const buf = Buffer.alloc(10000, 0x41);
  return isAscii(buf) === true;
});

test('重复单个非 ASCII 字符 - 10000 次', () => {
  const buf = Buffer.alloc(10000, 0x80);
  return isAscii(buf) === false;
});

// ArrayBuffer 部分视图
test('ArrayBuffer 中间部分 - ASCII', () => {
  const ab = new ArrayBuffer(20);
  const full = new Uint8Array(ab);
  full.fill(0x80); // 全部填充非 ASCII
  full[10] = 0x41; // 'A'
  full[11] = 0x42; // 'B'
  full[12] = 0x43; // 'C'
  const partial = new Uint8Array(ab, 10, 3);
  return isAscii(partial) === true;
});

test('ArrayBuffer 中间部分 - 非 ASCII', () => {
  const ab = new ArrayBuffer(20);
  const full = new Uint8Array(ab);
  full.fill(0x41); // 全部填充 ASCII
  full[10] = 0x80;
  full[11] = 0xFF;
  const partial = new Uint8Array(ab, 10, 2);
  return isAscii(partial) === false;
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
