// buffer.compare() - Buffer分配方式与内部池测试
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

test('allocUnsafe vs allocUnsafe相同内容', () => {
  const buf1 = Buffer.allocUnsafe(3);
  buf1[0] = 1; buf1[1] = 2; buf1[2] = 3;
  const buf2 = Buffer.allocUnsafe(3);
  buf2[0] = 1; buf2[1] = 2; buf2[2] = 3;
  const result = buf1.compare(buf2);
  return result === 0;
});

test('allocUnsafeSlow vs allocUnsafeSlow相同内容', () => {
  const buf1 = Buffer.allocUnsafeSlow(3);
  buf1[0] = 1; buf1[1] = 2; buf1[2] = 3;
  const buf2 = Buffer.allocUnsafeSlow(3);
  buf2[0] = 1; buf2[1] = 2; buf2[2] = 3;
  const result = buf1.compare(buf2);
  return result === 0;
});

test('allocUnsafe vs allocUnsafeSlow相同内容', () => {
  const buf1 = Buffer.allocUnsafe(3);
  buf1[0] = 1; buf1[1] = 2; buf1[2] = 3;
  const buf2 = Buffer.allocUnsafeSlow(3);
  buf2[0] = 1; buf2[1] = 2; buf2[2] = 3;
  const result = buf1.compare(buf2);
  return result === 0;
});

test('alloc vs allocUnsafe相同内容', () => {
  const buf1 = Buffer.alloc(3);
  buf1[0] = 1; buf1[1] = 2; buf1[2] = 3;
  const buf2 = Buffer.allocUnsafe(3);
  buf2[0] = 1; buf2[1] = 2; buf2[2] = 3;
  const result = buf1.compare(buf2);
  return result === 0;
});

test('alloc vs allocUnsafeSlow相同内容', () => {
  const buf1 = Buffer.alloc(3);
  buf1[0] = 1; buf1[1] = 2; buf1[2] = 3;
  const buf2 = Buffer.allocUnsafeSlow(3);
  buf2[0] = 1; buf2[1] = 2; buf2[2] = 3;
  const result = buf1.compare(buf2);
  return result === 0;
});

test('from vs allocUnsafe相同内容', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.allocUnsafe(3);
  buf2[0] = 1; buf2[1] = 2; buf2[2] = 3;
  const result = buf1.compare(buf2);
  return result === 0;
});

test('from vs allocUnsafeSlow相同内容', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.allocUnsafeSlow(3);
  buf2[0] = 1; buf2[1] = 2; buf2[2] = 3;
  const result = buf1.compare(buf2);
  return result === 0;
});

test('小buffer(池内)比较一致性', () => {
  const size = 4095; // 小于 poolSize (8192)
  const buf1 = Buffer.allocUnsafe(size);
  const buf2 = Buffer.allocUnsafe(size);
  buf1.fill(0x42);
  buf2.fill(0x42);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('大buffer(池外)比较一致性', () => {
  const size = 8193; // 大于 poolSize (8192)
  const buf1 = Buffer.allocUnsafe(size);
  const buf2 = Buffer.allocUnsafe(size);
  buf1.fill(0x42);
  buf2.fill(0x42);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('allocUnsafeSlow总是池外分配', () => {
  const size = 10;
  const buf1 = Buffer.allocUnsafeSlow(size);
  const buf2 = Buffer.allocUnsafeSlow(size);
  buf1.fill(0x42);
  buf2.fill(0x42);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('alloc使用fill值初始化', () => {
  const buf1 = Buffer.alloc(5, 0xFF);
  const buf2 = Buffer.allocUnsafe(5);
  buf2.fill(0xFF);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('alloc使用字符串fill', () => {
  const buf1 = Buffer.alloc(10, 'a');
  const buf2 = Buffer.from('aaaaaaaaaa');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('alloc使用buffer fill', () => {
  const fillBuf = Buffer.from([1, 2]);
  const buf1 = Buffer.alloc(6, fillBuf);
  const buf2 = Buffer.from([1, 2, 1, 2, 1, 2]);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('alloc不同编码的fill', () => {
  const buf1 = Buffer.alloc(10, 'hello', 'utf8');
  const buf2 = Buffer.alloc(10, 'hello', 'utf8');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('concat创建的buffer', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const concat = Buffer.concat([buf1, buf2]);
  const manual = Buffer.from([1, 2, 3, 4]);
  const result = concat.compare(manual);
  return result === 0;
});

test('concat指定总长度', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const concat = Buffer.concat([buf1, buf2], 10);
  return concat.length === 10 && concat[4] === 0;
});

test('concat空数组', () => {
  const concat = Buffer.concat([]);
  const empty = Buffer.alloc(0);
  const result = concat.compare(empty);
  return result === 0;
});

test('from ArrayBuffer', () => {
  const ab = new ArrayBuffer(3);
  const view = new Uint8Array(ab);
  view[0] = 1; view[1] = 2; view[2] = 3;
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('from ArrayBuffer with offset', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[5] = 1; view[6] = 2; view[7] = 3;
  const buf1 = Buffer.from(ab, 5, 3);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('from string不同编码', () => {
  const buf1 = Buffer.from('hello', 'utf8');
  const buf2 = Buffer.from('hello', 'ascii');
  const result = buf1.compare(buf2);
  return result === 0; // ASCII兼容UTF8
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
