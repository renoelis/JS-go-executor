// buf.equals() - Special Cases
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

// 特殊值测试
test('Buffer with NaN byte value', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  return buf1.equals(buf2) === true;
});

test('Buffer 修改后比较', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  buf1[0] = 72; // 'H'
  return buf1.equals(buf2) === false;
});

test('Buffer 修改后恢复', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  const original = buf1[0];
  buf1[0] = 100;
  buf1[0] = original;
  return buf1.equals(buf2) === true;
});

test('共享底层内存 - subarray', () => {
  const buf = Buffer.from('hello world');
  const sub1 = buf.subarray(0, 5);
  const sub2 = buf.subarray(0, 5);
  return sub1.equals(sub2) === true;
});

test('subarray vs slice', () => {
  const buf = Buffer.from('hello world');
  const sub = buf.subarray(0, 5);
  const slc = buf.slice(0, 5);
  return sub.equals(slc) === true;
});

test('修改原 buffer 后 subarray 比较', () => {
  const buf = Buffer.from('hello');
  const sub = buf.subarray(0, 5);
  const copy = Buffer.from('hello');
  buf[0] = 72; // 'H'
  return sub.equals(copy) === false; // subarray 共享内存
});

test('修改原 buffer 后 slice 比较', () => {
  const buf = Buffer.from('hello');
  const slc = buf.slice(0, 5);
  const copy = Buffer.from('hello');
  buf[0] = 72; // 'H'
  return slc.equals(copy) === false; // slice 也共享内存（在 Node.js 中）
});

// concat 后的比较
test('concat - 单个 buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.concat([buf1]);
  return buf1.equals(buf2) === true;
});

test('concat - 多个 buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(' world');
  const concatenated = Buffer.concat([buf1, buf2]);
  const expected = Buffer.from('hello world');
  return concatenated.equals(expected) === true;
});

test('concat - 空数组', () => {
  const buf = Buffer.concat([]);
  const empty = Buffer.alloc(0);
  return buf.equals(empty) === true;
});

test('concat - 包含空 buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(0);
  const buf3 = Buffer.from('world');
  const concatenated = Buffer.concat([buf1, buf2, buf3]);
  const expected = Buffer.from('helloworld');
  return concatenated.equals(expected) === true;
});

// fill 操作
test('fill - 单字节', () => {
  const buf1 = Buffer.alloc(10);
  buf1.fill(0xAB);
  const buf2 = Buffer.alloc(10, 0xAB);
  return buf1.equals(buf2) === true;
});

test('fill - 字符串', () => {
  const buf1 = Buffer.alloc(10);
  buf1.fill('a');
  const buf2 = Buffer.alloc(10, 'a');
  return buf1.equals(buf2) === true;
});

test('fill - Buffer', () => {
  const fillBuf = Buffer.from([1, 2]);
  const buf1 = Buffer.alloc(6);
  buf1.fill(fillBuf);
  const buf2 = Buffer.from([1, 2, 1, 2, 1, 2]);
  return buf1.equals(buf2) === true;
});

test('fill - 部分填充', () => {
  const buf1 = Buffer.alloc(10, 0);
  buf1.fill(0xFF, 2, 8);
  const buf2 = Buffer.from([0, 0, 255, 255, 255, 255, 255, 255, 0, 0]);
  return buf1.equals(buf2) === true;
});

// copy 操作
test('copy - 完整复制', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(5);
  buf1.copy(buf2);
  return buf1.equals(buf2) === true;
});

test('copy - 部分复制', () => {
  const source = Buffer.from('hello world');
  const target = Buffer.alloc(5);
  source.copy(target, 0, 0, 5);
  const expected = Buffer.from('hello');
  return target.equals(expected) === true;
});

test('copy - 目标偏移', () => {
  const source = Buffer.from('ab');
  const target = Buffer.from('12345');
  source.copy(target, 2);
  const expected = Buffer.from('12ab5');
  return target.equals(expected) === true;
});

// write 操作
test('write - UTF-8 字符串', () => {
  const buf1 = Buffer.alloc(5);
  buf1.write('hello');
  const buf2 = Buffer.from('hello');
  return buf1.equals(buf2) === true;
});

test('write - 偏移写入', () => {
  const buf1 = Buffer.alloc(10, 0);
  buf1.write('hello', 2);
  const buf2 = Buffer.from([0, 0, 104, 101, 108, 108, 111, 0, 0, 0]);
  return buf1.equals(buf2) === true;
});

test('write - 长度限制', () => {
  const buf1 = Buffer.alloc(5);
  buf1.write('hello world', 0, 5);
  const buf2 = Buffer.from('hello');
  return buf1.equals(buf2) === true;
});

// 字节序测试
test('writeUInt16LE vs writeUInt16BE', () => {
  const buf1 = Buffer.alloc(2);
  const buf2 = Buffer.alloc(2);
  buf1.writeUInt16LE(0x1234);
  buf2.writeUInt16BE(0x1234);
  return buf1.equals(buf2) === false;
});

test('writeUInt16LE - 相同值', () => {
  const buf1 = Buffer.alloc(2);
  const buf2 = Buffer.alloc(2);
  buf1.writeUInt16LE(0x1234);
  buf2.writeUInt16LE(0x1234);
  return buf1.equals(buf2) === true;
});

test('writeInt32BE - 负数', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeInt32BE(-1);
  buf2.writeInt32BE(-1);
  return buf1.equals(buf2) === true;
});

test('writeFloatLE vs writeFloatBE', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeFloatLE(3.14);
  buf2.writeFloatBE(3.14);
  return buf1.equals(buf2) === false;
});

test('writeDoubleLE - 相同值', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeDoubleLE(3.141592653589793);
  buf2.writeDoubleLE(3.141592653589793);
  return buf1.equals(buf2) === true;
});

test('writeBigInt64LE - 大整数', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeBigInt64LE(123456789012345n);
  buf2.writeBigInt64LE(123456789012345n);
  return buf1.equals(buf2) === true;
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

