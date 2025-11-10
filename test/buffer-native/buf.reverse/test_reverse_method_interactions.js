// buf.reverse() - 与其他 Buffer 方法的交互测试
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

// Case 1: reverse 后 slice
test('reverse 后 slice', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  buf.reverse(); // [6, 5, 4, 3, 2, 1]
  const slice = buf.slice(1, 4); // [5, 4, 3]

  const expected = [5, 4, 3];
  const actual = Array.from(slice);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 2: slice 后 reverse 再 slice
test('slice 后 reverse 再 slice', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const slice1 = buf.slice(2, 6); // [3, 4, 5, 6]
  slice1.reverse(); // [6, 5, 4, 3]
  const slice2 = slice1.slice(1, 3); // [5, 4]

  const expectedSlice2 = [5, 4];
  const actualSlice2 = Array.from(slice2);
  return JSON.stringify(actualSlice2) === JSON.stringify(expectedSlice2);
});

// Case 3: reverse 后 copy
test('reverse 后 copy 到新 Buffer', () => {
  const src = Buffer.from([1, 2, 3, 4]);
  src.reverse(); // [4, 3, 2, 1]
  const dest = Buffer.alloc(4);
  src.copy(dest);

  const expected = [4, 3, 2, 1];
  const actual = Array.from(dest);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 4: copy 到中间位置后 reverse
test('copy 到中间位置后 reverse', () => {
  const src = Buffer.from([10, 20, 30]);
  const dest = Buffer.from([1, 2, 3, 4, 5, 6]);
  src.copy(dest, 2); // [1, 2, 10, 20, 30, 6]
  dest.reverse(); // [6, 30, 20, 10, 2, 1]

  const expected = [6, 30, 20, 10, 2, 1];
  const actual = Array.from(dest);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 5: reverse 后 fill
test('reverse 后 fill', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.reverse(); // [5, 4, 3, 2, 1]
  buf.fill(99, 1, 3); // [5, 99, 99, 2, 1]

  const expected = [5, 99, 99, 2, 1];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 6: fill 后 reverse
test('fill 后 reverse', () => {
  const buf = Buffer.alloc(6);
  buf.fill(10, 0, 3); // [10, 10, 10, 0, 0, 0]
  buf.fill(20, 3, 6); // [10, 10, 10, 20, 20, 20]
  buf.reverse(); // [20, 20, 20, 10, 10, 10]

  const expected = [20, 20, 20, 10, 10, 10];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 7: reverse 后 write
test('reverse 后 write 字符串', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  buf.reverse(); // [6, 5, 4, 3, 2, 1]
  buf.write('AB', 2, 'utf8'); // [6, 5, 65, 66, 2, 1] ('A'=65, 'B'=66)

  const expected = [6, 5, 65, 66, 2, 1];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 8: reverse 后 compare
test('reverse 后 compare 相等', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([3, 2, 1]);

  buf1.reverse(); // [3, 2, 1]

  const compareResult = buf1.compare(buf2);
  return compareResult === 0;
});

// Case 9: reverse 后 equals
test('reverse 后 equals', () => {
  const buf1 = Buffer.from([10, 20, 30]);
  const buf2 = Buffer.from([30, 20, 10]);

  buf1.reverse(); // [30, 20, 10]

  return buf1.equals(buf2);
});

// Case 10: reverse 后 indexOf
test('reverse 后 indexOf', () => {
  const buf = Buffer.from([1, 2, 3, 4, 3, 2, 1]);
  buf.reverse(); // [1, 2, 3, 4, 3, 2, 1] - 对称所以不变
  const index = buf.indexOf(3);

  return index === 2;
});

// Case 11: reverse 后 lastIndexOf
test('reverse 后 lastIndexOf', () => {
  const buf = Buffer.from([5, 4, 3, 2, 1]);
  buf.reverse(); // [1, 2, 3, 4, 5]
  const lastIndex = buf.lastIndexOf(3);

  return lastIndex === 2;
});

// Case 12: reverse 后 includes
test('reverse 后 includes', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  buf.reverse(); // [40, 30, 20, 10]
  const includesResult = buf.includes(30);

  return includesResult === true;
});

// Case 13: reverse 后 toString
test('reverse 后 toString', () => {
  const buf = Buffer.from('hello', 'utf8');
  buf.reverse(); // 字节反转
  const str = buf.toString('utf8');

  // 'hello' = [104, 101, 108, 108, 111]
  // reverse = [111, 108, 108, 101, 104]
  // toString = 'olleh'
  const expected = 'olleh';
  return str === expected;
});

// Case 14: reverse 后 toJSON
test('reverse 后 toJSON', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.reverse(); // [3, 2, 1]
  const json = buf.toJSON();

  const expected = { type: 'Buffer', data: [3, 2, 1] };
  return JSON.stringify(json) === JSON.stringify(expected);
});

// Case 15: reverse 后 swap16
test('reverse 后 swap16', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.reverse(); // [0x04, 0x03, 0x02, 0x01]
  buf.swap16(); // swap 每两个字节: [0x03, 0x04, 0x01, 0x02]

  const expected = [0x03, 0x04, 0x01, 0x02];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 16: reverse 后 swap32
test('reverse 后 swap32', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.reverse(); // [0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]
  buf.swap32(); // swap 每四个字节: [0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04]

  const expected = [0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 17: reverse 后 readInt16LE
test('reverse 后 readInt16LE', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.reverse(); // [0x04, 0x03, 0x02, 0x01]
  const value = buf.readInt16LE(0); // 读取前两个字节

  // [0x04, 0x03] 小端序读取 = 0x0304 = 772
  const expected = 0x0304;
  return value === expected;
});

// Case 18: reverse 后 writeInt32BE
test('reverse 后 writeInt32BE', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  buf.reverse(); // [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]
  buf.writeInt32BE(0x12345678, 2); // 从索引 2 开始写入

  const expected = [0xFF, 0xFF, 0x12, 0x34, 0x56, 0x78, 0xFF, 0xFF];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 19: Buffer.concat 包含 reversed buffer
test('Buffer.concat 包含 reversed buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  buf2.reverse(); // [6, 5, 4]

  const concatenated = Buffer.concat([buf1, buf2]);

  const expected = [1, 2, 3, 6, 5, 4];
  const actual = Array.from(concatenated);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 20: reverse 后再次 reverse 配合其他方法
test('reverse + fill + reverse 链式调用', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.reverse().fill(99, 1, 3).reverse();

  // 1. reverse: [5, 4, 3, 2, 1]
  // 2. fill(99, 1, 3): [5, 99, 99, 2, 1]
  // 3. reverse: [1, 2, 99, 99, 5]

  const expected = [1, 2, 99, 99, 5];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
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
