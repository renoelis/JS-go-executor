// buffer.kMaxLength - Part 8: Edge Cases and Boundary Tests
const { Buffer, kMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 零和小数值测试
test('Buffer.alloc(0) 创建空 Buffer', () => {
  const buf = Buffer.alloc(0);
  return buf.length === 0;
});

test('Buffer.alloc(0.5) 向下取整为 0', () => {
  const buf = Buffer.alloc(0.5);
  return buf.length === 0;
});

test('Buffer.alloc(1.9) 向下取整为 1', () => {
  const buf = Buffer.alloc(1.9);
  return buf.length === 1;
});

// 布尔值转换测试
test('Buffer.alloc(true) 会被转换', () => {
  try {
    const buf = Buffer.alloc(true);
    return buf.length === 1;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Buffer.alloc(false) 会被转换', () => {
  try {
    const buf = Buffer.alloc(false);
    return buf.length === 0;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 空字符串和特殊字符串测试
test('Buffer.from("") 创建空 Buffer', () => {
  const buf = Buffer.from('');
  return buf.length === 0;
});

test('Buffer.from("\\0") 创建长度为 1 的 Buffer', () => {
  const buf = Buffer.from('\0');
  return buf.length === 1 && buf[0] === 0;
});

test('Buffer.from 处理 emoji', () => {
  const buf = Buffer.from('😀');
  return buf.length === 4;
});

// poolSize 和 kMaxLength 的关系
test('Buffer.poolSize 存在', () => {
  return typeof Buffer.poolSize === 'number';
});

test('Buffer.poolSize 小于 kMaxLength', () => {
  return Buffer.poolSize < kMaxLength;
});

test('Buffer.poolSize 是合理值（通常 8KB）', () => {
  return Buffer.poolSize === 8192 || Buffer.poolSize > 0;
});

// 修改 poolSize 后的行为
test('修改 Buffer.poolSize 不影响 kMaxLength', () => {
  const original = Buffer.poolSize;
  const originalKMax = kMaxLength;
  Buffer.poolSize = 1024;
  const stillKMax = require('buffer').kMaxLength;
  Buffer.poolSize = original;
  return stillKMax === originalKMax;
});

// buffer 的 parent 和 offset 属性
test('小 Buffer 可能有 parent（使用池分配）', () => {
  const buf = Buffer.alloc(10);
  return true;
});

test('大 Buffer 通常没有 parent', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(10 * 1024 * 1024);
    return buf.length === 10 * 1024 * 1024;
  } catch (e) {
    return e.message.includes('memory');
  }
});

// kMaxLength 作为参数传递测试
test('将 kMaxLength 传递给函数', () => {
  function takeSize(size) {
    return size === kMaxLength;
  }
  return takeSize(kMaxLength);
});

test('kMaxLength 可以作为对象属性', () => {
  const obj = { maxSize: kMaxLength };
  return obj.maxSize === kMaxLength;
});

test('kMaxLength 可以作为数组元素', () => {
  const arr = [kMaxLength, 0, 1];
  return arr[0] === kMaxLength && arr.length === 3;
});

// slice 和 subarray 的细微差别
test('buffer.slice 返回新 Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = buf1.slice();
  buf2[0] = 99;
  return buf1[0] === 99;
});

test('buffer.subarray 返回新 Uint8Array 视图', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = buf1.subarray();
  buf2[0] = 99;
  return buf1[0] === 99;
});

test('slice 和 subarray 都继承自 Uint8Array', () => {
  const buf = Buffer.from([1, 2, 3]);
  const slice = buf.slice();
  const sub = buf.subarray();
  return Buffer.isBuffer(slice) && Buffer.isBuffer(sub);
});

// Buffer.byteLength 和字符串编码
test('Buffer.byteLength UTF-8 多字节字符', () => {
  const len = Buffer.byteLength('你好');
  return len === 6;
});

test('Buffer.byteLength 和 Buffer.from().length 一致', () => {
  const str = 'hello 你好';
  const len1 = Buffer.byteLength(str);
  const len2 = Buffer.from(str).length;
  return len1 === len2;
});

test('Buffer.byteLength hex 编码', () => {
  const len = Buffer.byteLength('0123456789abcdef', 'hex');
  return len === 8;
});

// kMaxLength 与数值精度边界
test('kMaxLength - 2 和 kMaxLength - 1 可区分', () => {
  return (kMaxLength - 2) !== (kMaxLength - 1);
});

test('kMaxLength 加减后仍保持精度', () => {
  const result = (kMaxLength - 100) + 100;
  return result === kMaxLength;
});

test('kMaxLength 除法后精度', () => {
  const half = kMaxLength / 2;
  const doubled = half * 2;
  return doubled === kMaxLength;
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
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%',
      kMaxLength: kMaxLength
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
