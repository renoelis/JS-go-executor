// buf.equals() - Buffer.from() 各种创建方式的测试
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

// Buffer.from(Buffer) - 从另一个Buffer创建
test('Buffer.from(Buffer) - 相同内容', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(buf1);
  return buf1.equals(buf2) === true;
});

test('Buffer.from(Buffer) - 修改原Buffer后', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(buf1);
  buf1[0] = 72; // 'H'
  return buf2.equals(Buffer.from('hello')) === true; // buf2不受影响
});

test('Buffer.from(Buffer) - 不同内容', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const buf3 = Buffer.from(buf1);
  return buf3.equals(buf2) === false;
});

test('Buffer.from(Buffer) - 空Buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.from(buf1);
  return buf1.equals(buf2) === true;
});

test('Buffer.from(Buffer) - slice后的Buffer', () => {
  const buf1 = Buffer.from('hello world');
  const slice = buf1.slice(0, 5);
  const buf2 = Buffer.from(slice);
  return buf2.equals(Buffer.from('hello')) === true;
});

test('Buffer.from(Buffer) - subarray后的Buffer', () => {
  const buf1 = Buffer.from('hello world');
  const subarr = buf1.subarray(0, 5);
  const buf2 = Buffer.from(subarr);
  return buf2.equals(Buffer.from('hello')) === true;
});

// Buffer.from(ArrayBuffer) - 从ArrayBuffer创建
test('Buffer.from(ArrayBuffer) - 相同内容', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view[0] = 104; // 'h'
  view[1] = 101; // 'e'
  view[2] = 108; // 'l'
  view[3] = 108; // 'l'
  view[4] = 111; // 'o'
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(ab);
  return buf1.equals(buf2) === true;
});

test('Buffer.from(ArrayBuffer) - 空ArrayBuffer', () => {
  const ab = new ArrayBuffer(0);
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.from(ab);
  return buf1.equals(buf2) === true;
});

test('Buffer.from(ArrayBuffer, offset) - 带偏移', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[5] = 104; // 'h'
  view[6] = 101; // 'e'
  view[7] = 108; // 'l'
  view[8] = 108; // 'l'
  view[9] = 111; // 'o'
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(ab, 5);
  return buf1.equals(buf2) === true;
});

test('Buffer.from(ArrayBuffer, offset, length) - 带偏移和长度', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[2] = 104; // 'h'
  view[3] = 101; // 'e'
  view[4] = 108; // 'l'
  view[5] = 108; // 'l'
  view[6] = 111; // 'o'
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(ab, 2, 5);
  return buf1.equals(buf2) === true;
});

test('Buffer.from(ArrayBuffer, offset, length) - 部分长度', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[2] = 104; // 'h'
  view[3] = 101; // 'e'
  view[4] = 108; // 'l'
  const buf1 = Buffer.from('hel');
  const buf2 = Buffer.from(ab, 2, 3);
  return buf1.equals(buf2) === true;
});

// Buffer.buffer 属性测试
test('Buffer.buffer - 底层ArrayBuffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(buf1.buffer);
  // 注意：buf1.buffer可能包含额外的内存池数据
  // 所以只比较buf1的部分
  const buf3 = Buffer.from(buf1.buffer, buf1.byteOffset, buf1.byteLength);
  return buf1.equals(buf3) === true;
});

test('Buffer.buffer - 修改底层ArrayBuffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(buf1.buffer, buf1.byteOffset, buf1.byteLength);
  // 通过buf2修改底层数据
  buf2[0] = 72; // 'H'
  // buf1应该也受影响（如果共享内存）
  return buf1.equals(buf2) === true;
});

// Buffer.byteOffset 属性测试
test('Buffer.byteOffset - 从ArrayBuffer偏移创建', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[5] = 1;
  view[6] = 2;
  view[7] = 3;
  const buf = Buffer.from(ab, 5, 3);
  return buf.byteOffset === 5;
});

test('Buffer.byteOffset - 直接创建的Buffer', () => {
  const buf = Buffer.from('hello');
  // 直接创建的Buffer的byteOffset可能是0或非0（取决于内存池）
  return typeof buf.byteOffset === 'number';
});

// Buffer.byteLength 属性测试
test('Buffer.byteLength - 与length一致', () => {
  const buf = Buffer.from('hello');
  return buf.byteLength === buf.length && buf.byteLength === 5;
});

test('Buffer.byteLength - 空Buffer', () => {
  const buf = Buffer.alloc(0);
  return buf.byteLength === 0 && buf.length === 0;
});

test('Buffer.byteLength - slice后的Buffer', () => {
  const buf1 = Buffer.from('hello world');
  const slice = buf1.slice(0, 5);
  return slice.byteLength === 5 && slice.length === 5;
});

// Buffer.from(Uint8Array) - 从Uint8Array创建
test('Buffer.from(Uint8Array) - 相同内容', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from(arr);
  return buf1.equals(buf2) === true;
});

test('Buffer.from(Uint8Array) - 修改原Uint8Array后', () => {
  const arr = new Uint8Array([1, 2, 3]);
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from(arr);
  arr[0] = 99;
  // buf2应该不受影响（Buffer.from会复制数据）
  return buf2.equals(buf1) === true;
});

test('Buffer.from(Uint8Array) - 带byteOffset的Uint8Array', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab, 2, 3);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from(view);
  return buf1.equals(buf2) === true;
});

// Buffer.from(Array) - 从数组创建
test('Buffer.from(Array) - 相同内容', () => {
  const arr = [1, 2, 3, 4, 5];
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from(arr);
  return buf1.equals(buf2) === true;
});

test('Buffer.from(Array) - 修改原数组后', () => {
  const arr = [1, 2, 3];
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from(arr);
  arr[0] = 99;
  // buf2应该不受影响
  return buf2.equals(buf1) === true;
});

// Buffer.from(string, encoding) - 不同编码
test('Buffer.from(string, encoding) - utf8', () => {
  const buf1 = Buffer.from('hello', 'utf8');
  const buf2 = Buffer.from('hello');
  return buf1.equals(buf2) === true;
});

test('Buffer.from(string, encoding) - hex', () => {
  const buf1 = Buffer.from('68656c6c6f', 'hex'); // 'hello' 的 hex 编码
  const buf2 = Buffer.from('hello');
  return buf1.equals(buf2) === true;
});

test('Buffer.from(string, encoding) - base64', () => {
  const buf1 = Buffer.from('SGVsbG8=', 'base64');
  const buf2 = Buffer.from('Hello');
  return buf1.equals(buf2) === true;
});

// Buffer继承关系测试
test('Buffer instanceof Uint8Array - 继承关系', () => {
  const buf = Buffer.from('hello');
  // Node.js中Buffer继承自Uint8Array
  return buf instanceof Uint8Array === true;
});

test('Buffer继承Uint8Array - equals方法可用', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  // Buffer继承自Uint8Array，所以应该有Uint8Array的方法
  return buf1.equals(buf2) === true;
});

// Buffer.from() 边界情况
test('Buffer.from() - 无参数（应该抛出错误）', () => {
  try {
    Buffer.from();
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('Buffer.from(null) - null参数（应该抛出错误）', () => {
  try {
    Buffer.from(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('Buffer.from(undefined) - undefined参数（应该抛出错误）', () => {
  try {
    Buffer.from(undefined);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Buffer.from() 与 equals 的组合测试
test('Buffer.from(Buffer).equals(原Buffer)', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(buf1);
  return buf1.equals(buf2) === true && buf2.equals(buf1) === true;
});

test('Buffer.from(ArrayBuffer).equals(Buffer.from(string))', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view[0] = 104; // 'h'
  view[1] = 101; // 'e'
  view[2] = 108; // 'l'
  view[3] = 108; // 'l'
  view[4] = 111; // 'o'
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.from('hello');
  return buf1.equals(buf2) === true;
});

test('Buffer.from(Uint8Array).equals(Buffer.from(Array))', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const buf1 = Buffer.from(arr);
  const buf2 = Buffer.from([1, 2, 3, 4, 5]);
  return buf1.equals(buf2) === true;
});

// Buffer.from() 与 slice/subarray 的组合
test('Buffer.from(Buffer.slice()).equals(原Buffer.slice())', () => {
  const buf1 = Buffer.from('hello world');
  const slice1 = buf1.slice(0, 5);
  const buf2 = Buffer.from(slice1);
  const slice2 = buf1.slice(0, 5);
  return buf2.equals(slice2) === true;
});

test('Buffer.from(Buffer.subarray()).equals(原Buffer.subarray())', () => {
  const buf1 = Buffer.from('hello world');
  const subarr1 = buf1.subarray(0, 5);
  const buf2 = Buffer.from(subarr1);
  const subarr2 = buf1.subarray(0, 5);
  return buf2.equals(subarr2) === true;
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

