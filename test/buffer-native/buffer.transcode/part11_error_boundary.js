// buffer.transcode() - Part 11: Error Messages and Boundary Behavior
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

// 无效 UTF-8 在不同位置
test('无效字节在开头', () => {
  const source = Buffer.from([0x80, 0x48, 0x65]); // 无效 + "He"
  try {
    transcode(source, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('无效字节在中间', () => {
  const source = Buffer.from([0x48, 0x80, 0x65]); // "H" + 无效 + "e"
  try {
    transcode(source, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('无效字节在末尾', () => {
  const source = Buffer.from([0x48, 0x65, 0x80]); // "He" + 无效
  try {
    transcode(source, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('多个无效字节', () => {
  const source = Buffer.from([0x80, 0x81, 0x82]);
  try {
    transcode(source, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

// UTF-16LE 不完整代理对在不同位置
test('不完整高代理在开头', () => {
  const source = Buffer.from([0x00, 0xD8]); // 单个高代理
  try {
    transcode(source, 'utf16le', 'utf8');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('不完整高代理在末尾', () => {
  const source = Buffer.from([0x48, 0x00, 0x00, 0xD8]); // "H" + 高代理
  try {
    transcode(source, 'utf16le', 'utf8');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('高代理后跟非低代理', () => {
  const source = Buffer.from([0x00, 0xD8, 0x48, 0x00]); // 高代理 + "H"
  try {
    transcode(source, 'utf16le', 'utf8');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

// 边界长度的 UTF-16LE
test('UTF-16LE 1 字节（截断处理）', () => {
  const source = Buffer.from([0x48]);
  // Node.js v25.0.0 会截断最后一个字节（1字节无法组成UTF-16LE字符），返回空Buffer
  const result = transcode(source, 'utf16le', 'utf8');
  return result.length === 0;
});

test('UTF-16LE 3 字节（截断处理）', () => {
  const source = Buffer.from([0x48, 0x00, 0x65]);
  // Node.js v25.0.0 会截断最后一个字节，只转换前2个字节
  const result = transcode(source, 'utf16le', 'utf8');
  // 应该只转换前 2 个字节（'H'），最后一个字节被截断
  return result.length === 1 && result[0] === 0x48; // 'H'
});

test('UTF-16LE 5 字节（截断处理）', () => {
  const source = Buffer.from([0x48, 0x00, 0x65, 0x00, 0x6C]);
  // Node.js v25.0.0 会截断最后一个字节，只转换前4个字节
  const result = transcode(source, 'utf16le', 'utf8');
  // 应该只转换前 4 个字节（'He'），最后一个字节被截断
  return result.length === 2 && result[0] === 0x48 && result[1] === 0x65; // 'He'
});

// TypedArray 带 byteOffset 但长度为 0
test('Uint8Array byteOffset>0 且 length=0', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab, 5, 0);
  const result = transcode(view, 'utf8', 'utf16le');
  return result.length === 0;
});

test('Uint8Array byteOffset 在缓冲区末尾', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab, 10, 0);
  const result = transcode(view, 'utf8', 'utf16le');
  return result.length === 0;
});

// frozen/sealed Buffer
// 注意：Node.js v25.0.0 不允许 freeze/seal TypedArray (包括 Buffer)
test('Object.freeze 的 Buffer', () => {
  const source = Buffer.from('Test', 'utf8');
  try {
    Object.freeze(source);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Cannot freeze array buffer views');
  }
});

test('Object.seal 的 Buffer', () => {
  const source = Buffer.from('Test', 'utf8');
  try {
    Object.seal(source);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Cannot seal array buffer views');
  }
});

// 特殊编码组合
test('Binary 到 UTF-16LE', () => {
  try {
    const source = Buffer.from('Test', 'binary');
    const result = transcode(source, 'binary', 'utf16le');
    return result.length === 8;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('UCS2 到 ASCII (ASCII 范围)', () => {
  const source = Buffer.from('ABC', 'ucs2');
  const result = transcode(source, 'ucs2', 'ascii');
  return result.toString('ascii') === 'ABC';
});

test('UCS2 到 Latin1 (Latin1 范围)', () => {
  const source = Buffer.from('Test', 'ucs2');
  const result = transcode(source, 'ucs2', 'latin1');
  return result.toString('latin1') === 'Test';
});

// 编码名称变体
test('编码名称 utf8（无连字符）', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

test('编码名称 utf-8（带连字符）', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'utf-8', 'utf-16le');
  return result instanceof Buffer;
});

test('编码名称 ucs2（无连字符）', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'utf8', 'ucs2');
  return result instanceof Buffer;
});

test('编码名称 ucs-2（带连字符）', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'utf8', 'ucs-2');
  return result instanceof Buffer;
});

// 连续相同字节
test('连续 0x41 (AAAA...)', () => {
  const source = Buffer.from([0x41, 0x41, 0x41, 0x41]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 8;
});

test('连续 0x00 (NULL...)', () => {
  const source = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 8 && result.every(b => b === 0x00);
});

test('连续 0x7F (DEL...)', () => {
  const source = Buffer.from([0x7F, 0x7F, 0x7F, 0x7F]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 8;
});

// UTF-8 边界组合
test('UTF-8 1+2 字节组合', () => {
  const source = Buffer.from([0x41, 0xC2, 0x80]); // A + U+0080
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 4;
});

test('UTF-8 1+2+3 字节组合', () => {
  const source = Buffer.from([0x41, 0xC2, 0x80, 0xE0, 0xA0, 0x80]); // A + U+0080 + U+0800
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 6;
});

test('UTF-8 1+2+3+4 字节组合', () => {
  const source = Buffer.from([0x41, 0xC2, 0x80, 0xE0, 0xA0, 0x80, 0xF0, 0x90, 0x80, 0x80]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 10;
});

// 特殊情况：零长度但有内容的 TypedArray
test('Uint8Array.slice(0, 0) 的结果', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  const empty = arr.slice(0, 0);
  const result = transcode(empty, 'utf8', 'utf16le');
  return result.length === 0;
});

test('Uint8Array.slice(5, 5) 的结果', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  const empty = arr.slice(5, 5);
  const result = transcode(empty, 'utf8', 'utf16le');
  return result.length === 0;
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
