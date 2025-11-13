// buffer.transcode() - Part 14: Final Extreme Boundary Challenges
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

// 所有可能的编码对组合（穷举未测试的）
test('ASCII -> UCS2', () => {
  const source = Buffer.from('Test', 'ascii');
  const result = transcode(source, 'ascii', 'ucs2');
  return result.length === 8;
});

test('ASCII -> Binary', () => {
  try {
    const source = Buffer.from('Test', 'ascii');
    const result = transcode(source, 'ascii', 'binary');
    return result instanceof Buffer;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('Binary -> ASCII', () => {
  try {
    const source = Buffer.from([0x41, 0x42, 0x43]);
    const result = transcode(source, 'binary', 'ascii');
    return result instanceof Buffer;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('Binary -> UCS2', () => {
  try {
    const source = Buffer.from([0x41, 0x42, 0x43]);
    const result = transcode(source, 'binary', 'ucs2');
    return result instanceof Buffer;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('Binary -> Latin1', () => {
  try {
    const source = Buffer.from([0x41, 0x42, 0x43]);
    const result = transcode(source, 'binary', 'latin1');
    return result instanceof Buffer;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

// UTF-8 每种字节长度的边界值详尽测试
test('UTF-8 1字节最大值前一个 (U+007E ~)', () => {
  const source = Buffer.from([0x7E]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2 && result[0] === 0x7E;
});

test('UTF-8 2字节最小值后一个 (U+0081)', () => {
  const source = Buffer.from([0xC2, 0x81]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('UTF-8 2字节最大值前一个 (U+07FE)', () => {
  const source = Buffer.from([0xDF, 0xBE]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('UTF-8 3字节最小值后一个 (U+0801)', () => {
  const source = Buffer.from([0xE0, 0xA0, 0x81]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('UTF-8 3字节最大值前一个 (U+FFFE)', () => {
  const source = Buffer.from([0xEF, 0xBF, 0xBE]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('UTF-8 4字节最小值后一个 (U+10001)', () => {
  const source = Buffer.from([0xF0, 0x90, 0x80, 0x81]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 4;
});

test('UTF-8 4字节最大值前一个 (U+10FFFE)', () => {
  const source = Buffer.from([0xF4, 0x8F, 0xBF, 0xBE]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 4;
});

// 代理对的所有边界组合
test('最小有效代理对 (U+10000)', () => {
  const source = Buffer.from([0x00, 0xD8, 0x00, 0xDC]); // 0xD800 0xDC00
  const result = transcode(source, 'utf16le', 'utf8');
  return result.length === 4;
});

test('最大有效代理对 (U+10FFFF)', () => {
  const source = Buffer.from([0xFF, 0xDB, 0xFF, 0xDF]); // 0xDBFF 0xDFFF
  const result = transcode(source, 'utf16le', 'utf8');
  return result.length === 4;
});

test('高代理边界 0xD7FF (不是代理)', () => {
  const source = Buffer.from([0xFF, 0xD7]);
  const result = transcode(source, 'utf16le', 'utf8');
  return result.length === 3;
});

test('高代理边界 0xE000 (不是代理)', () => {
  const source = Buffer.from([0x00, 0xE0]);
  const result = transcode(source, 'utf16le', 'utf8');
  return result.length === 3;
});

// 所有 Latin1 字节的详细验证
test('Latin1 0x80 到 UTF-8', () => {
  const source = Buffer.from([0x80]);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length === 2 && result[0] === 0xC2 && result[1] === 0x80;
});

test('Latin1 0x81 到 UTF-8', () => {
  const source = Buffer.from([0x81]);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length === 2 && result[0] === 0xC2 && result[1] === 0x81;
});

test('Latin1 0xFE 到 UTF-8', () => {
  const source = Buffer.from([0xFE]);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length === 2 && result[0] === 0xC3 && result[1] === 0xBE;
});

test('Latin1 所有控制字符 (0x00-0x1F)', () => {
  const bytes = [];
  for (let i = 0; i <= 0x1F; i++) {
    bytes.push(i);
  }
  const source = Buffer.from(bytes);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length === 32;
});

test('Latin1 所有可打印字符 (0x20-0x7E)', () => {
  const bytes = [];
  for (let i = 0x20; i <= 0x7E; i++) {
    bytes.push(i);
  }
  const source = Buffer.from(bytes);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length === 95;
});

// 极端长度的精确值测试
test('长度恰好 8191', () => {
  const source = Buffer.from('X'.repeat(8191), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 16382;
});

test('长度恰好 8192', () => {
  const source = Buffer.from('X'.repeat(8192), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 16384;
});

test('长度恰好 8193', () => {
  const source = Buffer.from('X'.repeat(8193), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 16386;
});

test('长度恰好 16383', () => {
  const source = Buffer.from('Y'.repeat(16383), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 32766;
});

test('长度恰好 16384', () => {
  const source = Buffer.from('Y'.repeat(16384), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 32768;
});

// Buffer 的特殊状态
test('Buffer.from 直接创建的视图', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[0] = 0x48;
  view[1] = 0x65;
  const buf = Buffer.from(view.buffer, 0, 2);
  const result = transcode(buf, 'utf8', 'utf16le');
  return result.length === 4;
});

test('Buffer.concat 的结果', () => {
  const b1 = Buffer.from('He', 'utf8');
  const b2 = Buffer.from('llo', 'utf8');
  const combined = Buffer.concat([b1, b2]);
  const result = transcode(combined, 'utf8', 'utf16le');
  return result.length === 10;
});

// 链式转换的极端长度
test('10 次链式转换', () => {
  let current = Buffer.from('Chain', 'utf8');

  for (let i = 0; i < 5; i++) {
    current = transcode(current, 'utf8', 'utf16le');
    current = transcode(current, 'utf16le', 'utf8');
  }

  return current.toString('utf8') === 'Chain';
});

test('不同编码的循环转换', () => {
  const original = Buffer.from('Cycle', 'utf8');

  let current = transcode(original, 'utf8', 'utf16le');
  current = transcode(current, 'utf16le', 'latin1');
  current = transcode(current, 'latin1', 'utf8');

  return current.toString('utf8') === 'Cycle';
});

// 特殊模式的重复
test('二进制模式 0x00 0xFF 交替 1000 次', () => {
  const bytes = [];
  for (let i = 0; i < 1000; i++) {
    bytes.push(i % 2 === 0 ? 0x00 : 0xFF);
  }
  const source = Buffer.from(bytes);
  try {
    const result = transcode(source, 'utf8', 'utf16le');
    return result instanceof Buffer;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('递增模式 0x00-0xFF 循环', () => {
  const bytes = [];
  for (let i = 0; i < 1000; i++) {
    bytes.push(i % 256);
  }
  const source = Buffer.from(bytes);
  try {
    const result = transcode(source, 'latin1', 'utf8');
    return result instanceof Buffer;
  } catch (e) {
    return true;
  }
});

// 所有编码名称的大小写组合
test('编码名称全小写 - utf8 utf16le', () => {
  const source = Buffer.from('test', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

test('编码名称全大写 - UTF8 UTF16LE', () => {
  const source = Buffer.from('TEST', 'utf8');
  const result = transcode(source, 'UTF8', 'UTF16LE');
  return result instanceof Buffer;
});

test('编码名称混合 - Utf8 Utf16Le', () => {
  const source = Buffer.from('MiXeD', 'utf8');
  const result = transcode(source, 'Utf8', 'Utf16Le');
  return result instanceof Buffer;
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
