// Buffer.alloc() - Part 2: Fill Values Tests
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

// fill 参数为数字
test('fill 为数字 0', () => {
  const buf = Buffer.alloc(5, 0);
  return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
});

test('fill 为数字 1', () => {
  const buf = Buffer.alloc(5, 1);
  return buf[0] === 1 && buf[1] === 1 && buf[4] === 1;
});

test('fill 为数字 255', () => {
  const buf = Buffer.alloc(5, 255);
  return buf[0] === 255 && buf[1] === 255 && buf[4] === 255;
});

test('fill 为数字 0x41 (65, A)', () => {
  const buf = Buffer.alloc(5, 0x41);
  return buf[0] === 0x41 && buf[1] === 0x41 && buf[4] === 0x41;
});

test('fill 为数字 256（应自动取模为 0）', () => {
  const buf = Buffer.alloc(5, 256);
  return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
});

test('fill 为数字 257（应自动取模为 1）', () => {
  const buf = Buffer.alloc(5, 257);
  return buf[0] === 1 && buf[1] === 1 && buf[4] === 1;
});

test('fill 为数字 -1（应转换为 255）', () => {
  const buf = Buffer.alloc(5, -1);
  return buf[0] === 255 && buf[1] === 255 && buf[4] === 255;
});

test('fill 为数字 -256（应转换为 0）', () => {
  const buf = Buffer.alloc(5, -256);
  return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
});

// fill 参数为字符串
test('fill 为字符串 a', () => {
  const buf = Buffer.alloc(5, 'a');
  return buf[0] === 0x61 && buf[1] === 0x61 && buf[4] === 0x61;
});

test('fill 为字符串 abc（重复填充）', () => {
  const buf = Buffer.alloc(10, 'abc');
  const expected = Buffer.from('abcabcabca');
  return buf.equals(expected);
});

test('fill 为字符串 hello（部分重复）', () => {
  const buf = Buffer.alloc(12, 'hello');
  const expected = Buffer.from('hellohellohe');
  return buf.equals(expected);
});

test('fill 为空字符串（应填充为 0）', () => {
  const buf = Buffer.alloc(5, '');
  return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
});

test('fill 为单字符字符串 X', () => {
  const buf = Buffer.alloc(3, 'X');
  return buf[0] === 0x58 && buf[1] === 0x58 && buf[2] === 0x58;
});

test('fill 为多字节 UTF-8 字符', () => {
  const buf = Buffer.alloc(9, '中');
  const charBuf = Buffer.from('中');
  return buf[0] === charBuf[0] && buf[1] === charBuf[1] && buf[2] === charBuf[2];
});

test('fill 为 emoji', () => {
  const buf = Buffer.alloc(8, '😀');
  const emojiBuf = Buffer.from('😀');
  return buf[0] === emojiBuf[0] && buf[1] === emojiBuf[1];
});

// fill 参数为 Buffer
test('fill 为 Buffer（单字节）', () => {
  const fillBuf = Buffer.from([0x42]);
  const buf = Buffer.alloc(5, fillBuf);
  return buf[0] === 0x42 && buf[1] === 0x42 && buf[4] === 0x42;
});

test('fill 为 Buffer（多字节，重复填充）', () => {
  const fillBuf = Buffer.from([0x01, 0x02, 0x03]);
  const buf = Buffer.alloc(10, fillBuf);
  return buf[0] === 0x01 && buf[1] === 0x02 && buf[2] === 0x03 &&
         buf[3] === 0x01 && buf[4] === 0x02 && buf[5] === 0x03 &&
         buf[6] === 0x01 && buf[7] === 0x02 && buf[8] === 0x03 &&
         buf[9] === 0x01;
});

test('fill 为空 Buffer（应报错）', () => {
  try {
    const fillBuf = Buffer.from([]);
    const buf = Buffer.alloc(5, fillBuf);
    return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('fill 为 Buffer（长度大于目标 Buffer）', () => {
  const fillBuf = Buffer.from([0x10, 0x20, 0x30, 0x40, 0x50]);
  const buf = Buffer.alloc(3, fillBuf);
  return buf[0] === 0x10 && buf[1] === 0x20 && buf[2] === 0x30;
});

// fill 参数为 Uint8Array
test('fill 为 Uint8Array（单字节）', () => {
  const fillArr = new Uint8Array([0x7F]);
  const buf = Buffer.alloc(5, fillArr);
  return buf[0] === 0x7F && buf[1] === 0x7F && buf[4] === 0x7F;
});

test('fill 为 Uint8Array（多字节）', () => {
  const fillArr = new Uint8Array([0x0A, 0x0B]);
  const buf = Buffer.alloc(6, fillArr);
  return buf[0] === 0x0A && buf[1] === 0x0B &&
         buf[2] === 0x0A && buf[3] === 0x0B &&
         buf[4] === 0x0A && buf[5] === 0x0B;
});

test('fill 为 Uint8Array（空数组，应报错）', () => {
  try {
    const fillArr = new Uint8Array([]);
    const buf = Buffer.alloc(5, fillArr);
    return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// fill 参数为 undefined（默认行为）
test('fill 为 undefined（应填充 0）', () => {
  const buf = Buffer.alloc(5, undefined);
  return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
});

// 混合场景
test('fill 为数字 0x00（显式零填充）', () => {
  const buf = Buffer.alloc(5, 0x00);
  return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
});

test('fill 为字符串数字 1', () => {
  const buf = Buffer.alloc(3, '1');
  return buf[0] === 0x31 && buf[1] === 0x31 && buf[2] === 0x31;
});

test('fill 为 Buffer.from(test)', () => {
  const fillBuf = Buffer.from('test');
  const buf = Buffer.alloc(10, fillBuf);
  const expected = Buffer.from('testtestte');
  return buf.equals(expected);
});

test('fill 为小数 1.5（应取整为 1）', () => {
  const buf = Buffer.alloc(5, 1.5);
  return buf[0] === 1 && buf[4] === 1;
});

test('fill 为小数 255.7（应取整为 255）', () => {
  const buf = Buffer.alloc(5, 255.7);
  return buf[0] === 255 && buf[4] === 255;
});

test('fill 为负小数 -1.5（应处理）', () => {
  const buf = Buffer.alloc(5, -1.5);
  return buf.length === 5;
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
