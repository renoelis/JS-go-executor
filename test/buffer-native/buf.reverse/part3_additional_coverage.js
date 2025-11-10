// buf.reverse() - Part 3: Additional Coverage Tests
// 补充测试：byteOffset、byteLength、函数参数传递等边缘场景

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

// Case 1: byteOffset 保持不变
test('reverse 后 byteOffset 保持不变', () => {
  const ab = new ArrayBuffer(16);
  const view = new Uint8Array(ab, 4, 8); // offset=4, length=8
  for (let i = 0; i < 8; i++) view[i] = i + 1;
  
  const buf = Buffer.from(view.buffer, view.byteOffset, view.byteLength);
  const beforeOffset = buf.byteOffset;
  buf.reverse();
  const afterOffset = buf.byteOffset;
  
  return beforeOffset === afterOffset && afterOffset === 4;
});

// Case 2: byteLength 保持不变
test('reverse 后 byteLength 保持不变', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const beforeLength = buf.byteLength;
  buf.reverse();
  const afterLength = buf.byteLength;
  
  return beforeLength === afterLength && afterLength === 5;
});

// Case 3: 作为函数参数传递并反转
test('Buffer 作为函数参数传递并反转', () => {
  function reverseBuffer(b) {
    b.reverse();
    return b;
  }
  
  const buf = Buffer.from([1, 2, 3, 4]);
  const result = reverseBuffer(buf);
  
  const expected = [4, 3, 2, 1];
  const actual = Array.from(result);
  return result === buf && JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 4: 在对象属性中的 Buffer 反转
test('对象属性中的 Buffer 反转', () => {
  const obj = {
    data: Buffer.from([5, 10, 15, 20])
  };
  
  obj.data.reverse();
  
  const expected = [20, 15, 10, 5];
  const actual = Array.from(obj.data);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 5: 数组中的多个 Buffer 反转
test('数组中的多个 Buffer 反转', () => {
  const buffers = [
    Buffer.from([1, 2]),
    Buffer.from([3, 4]),
    Buffer.from([5, 6])
  ];
  
  buffers.forEach(buf => buf.reverse());
  
  const expected = [[2, 1], [4, 3], [6, 5]];
  const actual = buffers.map(buf => Array.from(buf));
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 6: Buffer.concat 后立即反转
test('Buffer.concat 后立即反转', () => {
  const result = Buffer.concat([
    Buffer.from([1, 2]),
    Buffer.from([3, 4]),
    Buffer.from([5, 6])
  ]).reverse();
  
  const expected = [6, 5, 4, 3, 2, 1];
  const actual = Array.from(result);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 7: 非零 byteOffset 的 Buffer 反转
test('非零 byteOffset 的 Buffer 反转', () => {
  const ab = new ArrayBuffer(10);
  const fullView = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) fullView[i] = i;
  
  const buf = Buffer.from(ab, 2, 6); // offset=2, length=6
  buf.reverse(); // 应该只反转 [2,3,4,5,6,7] 这部分
  
  const expected = [7, 6, 5, 4, 3, 2];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 8: Buffer 包装器（通过 from）反转
test('Buffer.from(Buffer) 反转', () => {
  const original = Buffer.from([10, 20, 30]);
  const wrapped = Buffer.from(original);
  wrapped.reverse();
  
  // Buffer.from 创建副本，不应影响原始 Buffer
  const expectedWrapped = [30, 20, 10];
  const expectedOriginal = [10, 20, 30];
  const actualWrapped = Array.from(wrapped);
  const actualOriginal = Array.from(original);
  
  return JSON.stringify(actualWrapped) === JSON.stringify(expectedWrapped) &&
         JSON.stringify(actualOriginal) === JSON.stringify(expectedOriginal);
});

// Case 9: toString 后再反转
test('toString 查看后再反转（不影响反转）', () => {
  const buf = Buffer.from('hello');
  const str1 = buf.toString(); // "hello"
  buf.reverse();
  const str2 = buf.toString(); // "olleh"
  
  return str1 === 'hello' && str2 === 'olleh';
});

// Case 10: JSON.stringify 后再反转
test('JSON.stringify 查看后再反转', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json1 = JSON.stringify(buf);
  buf.reverse();
  const json2 = JSON.stringify(buf);
  
  const obj1 = JSON.parse(json1);
  const obj2 = JSON.parse(json2);
  
  return JSON.stringify(obj1.data) === JSON.stringify([1, 2, 3]) &&
         JSON.stringify(obj2.data) === JSON.stringify([3, 2, 1]);
});

// Case 11: 反转后 buffer 属性仍然有效
test('反转后 buffer 属性仍然有效', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const beforeBuffer = buf.buffer;
  buf.reverse();
  const afterBuffer = buf.buffer;
  
  // buffer 属性应该指向同一个 ArrayBuffer
  return beforeBuffer === afterBuffer && afterBuffer instanceof ArrayBuffer;
});

// Case 12: 反转长度为 3 的 Buffer（奇数中间元素）
test('长度为 3 的 Buffer 中间元素位置保持', () => {
  const buf = Buffer.from([10, 20, 30]);
  buf.reverse();
  
  // 中间元素 20 应该仍在中间
  const expected = [30, 20, 10];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected) && buf[1] === 20;
});

// Case 13: allocUnsafeSlow 创建的 Buffer
test('allocUnsafeSlow 创建的 Buffer 反转', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf[0] = 100;
  buf[1] = 200;
  buf[2] = 50;
  buf[3] = 150;
  buf.reverse();
  
  const expected = [150, 50, 200, 100];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 14: 反转包含 null 字节的 Buffer
test('反转包含 null 字节的 Buffer', () => {
  const buf = Buffer.from([1, 0, 2, 0, 3]);
  buf.reverse();
  
  const expected = [3, 0, 2, 0, 1];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 15: 二进制补码测试
test('反转包含负数表示的 Buffer（Int8Array 视角）', () => {
  const buf = Buffer.from([0xFF, 0x01, 0x7F, 0x80]); // -1, 1, 127, -128 in Int8
  buf.reverse();
  
  const expected = [0x80, 0x7F, 0x01, 0xFF];
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
