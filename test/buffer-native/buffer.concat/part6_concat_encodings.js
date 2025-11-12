// Buffer.concat() - Encoding and Data Integrity Tests
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

// 各种编码格式
test('连接hex编码的Buffer', () => {
  const buf1 = Buffer.from('48656c6c6f', 'hex');
  const buf2 = Buffer.from('576f726c64', 'hex');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString('utf8') === 'HelloWorld';
});

test('连接base64编码的Buffer', () => {
  const buf1 = Buffer.from('SGVsbG8=', 'base64');
  const buf2 = Buffer.from('V29ybGQ=', 'base64');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString('utf8') === 'HelloWorld';
});

test('连接latin1编码的Buffer', () => {
  const buf1 = Buffer.from('hello', 'latin1');
  const buf2 = Buffer.from('world', 'latin1');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString('latin1') === 'helloworld';
});

test('连接ascii编码的Buffer', () => {
  const buf1 = Buffer.from('test', 'ascii');
  const buf2 = Buffer.from('data', 'ascii');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString('ascii') === 'testdata';
});

test('连接utf16le编码的Buffer', () => {
  const buf1 = Buffer.from('hello', 'utf16le');
  const buf2 = Buffer.from('world', 'utf16le');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString('utf16le') === 'helloworld';
});

// 二进制数据完整性
test('连接后的二进制数据完整性', () => {
  const data1 = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
  const data2 = new Uint8Array([0xFC, 0xFD, 0xFE, 0xFF]);
  const result = Buffer.concat([data1, data2]);
  return result.length === 8 &&
         result[0] === 0 && result[3] === 3 &&
         result[4] === 252 && result[7] === 255;
});

test('连接包含所有字节值（0-255）', () => {
  const buf1 = Buffer.alloc(128);
  const buf2 = Buffer.alloc(128);
  for (let i = 0; i < 128; i++) {
    buf1[i] = i;
    buf2[i] = i + 128;
  }
  const result = Buffer.concat([buf1, buf2]);
  if (result.length !== 256) return false;
  for (let i = 0; i < 256; i++) {
    if (result[i] !== i) return false;
  }
  return true;
});

// UTF-8 边界情况
test('连接包含BOM的UTF-8 Buffer', () => {
  const buf1 = Buffer.from('\uFEFFhello', 'utf8');
  const buf2 = Buffer.from('world', 'utf8');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString('utf8') === '\uFEFFhelloworld';
});

test('连接跨越多字节字符边界', () => {
  const text = '测试中文字符';
  const fullBuf = Buffer.from(text, 'utf8');
  const mid = Math.floor(fullBuf.length / 2);
  const buf1 = fullBuf.slice(0, mid);
  const buf2 = fullBuf.slice(mid);
  const result = Buffer.concat([buf1, buf2]);
  return result.toString('utf8') === text;
});

test('连接包含替代对的UTF-8字符', () => {
  const buf1 = Buffer.from('𝌆', 'utf8'); // 需要替代对的字符
  const buf2 = Buffer.from('𝌇', 'utf8');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString('utf8') === '𝌆𝌇';
});

test('连接包含零宽字符', () => {
  const buf1 = Buffer.from('hello\u200Bworld', 'utf8'); // 零宽空格
  const buf2 = Buffer.from('test', 'utf8');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString('utf8') === 'hello\u200Bworldtest';
});

// 数据保真测试
test('连接后读取int32数据', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeInt32BE(0x12345678, 0);
  buf2.writeInt32BE(-1698898192, 0); // 0x9ABCDEF0 的有符号表示
  const result = Buffer.concat([buf1, buf2]);
  return result.readInt32BE(0) === 0x12345678 &&
         result.readInt32BE(4) === -1698898192;
});

test('连接后读取float数据', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeFloatLE(3.14, 0);
  buf2.writeFloatLE(2.71, 0);
  const result = Buffer.concat([buf1, buf2]);
  const v1 = result.readFloatLE(0);
  const v2 = result.readFloatLE(4);
  return Math.abs(v1 - 3.14) < 0.01 && Math.abs(v2 - 2.71) < 0.01;
});

test('连接后读取double数据', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeDoubleLE(Math.PI, 0);
  buf2.writeDoubleLE(Math.E, 0);
  const result = Buffer.concat([buf1, buf2]);
  const v1 = result.readDoubleLE(0);
  const v2 = result.readDoubleLE(8);
  return Math.abs(v1 - Math.PI) < 0.0000001 &&
         Math.abs(v2 - Math.E) < 0.0000001;
});

// Base64 编码完整性
test('连接后转base64编码', () => {
  const buf1 = Buffer.from('Man', 'utf8');
  const buf2 = Buffer.from('y', 'utf8');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString('base64') === 'TWFueQ==';
});

test('连接hex编码后再转换', () => {
  const buf1 = Buffer.from([0xDE, 0xAD]);
  const buf2 = Buffer.from([0xBE, 0xEF]);
  const result = Buffer.concat([buf1, buf2]);
  return result.toString('hex') === 'deadbeef';
});

// 混合类型数据完整性
test('连接字符串和二进制混合数据', () => {
  const buf1 = Buffer.from('START:', 'utf8');
  const buf2 = Buffer.from([0xFF, 0x00, 0xFF, 0x00]);
  const buf3 = Buffer.from(':END', 'utf8');
  const result = Buffer.concat([buf1, buf2, buf3]);
  return result.length === 14 &&
         result.slice(0, 6).toString() === 'START:' &&
         result.slice(10, 14).toString() === ':END' &&
         result[6] === 255 && result[7] === 0;
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
