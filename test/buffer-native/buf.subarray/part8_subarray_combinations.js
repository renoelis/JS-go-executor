// buf.subarray() - Parameter Combinations & Cross Scenarios
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, passed: pass, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, status: '❌', error: e.message, stack: e.stack });
  }
}

// 参数组合场景
test('start 为负数小数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-2.7);
  // -2.7 截断为 -2
  if (sub.length !== 2) return false;
  if (sub[0] !== 4 || sub[1] !== 5) return false;
  console.log('✅ 负数小数截断正确');
  return true;
});

test('end 为负数小数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0, -1.3);
  // -1.3 截断为 -1
  if (sub.length !== 4) return false;
  if (sub[3] !== 4) return false;
  console.log('✅ end 负数小数截断正确');
  return true;
});

test('start 和 end 都是小数', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const sub = buf.subarray(2.9, 7.1);
  // 2.9 -> 2, 7.1 -> 7
  if (sub.length !== 5) return false;
  if (sub[0] !== 2 || sub[4] !== 6) return false;
  console.log('✅ 双小数截断正确');
  return true;
});

test('start 为负小数，end 为正小数', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const sub = buf.subarray(-5.8, 8.2);
  // -5.8 -> -5 (从末尾数第 5 个，即索引 5), 8.2 -> 8
  if (sub.length !== 3) return false;
  if (sub[0] !== 5) return false;
  console.log('✅ 负小数到正小数正确');
  return true;
});

// 不同 Buffer 编码的组合
test('latin1 编码 Buffer 的 subarray', () => {
  const buf = Buffer.from('café', 'latin1');
  const sub = buf.subarray(0, 3);
  if (sub.toString('latin1') !== 'caf') return false;
  console.log('✅ latin1 编码正确');
  return true;
});

test('ascii 编码 Buffer 的 subarray', () => {
  const buf = Buffer.from('hello', 'ascii');
  const sub = buf.subarray(1, 4);
  if (sub.toString('ascii') !== 'ell') return false;
  console.log('✅ ascii 编码正确');
  return true;
});

test('utf16le 编码 Buffer 的 subarray', () => {
  const buf = Buffer.from('hello', 'utf16le');
  const sub = buf.subarray(2, 8);
  if (sub.toString('utf16le') !== 'ell') return false;
  console.log('✅ utf16le 编码正确');
  return true;
});

test('binary 编码 Buffer 的 subarray', () => {
  const buf = Buffer.from('hello', 'binary');
  const sub = buf.subarray(1, 4);
  if (sub.toString('binary') !== 'ell') return false;
  console.log('✅ binary 编码正确');
  return true;
});

// Buffer 方法链式调用
test('subarray 后调用 toString', () => {
  const buf = Buffer.from('hello world');
  const result = buf.subarray(0, 5).toString();
  if (result !== 'hello') return false;
  console.log('✅ subarray 后 toString 正确');
  return true;
});

test('subarray 后调用 toJSON', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const json = buf.subarray(1, 4).toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 2 || json.data[2] !== 4) return false;
  console.log('✅ subarray 后 toJSON 正确');
  return true;
});

test('subarray 后调用 slice', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const sub1 = buf.subarray(2, 7);
  const sub2 = sub1.slice(1, 4);
  if (sub2.length !== 3) return false;
  if (sub2[0] !== 4 || sub2[2] !== 6) return false;
  console.log('✅ subarray 后 slice 正确');
  return true;
});

test('subarray 后调用 subarray', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const sub1 = buf.subarray(2, 7);
  const sub2 = sub1.subarray(1, 4);
  if (sub2.length !== 3) return false;
  if (sub2[0] !== 4 || sub2[2] !== 6) return false;
  sub2[1] = 99;
  if (buf[4] !== 99) return false;
  console.log('✅ subarray 后 subarray 共享内存');
  return true;
});

test('subarray 后调用 indexOf', () => {
  const buf = Buffer.from('hello world');
  const sub = buf.subarray(6);
  const idx = sub.indexOf('o');
  if (idx !== 1) return false;
  console.log('✅ subarray 后 indexOf 正确');
  return true;
});

test('subarray 后调用 includes', () => {
  const buf = Buffer.from('hello world');
  const sub = buf.subarray(0, 5);
  if (!sub.includes('ell')) return false;
  if (sub.includes('world')) return false;
  console.log('✅ subarray 后 includes 正确');
  return true;
});

test('subarray 后调用 compare', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([3, 4]);
  const sub = buf1.subarray(2, 4);
  if (sub.compare(buf2) !== 0) return false;
  console.log('✅ subarray 后 compare 正确');
  return true;
});

test('subarray 后调用 equals', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([2, 3, 4]);
  const sub = buf1.subarray(1, 4);
  if (!sub.equals(buf2)) return false;
  console.log('✅ subarray 后 equals 正确');
  return true;
});

// 修改操作的组合
test('subarray 后 write 方法', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(3, 8);
  sub.write('hello');
  if (buf.toString('utf8', 3, 8) !== 'hello') return false;
  console.log('✅ subarray 后 write 正确');
  return true;
});

test('subarray 后 writeInt8', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(5, 10);
  sub.writeInt8(127, 0);
  if (buf.readInt8(5) !== 127) return false;
  console.log('✅ subarray 后 writeInt8 正确');
  return true;
});

test('subarray 后 writeUInt32LE', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(2, 8);
  sub.writeUInt32LE(0x12345678, 0);
  if (buf.readUInt32LE(2) !== 0x12345678) return false;
  console.log('✅ subarray 后 writeUInt32LE 正确');
  return true;
});

test('subarray 后 readUInt16BE', () => {
  const buf = Buffer.from([0, 0, 0x12, 0x34, 0, 0]);
  const sub = buf.subarray(2, 6);
  const val = sub.readUInt16BE(0);
  if (val !== 0x1234) return false;
  console.log('✅ subarray 后 readUInt16BE 正确');
  return true;
});

// 特殊输入组合
test('start 为字符串 "0"', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('0', '3');
  if (sub.length !== 3) return false;
  if (sub[0] !== 1) return false;
  console.log('✅ 字符串 "0" 转换正确');
  return true;
});

test('start 为字符串 "-1"', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('-1');
  if (sub.length !== 1) return false;
  if (sub[0] !== 5) return false;
  console.log('✅ 字符串 "-1" 转换正确');
  return true;
});

test('end 为字符串 "-0"', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('0', '-0');
  // "-0" 转为 -0，等于 0，从末尾算是 5
  if (sub.length !== 0) return false;
  console.log('✅ 字符串 "-0" 转换正确');
  return true;
});

test('参数为数组对象混合', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const start = [2];
  const end = { valueOf: () => 4 };
  const sub = buf.subarray(start, end);
  if (sub.length !== 2) return false;
  if (sub[0] !== 3) return false;
  console.log('✅ 数组对象混合转换正确');
  return true;
});

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

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
