// buf.equals() - Edge Cases and Error Handling
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

// 错误处理测试
test('TypeError: null 参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: undefined 参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(undefined);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 字符串参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals('hello');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 数字参数', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.equals(123);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 对象参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals({ data: 'hello' });
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 数组参数', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.equals([1, 2, 3]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: boolean 参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: ArrayBuffer 参数（直接）', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const ab = new ArrayBuffer(3);
    buf.equals(ab);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Buffer slice 测试
test('Slice - 相同切片', () => {
  const buf = Buffer.from('hello world');
  const slice1 = buf.slice(0, 5);
  const slice2 = buf.slice(0, 5);
  return slice1.equals(slice2) === true;
});

test('Slice - 不同位置相同内容', () => {
  const buf = Buffer.from('hello hello');
  const slice1 = buf.slice(0, 5);
  const slice2 = buf.slice(6, 11);
  return slice1.equals(slice2) === true;
});

test('Slice - 完整 buffer vs slice', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello world');
  const slice = buf2.slice(0, 5);
  return buf1.equals(slice) === true;
});

test('Slice - 空 slice', () => {
  const buf = Buffer.from('hello');
  const slice1 = buf.slice(0, 0);
  const slice2 = Buffer.alloc(0);
  return slice1.equals(slice2) === true;
});

// Buffer 创建方式测试
test('alloc vs allocUnsafe - 填充后', () => {
  const buf1 = Buffer.alloc(5, 1);
  const buf2 = Buffer.allocUnsafe(5);
  buf2.fill(1);
  return buf1.equals(buf2) === true;
});

test('allocUnsafe - 写入相同数据', () => {
  const buf1 = Buffer.allocUnsafe(5);
  buf1.write('hello');
  const buf2 = Buffer.from('hello');
  return buf1.equals(buf2) === true;
});

test('from vs alloc - 相同内容', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.alloc(3);
  buf2[0] = 1;
  buf2[1] = 2;
  buf2[2] = 3;
  return buf1.equals(buf2) === true;
});

// 部分相同测试
test('前缀相同，后缀不同', () => {
  const buf1 = Buffer.from('hello world');
  const buf2 = Buffer.from('hello earth');
  return buf1.equals(buf2) === false;
});

test('第一个字节不同', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([2, 2, 3]);
  return buf1.equals(buf2) === false;
});

test('最后一个字节不同', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 4]);
  return buf1.equals(buf2) === false;
});

test('中间字节不同', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([1, 2, 9, 4, 5]);
  return buf1.equals(buf2) === false;
});

// 大小测试
test('大 Buffer - 1KB', () => {
  const size = 1024;
  const buf1 = Buffer.alloc(size, 0xAB);
  const buf2 = Buffer.alloc(size, 0xAB);
  return buf1.equals(buf2) === true;
});

test('大 Buffer - 1MB', () => {
  const size = 1024 * 1024;
  const buf1 = Buffer.alloc(size, 0xCD);
  const buf2 = Buffer.alloc(size, 0xCD);
  return buf1.equals(buf2) === true;
});

test('大 Buffer - 不同', () => {
  const size = 1024 * 1024;
  const buf1 = Buffer.alloc(size, 0xAB);
  const buf2 = Buffer.alloc(size, 0xCD);
  return buf1.equals(buf2) === false;
});

test('大 Buffer - 最后一个字节不同', () => {
  const size = 100000;
  const buf1 = Buffer.alloc(size, 0xAA);
  const buf2 = Buffer.alloc(size, 0xAA);
  buf2[size - 1] = 0xBB;
  return buf1.equals(buf2) === false;
});

// 连续比较
test('多次比较同一对 buffer', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  const r1 = buf1.equals(buf2);
  const r2 = buf1.equals(buf2);
  const r3 = buf1.equals(buf2);
  return r1 === true && r2 === true && r3 === true;
});

test('链式比较 A==B, B==C, A==C', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const buf3 = Buffer.from([1, 2, 3]);
  return buf1.equals(buf2) && buf2.equals(buf3) && buf1.equals(buf3);
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

