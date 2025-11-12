// buffer.compare() - 复杂组合场景与边界交叉终极测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    if (pass) {
      console.log('✅', name);
    } else {
      console.log('❌', name);
    }
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log('❌', name, '-', e.message);
  }
}

test('targetStart=length时返回空范围比较', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 3); // buf2从索引3开始(空)
  return result > 0; // buf1全部 > buf2空范围
});

test('sourceStart=length时返回空范围比较', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 0, 3, 3); // buf1从索引3开始(空)
  return result < 0; // buf2全部 > buf1空范围
});

test('targetEnd=length时完整比较', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 0, 3); // buf2[0..3]
  return result === 0;
});

test('sourceEnd=length时完整比较', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 0, 3, 0, 3); // buf1[0..3] vs buf2[0..3]
  return result === 0;
});

test('空Uint8Array比较', () => {
  const buf = Buffer.alloc(0);
  const uint8 = new Uint8Array(0);
  const result = buf.compare(uint8);
  return result === 0;
});

test('Buffer vs Uint8Array 有范围参数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const uint8 = new Uint8Array([0, 2, 3, 4, 0]);
  const result = buf.compare(uint8, 1, 4, 1, 4);
  return result === 0;
});

test('allocUnsafeSlow与范围参数组合', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  buf1.fill(0x42);
  const buf2 = Buffer.alloc(10, 0x42);
  const result = buf1.compare(buf2, 2, 8, 2, 8);
  return result === 0;
});

test('from + slice + compare组合', () => {
  const original = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]);
  const slice1 = original.slice(2, 5); // [2,3,4]
  const slice2 = original.slice(3, 6); // [3,4,5]
  const result = slice1.compare(slice2);
  return result < 0;
});

test('subarray + compare组合', () => {
  const original = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]);
  const sub1 = original.subarray(2, 5); // [2,3,4]
  const sub2 = original.subarray(2, 5); // [2,3,4]
  const result = sub1.compare(sub2);
  return result === 0;
});

test('concat + compare + 范围参数', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const concat = Buffer.concat([buf1, buf2]);
  const manual = Buffer.from([0, 1, 2, 3, 4, 5]);
  const result = concat.compare(manual, 1, 5); // manual[1..5] = [1,2,3,4]
  return result === 0;
});

test('静态compare不支持范围参数', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  // 静态方法只接受2个buffer参数,额外参数会被忽略
  const result = Buffer.compare(buf1, buf2, 0, 3);
  return result === 0; // 额外参数被忽略,仍然比较整个buffer
});

test('超长字符串编码比较', () => {
  const longStr = 'a'.repeat(10000);
  const buf1 = Buffer.from(longStr, 'utf8');
  const buf2 = Buffer.from(longStr, 'utf8');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('混合中英文UTF8字符串', () => {
  const str = 'Hello世界Test测试';
  const buf1 = Buffer.from(str, 'utf8');
  const buf2 = Buffer.from(str, 'utf8');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('Base64编码后的二进制数据', () => {
  const data = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const base64 = data.toString('base64');
  const decoded = Buffer.from(base64, 'base64');
  const result = data.compare(decoded);
  return result === 0;
});

test('Hex编码往返', () => {
  const data = Buffer.from([255, 254, 253, 252]);
  const hex = data.toString('hex');
  const decoded = Buffer.from(hex, 'hex');
  const result = data.compare(decoded);
  return result === 0;
});

test('零长度范围与非零长度范围', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 1, 1, 0, 3); // buf2[1..1](空) vs buf1[0..3]
  return result > 0;
});

test('两个零长度范围比较', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result = buf1.compare(buf2, 1, 1, 2, 2); // 都是空范围
  return result === 0;
});

test('byteOffset不同的Uint8Array', () => {
  const ab = new ArrayBuffer(20);
  const uint1 = new Uint8Array(ab, 5, 5);
  const uint2 = new Uint8Array(ab, 10, 5);
  uint1.fill(0x42);
  uint2.fill(0x42);
  const buf1 = Buffer.from(uint1.buffer, uint1.byteOffset, uint1.length);
  const buf2 = Buffer.from(uint2.buffer, uint2.byteOffset, uint2.length);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('修改共享内存后立即比较', () => {
  const original = Buffer.from([1, 2, 3, 4, 5]);
  const slice = original.slice(1, 4);
  slice[0] = 99; // 修改 original[1]
  const expected = Buffer.from([99, 3, 4]);
  const result = slice.compare(expected);
  return result === 0;
});

test('连续多次比较结果一致性', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const results = [];
  for (let i = 0; i < 100; i++) {
    results.push(buf1.compare(buf2));
  }
  return results.every(r => r === 0);
});

test('交替比较大小关系', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([2, 3, 4]);
  const result1 = buf1.compare(buf2);
  const result2 = buf2.compare(buf1);
  return result1 < 0 && result2 > 0 && result1 === -result2;
});

test('三路比较传递性', () => {
  const bufA = Buffer.from([1, 2]);
  const bufB = Buffer.from([2, 3]);
  const bufC = Buffer.from([3, 4]);
  const ab = bufA.compare(bufB); // A < B
  const bc = bufB.compare(bufC); // B < C
  const ac = bufA.compare(bufC); // A < C
  return ab < 0 && bc < 0 && ac < 0;
});

test('equals与compare一致性检查', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const buf3 = Buffer.from([1, 2, 4]);
  return (buf1.compare(buf2) === 0) === buf1.equals(buf2) &&
         (buf1.compare(buf3) !== 0) === !buf1.equals(buf3);
});

test('sort后验证compare的传递性', () => {
  const buffers = [
    Buffer.from([5]),
    Buffer.from([2]),
    Buffer.from([8]),
    Buffer.from([1]),
    Buffer.from([9]),
    Buffer.from([3])
  ];
  buffers.sort(Buffer.compare);

  // 验证排序后的顺序
  for (let i = 1; i < buffers.length; i++) {
    if (buffers[i].compare(buffers[i-1]) < 0) {
      return false;
    }
  }
  return true;
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
