// buf.length - Part 16: Property Descriptor Tests
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

// length 属性特性测试
test('length 属性存在且有值', () => {
  const buf = Buffer.alloc(10);
  return buf.length !== undefined && buf.length === 10;
});

test('hasOwnProperty length 返回 false', () => {
  const buf = Buffer.alloc(10);
  // length 是继承属性，不是自有属性
  return !buf.hasOwnProperty('length');
});

test('length in buffer', () => {
  const buf = Buffer.alloc(10);
  return 'length' in buf;
});

test('Object.keys 不包含 length', () => {
  const buf = Buffer.alloc(10);
  const keys = Object.keys(buf);
  return !keys.includes('length');
});

test('for...in 不遍历 length', () => {
  const buf = Buffer.from([1, 2, 3]);
  let hasLength = false;
  for (let key in buf) {
    if (key === 'length') {
      hasLength = true;
    }
  }
  return !hasLength;
});

// length 与数组索引的关系
test('length 大于最大索引', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let maxIndex = -1;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== undefined) {
      maxIndex = i;
    }
  }
  return buf.length === maxIndex + 1;
});

test('空 buffer 的索引访问', () => {
  const buf = Buffer.alloc(0);
  return buf[0] === undefined && buf.length === 0;
});

// length 与迭代器
test('迭代器遍历次数等于 length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let count = 0;
  for (let byte of buf) {
    count++;
  }
  return count === buf.length;
});

test('values() 迭代器次数等于 length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let count = 0;
  for (let byte of buf.values()) {
    count++;
  }
  return count === buf.length;
});

test('keys() 迭代器次数等于 length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let count = 0;
  for (let index of buf.keys()) {
    count++;
  }
  return count === buf.length;
});

test('entries() 迭代器次数等于 length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let count = 0;
  for (let entry of buf.entries()) {
    count++;
  }
  return count === buf.length;
});

// length 与 Array.from
test('Array.from 长度等于 buffer.length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const arr = Array.from(buf);
  return arr.length === buf.length;
});

test('扩展运算符长度等于 buffer.length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const arr = [...buf];
  return arr.length === buf.length;
});

// length 与 Buffer 静态方法
test('Buffer.byteLength 与 buf.length 的关系', () => {
  const str = 'hello';
  const buf = Buffer.from(str);
  return Buffer.byteLength(str) === buf.length;
});

test('Buffer.byteLength 中文字符', () => {
  const str = '你好';
  const buf = Buffer.from(str);
  return Buffer.byteLength(str) === buf.length;
});

test('Buffer.byteLength hex 编码', () => {
  const hex = '48656c6c6f';
  const buf = Buffer.from(hex, 'hex');
  return Buffer.byteLength(hex, 'hex') === buf.length;
});

test('Buffer.byteLength base64 编码', () => {
  const b64 = 'SGVsbG8=';
  const buf = Buffer.from(b64, 'base64');
  return Buffer.byteLength(b64, 'base64') === buf.length;
});

// length 与 Buffer.isBuffer
test('Buffer.isBuffer 不影响 length', () => {
  const buf = Buffer.from('test');
  const isBuf = Buffer.isBuffer(buf);
  return isBuf && buf.length === 4;
});

// length 与类型转换
test('Number(buf.length) 转换', () => {
  const buf = Buffer.alloc(10);
  return Number(buf.length) === 10;
});

test('String(buf.length) 转换', () => {
  const buf = Buffer.alloc(10);
  return String(buf.length) === '10';
});

test('Boolean(buf.length) 非零', () => {
  const buf = Buffer.alloc(10);
  return Boolean(buf.length) === true;
});

test('Boolean(buf.length) 零', () => {
  const buf = Buffer.alloc(0);
  return Boolean(buf.length) === false;
});

// length 与算术运算
test('length 加法运算', () => {
  const buf = Buffer.alloc(10);
  return buf.length + 5 === 15;
});

test('length 减法运算', () => {
  const buf = Buffer.alloc(10);
  return buf.length - 3 === 7;
});

test('length 乘法运算', () => {
  const buf = Buffer.alloc(10);
  return buf.length * 2 === 20;
});

test('length 除法运算', () => {
  const buf = Buffer.alloc(10);
  return buf.length / 2 === 5;
});

test('length 取模运算', () => {
  const buf = Buffer.alloc(10);
  return buf.length % 3 === 1;
});

// length 与比较运算
test('length 等于比较', () => {
  const buf = Buffer.alloc(10);
  return buf.length === 10;
});

test('length 不等于比较', () => {
  const buf = Buffer.alloc(10);
  return buf.length !== 5;
});

test('length 大于比较', () => {
  const buf = Buffer.alloc(10);
  return buf.length > 5;
});

test('length 小于比较', () => {
  const buf = Buffer.alloc(10);
  return buf.length < 20;
});

test('length 大于等于比较', () => {
  const buf = Buffer.alloc(10);
  return buf.length >= 10;
});

test('length 小于等于比较', () => {
  const buf = Buffer.alloc(10);
  return buf.length <= 10;
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
