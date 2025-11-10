// buf.indexOf() - Comprehensive Supplement Tests
// 补充遗漏的测试场景
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

function testError(name, fn, expectedErrorType) {
  try {
    fn();
    tests.push({ name, status: '❌', error: 'Expected error but none thrown' });
  } catch (e) {
    const pass = e.name === expectedErrorType || e.message.includes(expectedErrorType);
    tests.push({ name, status: pass ? '✅' : '❌', error: pass ? undefined : e.message });
  }
}

// slice vs subarray 行为测试
test('slice vs subarray - 使用 slice 创建的 Buffer', () => {
  const buf = Buffer.from('this is a buffer example');
  const search = Buffer.from('a buffer example');
  return buf.indexOf(search.slice(0, 8)) === 8;
});

test('slice vs subarray - 使用 subarray 创建的 Buffer', () => {
  const buf = Buffer.from('this is a buffer example');
  const search = Buffer.from('a buffer example');
  return buf.indexOf(search.subarray(0, 8)) === 8;
});

test('slice vs subarray - slice 和 subarray 结果一致', () => {
  const buf = Buffer.from('hello world hello');
  const search = Buffer.from('hello world');
  const sliceResult = buf.indexOf(search.slice(0, 5));
  const subarrayResult = buf.indexOf(search.subarray(0, 5));
  return sliceResult === subarrayResult && sliceResult === 0;
});

// byteOffset 为编码名称的完整测试
test('byteOffset 为 "utf8" - 应作为 encoding', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 'utf8') === 6;
});

test('byteOffset 为 "utf-8" - 应作为 encoding', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 'utf-8') === 6;
});

test('byteOffset 为 "UTF8" - 应作为 encoding', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 'UTF8') === 6;
});

test('byteOffset 为 "hex" - 应作为 encoding', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  return buf.indexOf('6c6c', 'hex') === 2;
});

test('byteOffset 为 "HEX" - 应作为 encoding', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  return buf.indexOf('6c6c', 'HEX') === 2;
});

test('byteOffset 为 "base64" - 应作为 encoding', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64');
  return buf.indexOf('Hello', 'utf8') === 0;
});

test('byteOffset 为 "latin1" - 应作为 encoding', () => {
  const buf = Buffer.from('hello world', 'latin1');
  return buf.indexOf('world', 'latin1') === 6;
});

test('byteOffset 为 "binary" - 应作为 encoding', () => {
  const buf = Buffer.from('hello world', 'binary');
  return buf.indexOf('world', 'binary') === 6;
});

test('byteOffset 为 "ascii" - 应作为 encoding', () => {
  const buf = Buffer.from('hello world', 'ascii');
  return buf.indexOf('world', 'ascii') === 6;
});

test('byteOffset 为 "ucs2" - 应作为 encoding', () => {
  const buf = Buffer.from('hello', 'ucs2');
  return buf.indexOf('hello', 'ucs2') === 0;
});

test('byteOffset 为 "ucs-2" - 应作为 encoding', () => {
  const buf = Buffer.from('hello', 'ucs2');
  return buf.indexOf('hello', 'ucs-2') === 0;
});

test('byteOffset 为 "utf16le" - 应作为 encoding', () => {
  const buf = Buffer.from('hello', 'utf16le');
  return buf.indexOf('hello', 'utf16le') === 0;
});

test('byteOffset 为 "utf-16le" - 应作为 encoding', () => {
  const buf = Buffer.from('hello', 'utf16le');
  return buf.indexOf('hello', 'utf-16le') === 0;
});

// 与 String.prototype.indexOf 行为一致性测试
test('与 String.indexOf 一致 - 空字符串在开头', () => {
  const str = 'hello';
  const buf = Buffer.from(str);
  return buf.indexOf('') === str.indexOf('');
});

test('与 String.indexOf 一致 - 空字符串在中间', () => {
  const str = 'hello';
  const buf = Buffer.from(str);
  return buf.indexOf('', 2) === str.indexOf('', 2);
});

test('与 String.indexOf 一致 - 空字符串在末尾', () => {
  const str = 'hello';
  const buf = Buffer.from(str);
  return buf.indexOf('', 5) === str.indexOf('', 5);
});

test('与 String.indexOf 一致 - 空字符串超出长度', () => {
  const str = 'hello';
  const buf = Buffer.from(str);
  const strResult = str.indexOf('', 10);
  const bufResult = buf.indexOf('', 10);
  return bufResult === 5 && strResult === 5;
});

test('与 String.indexOf 一致 - 负偏移', () => {
  const str = 'hello world';
  const buf = Buffer.from(str);
  return buf.indexOf('world', -5) === 6;
});

test('与 String.indexOf 一致 - 负偏移超出范围', () => {
  const str = 'hello';
  const buf = Buffer.from(str);
  return buf.indexOf('h', -100) === 0;
});

test('与 String.indexOf 一致 - byteOffset 为 undefined', () => {
  const str = 'hello world';
  const buf = Buffer.from(str);
  return buf.indexOf('world', undefined) === str.indexOf('world', undefined);
});

test('与 String.indexOf 一致 - byteOffset 为 null', () => {
  const str = 'hello world';
  const buf = Buffer.from(str);
  return buf.indexOf('world', null) === str.indexOf('world', null);
});

test('与 String.indexOf 一致 - byteOffset 为 NaN', () => {
  const str = 'hello world';
  const buf = Buffer.from(str);
  return buf.indexOf('world', NaN) === 6;
});

// 更多 TypedArray 子类测试
test('Int8Array 作为搜索值 - 正数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const search = new Int8Array([3, 4]);
  return buf.indexOf(Buffer.from(search.buffer, search.byteOffset, search.byteLength)) === 2;
});

test('Int8Array 作为搜索值 - 负数', () => {
  const buf = Buffer.from([255, 254, 253]);
  const search = new Int8Array([-1, -2]); // -1 = 255, -2 = 254
  return buf.indexOf(Buffer.from(search.buffer, search.byteOffset, search.byteLength)) === 0;
});

test('Uint16Array 作为搜索值 - 小端序', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const search = new Uint16Array([0x0201]); // 小端序: 01 02
  return buf.indexOf(Buffer.from(search.buffer)) === 0;
});

test('Uint32Array 作为搜索值', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
  const search = new Uint32Array([0x04030201]); // 小端序: 01 02 03 04
  return buf.indexOf(Buffer.from(search.buffer)) === 0;
});

test('Float64Array 作为搜索值', () => {
  const buf = Buffer.alloc(16);
  const float = new Float64Array([1.5]);
  Buffer.from(float.buffer).copy(buf, 0);
  return buf.indexOf(Buffer.from(float.buffer)) === 0;
});

test('BigInt64Array 作为搜索值', () => {
  const buf = Buffer.alloc(16);
  const bigint = new BigInt64Array([BigInt(123456789)]);
  Buffer.from(bigint.buffer).copy(buf, 0);
  return buf.indexOf(Buffer.from(bigint.buffer)) === 0;
});

test('BigUint64Array 作为搜索值', () => {
  const buf = Buffer.alloc(16);
  const biguint = new BigUint64Array([BigInt(123456789)]);
  Buffer.from(biguint.buffer).copy(buf, 0);
  return buf.indexOf(Buffer.from(biguint.buffer)) === 0;
});

// 特殊编码边界测试
test('UTF-16LE - 查找 BMP 字符', () => {
  const buf = Buffer.from('你好世界', 'utf16le');
  return buf.indexOf('世界', 0, 'utf16le') >= 0;
});

test('UTF-16LE - 查找 emoji', () => {
  const buf = Buffer.from('😀😁', 'utf16le');
  return buf.indexOf('😁', 0, 'utf16le') >= 0;
});

test('Latin1 - 查找扩展 ASCII', () => {
  const buf = Buffer.from([0xC0, 0xC1, 0xC2]); // À Á Â
  return buf.indexOf(0xC1) === 1;
});

test('Latin1 - 字符串查找', () => {
  const buf = Buffer.from('café', 'latin1');
  return buf.indexOf('café', 0, 'latin1') === 0;
});

// 数字转换的完整测试
test('数字 0 - 查找空字节', () => {
  const buf = Buffer.from([1, 0, 2, 0, 3]);
  return buf.indexOf(0) === 1;
});

test('数字 0.0 - 应转换为 0', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.indexOf(0.0) === 0;
});

test('数字 -0 - 应转换为 0', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.indexOf(-0) === 0;
});

test('数字 255.9 - 应转换为 255', () => {
  const buf = Buffer.from([0, 255, 2]);
  return buf.indexOf(255.9) === 1;
});

test('数字 256.5 - 应转换为 0', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.indexOf(256.5) === 0;
});

test('数字 512 - 应转换为 0', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.indexOf(512) === 0;
});

test('数字 -128 - 应转换为 128', () => {
  const buf = Buffer.from([0, 128, 2]);
  return buf.indexOf(-128) === 1;
});

test('数字 -255 - 应转换为 1', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.indexOf(-255) === 1;
});

// 极端场景测试
test('极端 - 单字节 Buffer 查找自身', () => {
  const buf = Buffer.from([42]);
  return buf.indexOf(42) === 0;
});

test('极端 - 单字节 Buffer 查找字符串', () => {
  const buf = Buffer.from('a');
  return buf.indexOf('a') === 0;
});

test('极端 - 两字节 Buffer 查找两字节', () => {
  const buf = Buffer.from([1, 2]);
  return buf.indexOf(Buffer.from([1, 2])) === 0;
});

test('极端 - 查找长度等于 Buffer 的值', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello') === 0;
});

test('极端 - 查找长度大于 Buffer 的值', () => {
  const buf = Buffer.from('hi');
  return buf.indexOf('hello') === -1;
});

// 内存对齐测试
test('内存对齐 - 16 字节对齐', () => {
  const buf = Buffer.alloc(32);
  buf.write('target', 16);
  return buf.indexOf('target') === 16;
});

test('内存对齐 - 32 字节对齐', () => {
  const buf = Buffer.alloc(64);
  buf.write('target', 32);
  return buf.indexOf('target') === 32;
});

test('内存对齐 - 64 字节对齐', () => {
  const buf = Buffer.alloc(128);
  buf.write('target', 64);
  return buf.indexOf('target') === 64;
});

// 特殊字符组合测试
test('特殊字符 - CRLF 组合', () => {
  const buf = Buffer.from('line1\r\nline2');
  return buf.indexOf('\r\n') === 5;
});

test('特殊字符 - 多个 CRLF', () => {
  const buf = Buffer.from('line1\r\nline2\r\nline3');
  return buf.indexOf('\r\n', 6) === 12;
});

test('特殊字符 - Tab 和空格混合', () => {
  const buf = Buffer.from('hello\t world');
  return buf.indexOf('\t ') === 5;
});

test('特殊字符 - 多个空字符', () => {
  const buf = Buffer.from('a\0\0b');
  return buf.indexOf('\0\0') === 1;
});

// 二进制模式测试
test('二进制模式 - 魔数查找 (PNG)', () => {
  const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return buf.indexOf(Buffer.from([0x89, 0x50, 0x4E, 0x47])) === 0;
});

test('二进制模式 - 魔数查找 (JPEG)', () => {
  const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
  return buf.indexOf(Buffer.from([0xFF, 0xD8])) === 0;
});

test('二进制模式 - 魔数查找 (GIF)', () => {
  const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a
  return buf.indexOf(Buffer.from([0x47, 0x49, 0x46])) === 0;
});

test('二进制模式 - 查找字节序标记 (BOM UTF-8)', () => {
  const buf = Buffer.from([0xEF, 0xBB, 0xBF, 0x68, 0x65, 0x6C, 0x6C, 0x6F]);
  return buf.indexOf(Buffer.from([0xEF, 0xBB, 0xBF])) === 0;
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
