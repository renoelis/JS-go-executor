// buffer.isAscii() - Part 6: Buffer Creation Methods Tests
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

// Buffer.alloc 测试
test('Buffer.alloc - 默认零填充', () => {
  const buf = Buffer.alloc(10);
  return isAscii(buf) === true;
});

test('Buffer.alloc - 指定 ASCII 填充值', () => {
  const buf = Buffer.alloc(10, 0x41); // 'A'
  return isAscii(buf) === true;
});

test('Buffer.alloc - 指定非 ASCII 填充值', () => {
  const buf = Buffer.alloc(10, 0x80);
  return isAscii(buf) === false;
});

test('Buffer.alloc - 字符串填充 ASCII', () => {
  const buf = Buffer.alloc(10, 'a');
  return isAscii(buf) === true;
});

test('Buffer.alloc - 字符串填充非 ASCII', () => {
  const buf = Buffer.alloc(10, '中');
  return isAscii(buf) === false;
});

test('Buffer.alloc - 长度为 0', () => {
  const buf = Buffer.alloc(0);
  return isAscii(buf) === true;
});

// Buffer.allocUnsafe 测试
test('Buffer.allocUnsafe - 未初始化内存可能包含任何值', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0x41); // 手动填充 ASCII
  return isAscii(buf) === true;
});

test('Buffer.allocUnsafe - 填充非 ASCII', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0x80);
  return isAscii(buf) === false;
});

test('Buffer.allocUnsafe - 长度为 0', () => {
  const buf = Buffer.allocUnsafe(0);
  return isAscii(buf) === true;
});

// Buffer.allocUnsafeSlow 测试
test('Buffer.allocUnsafeSlow - ASCII 填充', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0x48); // 'H'
  return isAscii(buf) === true;
});

test('Buffer.allocUnsafeSlow - 非 ASCII 填充', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0xFF);
  return isAscii(buf) === false;
});

test('Buffer.allocUnsafeSlow - 长度为 0', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return isAscii(buf) === true;
});

// Buffer.from 字符串测试
test('Buffer.from - ASCII 字符串 utf8', () => {
  const buf = Buffer.from('hello', 'utf8');
  return isAscii(buf) === true;
});

test('Buffer.from - ASCII 字符串 ascii', () => {
  const buf = Buffer.from('hello', 'ascii');
  return isAscii(buf) === true;
});

test('Buffer.from - ASCII 字符串 latin1', () => {
  const buf = Buffer.from('hello', 'latin1');
  return isAscii(buf) === true;
});

test('Buffer.from - 非 ASCII 字符串 utf8', () => {
  const buf = Buffer.from('你好', 'utf8');
  return isAscii(buf) === false;
});

test('Buffer.from - 扩展 ASCII latin1', () => {
  const buf = Buffer.from('\x80\xFF', 'latin1');
  return isAscii(buf) === false;
});

test('Buffer.from - hex 编码 ASCII', () => {
  const buf = Buffer.from('48656c6c6f', 'hex'); // 'Hello'
  return isAscii(buf) === true;
});

test('Buffer.from - hex 编码非 ASCII', () => {
  const buf = Buffer.from('48ff', 'hex');
  return isAscii(buf) === false;
});

test('Buffer.from - base64 编码 ASCII', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64'); // 'Hello'
  return isAscii(buf) === true;
});

test('Buffer.from - base64 编码非 ASCII', () => {
  const buf = Buffer.from('5L2g5aW9', 'base64'); // '你好'
  return isAscii(buf) === false;
});

// Buffer.from 数组测试
test('Buffer.from - 数组 ASCII', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  return isAscii(buf) === true;
});

test('Buffer.from - 数组非 ASCII', () => {
  const buf = Buffer.from([0x48, 0x80, 0xFF]);
  return isAscii(buf) === false;
});

test('Buffer.from - 空数组', () => {
  const buf = Buffer.from([]);
  return isAscii(buf) === true;
});

test('Buffer.from - 数组单个元素 ASCII', () => {
  const buf = Buffer.from([0x41]);
  return isAscii(buf) === true;
});

test('Buffer.from - 数组单个元素非 ASCII', () => {
  const buf = Buffer.from([0x80]);
  return isAscii(buf) === false;
});

// Buffer.from Buffer 测试
test('Buffer.from - 复制 Buffer ASCII', () => {
  const original = Buffer.from('hello');
  const copy = Buffer.from(original);
  return isAscii(copy) === true;
});

test('Buffer.from - 复制 Buffer 非 ASCII', () => {
  const original = Buffer.from([0x48, 0x80]);
  const copy = Buffer.from(original);
  return isAscii(copy) === false;
});

test('Buffer.from - 复制后修改不影响原始', () => {
  const original = Buffer.from([0x48, 0x65]);
  const copy = Buffer.from(original);
  copy[0] = 0x80;
  return isAscii(original) === true && isAscii(copy) === false;
});

// Buffer.from ArrayBuffer 测试
test('Buffer.from - ArrayBuffer ASCII', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view[0] = 0x48;
  view[1] = 0x65;
  view[2] = 0x6C;
  view[3] = 0x6C;
  view[4] = 0x6F;
  const buf = Buffer.from(ab);
  return isAscii(buf) === true;
});

test('Buffer.from - ArrayBuffer with offset ASCII', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[5] = 0x48;
  view[6] = 0x65;
  view[7] = 0x6C;
  const buf = Buffer.from(ab, 5, 3);
  return isAscii(buf) === true;
});

test('Buffer.from - ArrayBuffer with offset 非 ASCII', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[3] = 0x80;
  view[4] = 0xFF;
  const buf = Buffer.from(ab, 3, 2);
  return isAscii(buf) === false;
});

// Buffer.concat 测试
test('Buffer.concat - 多个 ASCII Buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(' ');
  const buf3 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2, buf3]);
  return isAscii(result) === true;
});

test('Buffer.concat - 包含非 ASCII Buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from([0x80]);
  const buf3 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2, buf3]);
  return isAscii(result) === false;
});

test('Buffer.concat - 空数组', () => {
  const result = Buffer.concat([]);
  return isAscii(result) === true;
});

test('Buffer.concat - 单个 Buffer', () => {
  const buf = Buffer.from('hello');
  const result = Buffer.concat([buf]);
  return isAscii(result) === true;
});

test('Buffer.concat - 指定总长度 ASCII', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2], 10);
  return isAscii(result) === true;
});

test('Buffer.concat - 指定总长度截断', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from([0x80, 0xFF]);
  const result = Buffer.concat([buf1, buf2], 5); // 只保留 'hello'
  return isAscii(result) === true;
});

// Buffer.of 测试（如果存在）
test('Buffer.of - ASCII 字节', () => {
  if (typeof Buffer.of === 'function') {
    const buf = Buffer.of(0x48, 0x65, 0x6C, 0x6C, 0x6F);
    return isAscii(buf) === true;
  }
  return true; // 跳过
});

test('Buffer.of - 非 ASCII 字节', () => {
  if (typeof Buffer.of === 'function') {
    const buf = Buffer.of(0x48, 0x80);
    return isAscii(buf) === false;
  }
  return true; // 跳过
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
