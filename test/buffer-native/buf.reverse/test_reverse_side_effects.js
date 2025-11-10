// buf.reverse() - 副作用与内存安全测试
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

// Case 1: 验证原地修改 - 不创建新 Buffer
test('验证原地修改 - 返回同一个引用', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const originalRef = buf;
  const result = buf.reverse();
  return result === originalRef && result === buf;
});

// Case 2: slice 后的 Buffer 反转是否影响父 Buffer
test('slice 后的 Buffer 反转影响父 Buffer（共享内存）', () => {
  const parent = Buffer.from([1, 2, 3, 4, 5, 6]);
  const slice = parent.slice(1, 4);
  slice.reverse();

  const expectedSlice = [4, 3, 2];
  const actualSlice = Array.from(slice);
  const sliceCorrect = JSON.stringify(actualSlice) === JSON.stringify(expectedSlice);

  const expectedParent = [1, 4, 3, 2, 5, 6];
  const actualParent = Array.from(parent);
  const parentAffected = JSON.stringify(actualParent) === JSON.stringify(expectedParent);

  return sliceCorrect && parentAffected;
});

// Case 3: subarray 后的 Buffer 反转是否影响父 Buffer
test('subarray 后的 Buffer 反转影响父 Buffer（共享内存）', () => {
  const parent = Buffer.from([10, 20, 30, 40, 50]);
  const sub = parent.subarray(1, 4);
  sub.reverse();

  const expectedSub = [40, 30, 20];
  const actualSub = Array.from(sub);
  const subCorrect = JSON.stringify(actualSub) === JSON.stringify(expectedSub);

  const expectedParent = [10, 40, 30, 20, 50];
  const actualParent = Array.from(parent);
  const parentAffected = JSON.stringify(actualParent) === JSON.stringify(expectedParent);

  return subCorrect && parentAffected;
});

// Case 4: Buffer.from 创建的副本不受影响
test('Buffer.from 创建的副本反转不影响原始 Buffer', () => {
  const original = Buffer.from([1, 2, 3, 4]);
  const copy = Buffer.from(original);
  copy.reverse();

  const expectedCopy = [4, 3, 2, 1];
  const actualCopy = Array.from(copy);
  const copyCorrect = JSON.stringify(actualCopy) === JSON.stringify(expectedCopy);

  const expectedOriginal = [1, 2, 3, 4];
  const actualOriginal = Array.from(original);
  const originalUnchanged = JSON.stringify(actualOriginal) === JSON.stringify(expectedOriginal);

  return copyCorrect && originalUnchanged;
});

// Case 5: 同一底层 ArrayBuffer 的多个视图
test('同一 ArrayBuffer 的多个 Buffer 视图共享修改', () => {
  const ab = new ArrayBuffer(4);
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.from(ab);

  buf1[0] = 1;
  buf1[1] = 2;
  buf1[2] = 3;
  buf1[3] = 4;

  buf1.reverse();

  const expected = [4, 3, 2, 1];
  const actual1 = Array.from(buf1);
  const actual2 = Array.from(buf2);

  return JSON.stringify(actual1) === JSON.stringify(expected) &&
         JSON.stringify(actual2) === JSON.stringify(expected);
});

// Case 6: 反转后原始引用仍有效
test('反转后所有引用指向同一个修改后的 Buffer', () => {
  const buf = Buffer.from([10, 20, 30]);
  const ref1 = buf;
  const ref2 = buf;

  buf.reverse();

  const expected = [30, 20, 10];
  const actual1 = Array.from(ref1);
  const actual2 = Array.from(ref2);
  const actualBuf = Array.from(buf);

  return JSON.stringify(actual1) === JSON.stringify(expected) &&
         JSON.stringify(actual2) === JSON.stringify(expected) &&
         JSON.stringify(actualBuf) === JSON.stringify(expected) &&
         ref1 === buf && ref2 === buf;
});

// Case 7: 嵌套 slice 的反转传播
test('嵌套 slice 的反转传播到所有父 Buffer', () => {
  const original = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const slice1 = original.slice(2, 6);
  const slice2 = slice1.slice(1, 3);

  slice2.reverse();

  const expectedSlice2 = [5, 4];
  const actualSlice2 = Array.from(slice2);

  const expectedSlice1 = [3, 5, 4, 6];
  const actualSlice1 = Array.from(slice1);

  const expectedOriginal = [1, 2, 3, 5, 4, 6, 7, 8];
  const actualOriginal = Array.from(original);

  return JSON.stringify(actualSlice2) === JSON.stringify(expectedSlice2) &&
         JSON.stringify(actualSlice1) === JSON.stringify(expectedSlice1) &&
         JSON.stringify(actualOriginal) === JSON.stringify(expectedOriginal);
});

// Case 8: 反转不影响 Buffer 的 length 和 byteLength
test('反转不改变 Buffer 的 length 和 byteLength', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const lengthBefore = buf.length;
  const byteLengthBefore = buf.byteLength;

  buf.reverse();

  const lengthAfter = buf.length;
  const byteLengthAfter = buf.byteLength;

  return lengthBefore === 5 && lengthAfter === 5 &&
         byteLengthBefore === 5 && byteLengthAfter === 5;
});

// Case 9: 反转不影响 Buffer 的 byteOffset
test('反转不改变 Buffer 的 byteOffset', () => {
  const parent = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) parent[i] = i;
  const slice = parent.subarray(2, 6);
  const byteOffsetBefore = slice.byteOffset;

  slice.reverse();

  const byteOffsetAfter = slice.byteOffset;

  return byteOffsetBefore === 2 && byteOffsetAfter === 2;
});

// Case 10: 反转不影响底层 ArrayBuffer
test('反转后 Buffer.buffer 仍指向同一个 ArrayBuffer', () => {
  const ab = new ArrayBuffer(6);
  const buf = Buffer.from(ab);
  buf[0] = 10;
  buf[1] = 20;
  buf[2] = 30;
  buf[3] = 40;
  buf[4] = 50;
  buf[5] = 60;

  const bufferBefore = buf.buffer;
  buf.reverse();
  const bufferAfter = buf.buffer;

  return bufferBefore === ab && bufferAfter === ab && bufferBefore === bufferAfter;
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
