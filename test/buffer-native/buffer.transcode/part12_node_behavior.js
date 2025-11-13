// buffer.transcode() - Part 12: Node Behavior Details and Edge Cases
const { Buffer, transcode } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 转码后立即读取和修改
test('转码结果可立即读取', () => {
  const source = Buffer.from('AB', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const firstByte = result[0];
  const secondByte = result[1];
  return firstByte === 0x41 && secondByte === 0x00;
});

test('转码结果可立即修改', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  result[0] = 0xFF;
  return result[0] === 0xFF;
});

test('转码结果可用 toString', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'utf8', 'latin1');
  return result.toString('latin1') === 'Hello';
});

test('转码结果可用 slice', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const sliced = result.slice(0, 2);
  return sliced.length === 2;
});

test('转码结果可用 subarray', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const sub = result.subarray(0, 4);
  return sub.length === 4;
});

test('转码结果可用 write', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'utf8', 'latin1');
  const written = result.write('X', 0, 'latin1');
  return written === 1 && result[0] === 0x58;
});

test('转码结果可用 copy', () => {
  const source = Buffer.from('ABC', 'utf8');
  const result = transcode(source, 'utf8', 'latin1');
  const target = Buffer.alloc(3);
  const copied = result.copy(target);
  return copied === 3 && target.toString() === 'ABC';
});

test('转码结果可用 equals', () => {
  const source = Buffer.from('Test', 'utf8');
  const r1 = transcode(source, 'utf8', 'latin1');
  const r2 = transcode(source, 'utf8', 'latin1');
  return r1.equals(r2);
});

test('转码结果可用 compare', () => {
  const source = Buffer.from('Test', 'utf8');
  const r1 = transcode(source, 'utf8', 'latin1');
  const r2 = transcode(source, 'utf8', 'latin1');
  return r1.compare(r2) === 0;
});

// 多次转码的稳定性
test('同一 Buffer 顺序转码 10 次', () => {
  const source = Buffer.from('Stable', 'utf8');
  const results = [];

  for (let i = 0; i < 10; i++) {
    results.push(transcode(source, 'utf8', 'utf16le'));
  }

  for (let i = 1; i < 10; i++) {
    if (!results[0].equals(results[i])) return false;
  }
  return true;
});

test('交替源 Buffer 转码', () => {
  const s1 = Buffer.from('A', 'utf8');
  const s2 = Buffer.from('B', 'utf8');

  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(transcode(i % 2 === 0 ? s1 : s2, 'utf8', 'utf16le'));
  }

  return results[0].equals(results[2]) && results[1].equals(results[3]);
});

// Buffer 与 Uint8Array 混合
test('Buffer 转码后作为 Uint8Array 使用', () => {
  const source = Buffer.from('Mix', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const arr = new Uint8Array(result);
  return arr.length === 6;
});

test('Uint8Array 转码后作为 Buffer 使用', () => {
  const arr = new Uint8Array([0x4D, 0x69, 0x78]); // Mix
  const result = transcode(arr, 'utf8', 'utf16le');
  const str = result.toString('utf16le');
  return str === 'Mix';
});

// 空白字符详细测试
test('仅空格转码', () => {
  const source = Buffer.from('   ', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 6;
});

test('混合空白字符（空格+Tab+换行）', () => {
  const source = Buffer.from(' \t\n', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 6;
});

test('回车换行 CRLF', () => {
  const source = Buffer.from('\r\n', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 4;
});

test('所有空白字符组合', () => {
  const source = Buffer.from(' \t\n\r\v\f', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 12;
});

// 数字和标点符号
test('数字 0-9', () => {
  const source = Buffer.from('0123456789', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 20;
});

test('常见标点符号', () => {
  const source = Buffer.from('.,;:!?', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 12;
});

test('括号类符号', () => {
  const source = Buffer.from('()[]{}', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 12;
});

test('数学符号', () => {
  const source = Buffer.from('+-*/=', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 10;
});

test('货币符号 $', () => {
  const source = Buffer.from('$', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

// Latin1 特定字符详细测试
test('Latin1 货币符号 ¢ (0xA2)', () => {
  const source = Buffer.from([0xA2]);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length === 2;
});

test('Latin1 货币符号 £ (0xA3)', () => {
  const source = Buffer.from([0xA3]);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length === 2;
});

test('Latin1 货币符号 ¥ (0xA5)', () => {
  const source = Buffer.from([0xA5]);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length === 2;
});

test('Latin1 分数 ¼ (0xBC)', () => {
  const source = Buffer.from([0xBC]);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length === 2;
});

test('Latin1 分数 ¾ (0xBE)', () => {
  const source = Buffer.from([0xBE]);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length === 2;
});

// 特殊位置的空字节
test('开头的空字节', () => {
  const source = Buffer.from([0x00, 0x48, 0x65]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 6;
});

test('多个连续空字节', () => {
  const source = Buffer.from([0x00, 0x00, 0x00]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 6 && result.every(b => b === 0x00);
});

test('空字节分隔的字符', () => {
  const source = Buffer.from([0x41, 0x00, 0x42, 0x00, 0x43]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 10;
});

// 转码结果的迭代
test('转码结果可迭代', () => {
  const source = Buffer.from('AB', 'utf8');
  const result = transcode(source, 'utf8', 'latin1');
  const arr = [...result];
  return arr.length === 2 && arr[0] === 0x41 && arr[1] === 0x42;
});

test('转码结果可用 for...of', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'utf8', 'latin1');
  let count = 0;
  for (const byte of result) {
    count++;
  }
  return count === 4;
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
