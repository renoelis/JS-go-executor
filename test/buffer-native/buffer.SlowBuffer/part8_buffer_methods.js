// Buffer.allocUnsafeSlow - 与其他 Buffer 方法交互 (Round 2 补漏)
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

// 与 Buffer.from 配合使用
test('allocUnsafeSlow 创建后可以用 from 复制', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  buf1.write('hello');
  const buf2 = Buffer.from(buf1);
  return buf2.toString() === 'hello' && buf1 !== buf2;
});

test('from 可以复制 allocUnsafeSlow 创建的 Buffer', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  buf1[0] = 65;
  buf1[1] = 66;
  const buf2 = Buffer.from(buf1);
  buf2[0] = 67;
  return buf1[0] === 65 && buf2[0] === 67;
});

// 与 Buffer.concat 配合使用
test('allocUnsafeSlow 创建的 Buffer 可以被 concat', () => {
  const buf1 = Buffer.allocUnsafeSlow(3);
  buf1.write('abc');
  const buf2 = Buffer.from('def');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString() === 'abcdef' && result.length === 6;
});

test('concat 多个 allocUnsafeSlow 创建的 Buffer', () => {
  const buf1 = Buffer.allocUnsafeSlow(2);
  const buf2 = Buffer.allocUnsafeSlow(2);
  const buf3 = Buffer.allocUnsafeSlow(2);
  buf1.write('ab');
  buf2.write('cd');
  buf3.write('ef');
  const result = Buffer.concat([buf1, buf2, buf3]);
  return result.toString() === 'abcdef';
});

// 与 Buffer.compare 配合使用
test('allocUnsafeSlow 创建的 Buffer 可以被 compare', () => {
  const buf1 = Buffer.allocUnsafeSlow(3);
  const buf2 = Buffer.allocUnsafeSlow(3);
  buf1.write('abc');
  buf2.write('abc');
  return Buffer.compare(buf1, buf2) === 0;
});

test('compare 不同内容的 allocUnsafeSlow Buffer', () => {
  const buf1 = Buffer.allocUnsafeSlow(3);
  const buf2 = Buffer.allocUnsafeSlow(3);
  buf1.write('abc');
  buf2.write('def');
  return Buffer.compare(buf1, buf2) < 0;
});

// 与 Buffer.isBuffer 配合使用
test('isBuffer 识别 allocUnsafeSlow 创建的 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return Buffer.isBuffer(buf) === true;
});

test('isBuffer 对空 allocUnsafeSlow Buffer 也返回 true', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return Buffer.isBuffer(buf) === true;
});

// 与 buffer.equals 方法配合使用
test('allocUnsafeSlow Buffer 可以使用 equals 比较', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  const buf2 = Buffer.allocUnsafeSlow(5);
  buf1.write('hello');
  buf2.write('hello');
  return buf1.equals(buf2) === true;
});

test('不同内容的 allocUnsafeSlow Buffer equals 返回 false', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  const buf2 = Buffer.allocUnsafeSlow(5);
  buf1.write('hello');
  buf2.write('world');
  return buf1.equals(buf2) === false;
});

// 与 buffer.copy 方法配合使用
test('可以从 allocUnsafeSlow Buffer copy 到另一个 Buffer', () => {
  const src = Buffer.allocUnsafeSlow(5);
  const dst = Buffer.allocUnsafeSlow(5);
  src.write('hello');
  dst.fill(0);
  src.copy(dst);
  return dst.toString() === 'hello';
});

test('可以 copy 到 allocUnsafeSlow Buffer', () => {
  const src = Buffer.from('world');
  const dst = Buffer.allocUnsafeSlow(5);
  dst.fill(0);
  src.copy(dst);
  return dst.toString() === 'world';
});

test('copy 支持 targetStart 参数', () => {
  const src = Buffer.from('abc');
  const dst = Buffer.allocUnsafeSlow(5);
  dst.fill(0);
  src.copy(dst, 2);
  return dst[0] === 0 && dst[2] === 97 && dst[3] === 98;
});

test('copy 支持 sourceStart 和 sourceEnd', () => {
  const src = Buffer.from('hello');
  const dst = Buffer.allocUnsafeSlow(5);
  dst.fill(0);
  src.copy(dst, 0, 1, 4);
  return dst.toString('utf8', 0, 3) === 'ell';
});

// 与 buffer.indexOf 和 lastIndexOf 配合使用
test('allocUnsafeSlow Buffer 支持 indexOf', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('hello');
  return buf.indexOf('ll') === 2;
});

test('allocUnsafeSlow Buffer 支持 lastIndexOf', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('hello');
  return buf.lastIndexOf('l') === 3;
});

test('indexOf 查找字节值', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 10;
  buf[1] = 20;
  buf[2] = 30;
  return buf.indexOf(20) === 1;
});

// 与 buffer.includes 配合使用
test('allocUnsafeSlow Buffer 支持 includes', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('hello');
  return buf.includes('ello') === true;
});

test('includes 查找不存在的内容返回 false', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('hello');
  return buf.includes('world') === false;
});

// 与 buffer.swap 方法配合使用
test('allocUnsafeSlow Buffer 支持 swap16', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf[0] = 0x01;
  buf[1] = 0x02;
  buf[2] = 0x03;
  buf[3] = 0x04;
  buf.swap16();
  return buf[0] === 0x02 && buf[1] === 0x01;
});

test('allocUnsafeSlow Buffer 支持 swap32', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf[0] = 0x01;
  buf[1] = 0x02;
  buf[2] = 0x03;
  buf[3] = 0x04;
  buf.swap32();
  return buf[0] === 0x04 && buf[3] === 0x01;
});

test('allocUnsafeSlow Buffer 支持 swap64', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  for (let i = 0; i < 8; i++) {
    buf[i] = i + 1;
  }
  buf.swap64();
  return buf[0] === 8 && buf[7] === 1;
});

// 与 Buffer.byteLength 配合使用
test('Buffer.byteLength 可以计算要写入 allocUnsafeSlow Buffer 的字符串长度', () => {
  const str = 'hello';
  const len = Buffer.byteLength(str);
  const buf = Buffer.allocUnsafeSlow(len);
  buf.write(str);
  return buf.toString('utf8', 0, len) === str;
});

test('Buffer.byteLength 支持不同编码', () => {
  const str = 'hello';
  const utf8Len = Buffer.byteLength(str, 'utf8');
  const buf = Buffer.allocUnsafeSlow(utf8Len);
  buf.write(str, 'utf8');
  return buf.toString('utf8').startsWith('hello');
});

// 与 buffer.toJSON 配合使用
test('allocUnsafeSlow Buffer 支持 toJSON', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  buf[3] = 4;
  buf[4] = 5;
  const json = buf.toJSON();
  return json.type === 'Buffer' && json.data[0] === 1;
});

test('toJSON 返回完整的数据数组', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 65;
  buf[1] = 66;
  buf[2] = 67;
  const json = buf.toJSON();
  return json.data.length === 3 && json.data[0] === 65;
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
