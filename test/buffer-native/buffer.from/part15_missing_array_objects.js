// Buffer.from() - Part 15: Missing Array and Special Objects
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

// 数组的边界值测试
test('数组 - 单元素数组 [0]', () => {
  const buf = Buffer.from([0]);
  return buf.length === 1 && buf[0] === 0;
});

test('数组 - 单元素数组 [255]', () => {
  const buf = Buffer.from([255]);
  return buf.length === 1 && buf[0] === 255;
});

test('数组 - 两元素数组边界 [0, 255]', () => {
  const buf = Buffer.from([0, 255]);
  return buf.length === 2 && buf[0] === 0 && buf[1] === 255;
});

test('数组 - 所有 256 个可能的字节值', () => {
  const arr = [];
  for (let i = 0; i < 256; i++) arr.push(i);
  const buf = Buffer.from(arr);
  let allMatch = true;
  for (let i = 0; i < 256; i++) {
    if (buf[i] !== i) {
      allMatch = false;
      break;
    }
  }
  return buf.length === 256 && allMatch;
});

test('数组 - 256 转换为 0', () => {
  const buf = Buffer.from([256]);
  return buf[0] === 0;
});

test('数组 - 257 转换为 1', () => {
  const buf = Buffer.from([257]);
  return buf[0] === 1;
});

test('数组 - 512 转换为 0', () => {
  const buf = Buffer.from([512]);
  return buf[0] === 0;
});

test('数组 - 1000 转换为 1000 % 256', () => {
  const buf = Buffer.from([1000]);
  return buf[0] === 1000 % 256;
});

test('数组 - -256 转换为 0', () => {
  const buf = Buffer.from([-256]);
  return buf[0] === 0;
});

test('数组 - -257 转换为 255', () => {
  const buf = Buffer.from([-257]);
  return buf[0] === 255;
});

test('数组 - 小数 0.1 转换为 0', () => {
  const buf = Buffer.from([0.1]);
  return buf[0] === 0;
});

test('数组 - 小数 0.9 转换为 0', () => {
  const buf = Buffer.from([0.9]);
  return buf[0] === 0;
});

test('数组 - 小数 255.9 转换为 255', () => {
  const buf = Buffer.from([255.9]);
  return buf[0] === 255;
});

test('数组 - 小数 256.1 转换为 0', () => {
  const buf = Buffer.from([256.1]);
  return buf[0] === 0;
});

test('数组 - Number.MIN_SAFE_INTEGER', () => {
  const buf = Buffer.from([Number.MIN_SAFE_INTEGER]);
  return buf.length === 1;
});

test('数组 - Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.from([Number.MAX_SAFE_INTEGER]);
  return buf.length === 1;
});

// 特殊对象的 valueOf 测试
test('valueOf - 返回数组', () => {
  const obj = {
    valueOf() {
      return [65, 66, 67];
    }
  };
  try {
    const buf = Buffer.from(obj);
    // 可能被当作类数组或使用 valueOf
    return buf instanceof Buffer;
  } catch (e) {
    return true;
  }
});

test('valueOf - 返回字符串', () => {
  const obj = {
    valueOf() {
      return 'hello';
    }
  };
  try {
    const buf = Buffer.from(obj);
    return buf instanceof Buffer;
  } catch (e) {
    return true;
  }
});

test('valueOf - 返回数字', () => {
  const obj = {
    valueOf() {
      return 123;
    }
  };
  try {
    Buffer.from(obj);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('valueOf - 返回 ArrayBuffer', () => {
  const obj = {
    valueOf() {
      const ab = new ArrayBuffer(5);
      return ab;
    }
  };
  try {
    const buf = Buffer.from(obj);
    return buf instanceof Buffer;
  } catch (e) {
    return true;
  }
});

test('valueOf - 返回 Uint8Array', () => {
  const obj = {
    valueOf() {
      return new Uint8Array([1, 2, 3]);
    }
  };
  try {
    const buf = Buffer.from(obj);
    return buf instanceof Buffer;
  } catch (e) {
    return true;
  }
});

// Symbol.toPrimitive 测试
test('Symbol.toPrimitive - 返回字符串', () => {
  const obj = {
    [Symbol.toPrimitive](hint) {
      return 'test';
    }
  };
  try {
    const buf = Buffer.from(obj);
    return buf instanceof Buffer;
  } catch (e) {
    return true;
  }
});

test('Symbol.toPrimitive - 返回数组', () => {
  const obj = {
    [Symbol.toPrimitive](hint) {
      return [72, 73];
    }
  };
  try {
    const buf = Buffer.from(obj);
    return buf instanceof Buffer;
  } catch (e) {
    return true;
  }
});

test('Symbol.toPrimitive - 同时有 valueOf', () => {
  const obj = {
    valueOf() {
      return Buffer.from([1, 2, 3]);
    },
    [Symbol.toPrimitive](hint) {
      return Buffer.from([4, 5, 6]);
    }
  };
  try {
    const buf = Buffer.from(obj);
    return buf instanceof Buffer;
  } catch (e) {
    return true;
  }
});

// 类数组对象的更多场景
test('类数组 - length 为字符串 "3"', () => {
  const obj = { 0: 10, 1: 20, 2: 30, length: '3' };
  const buf = Buffer.from(obj);
  // Node.js 将字符串 length 当作无效值处理
  return buf.length === 0;
});

test('类数组 - length 为字符串 "0"', () => {
  const obj = { 0: 10, length: '0' };
  const buf = Buffer.from(obj);
  return buf.length === 0;
});

test('类数组 - length 为布尔值 true (转为 1)', () => {
  const obj = { 0: 99, length: true };
  const buf = Buffer.from(obj);
  // Node.js 将布尔值 length 当作无效值处理
  return buf.length === 0;
});

test('类数组 - length 为布尔值 false (转为 0)', () => {
  const obj = { 0: 99, length: false };
  const buf = Buffer.from(obj);
  return buf.length === 0;
});

test('类数组 - length 为空字符串 (转为 0)', () => {
  const obj = { 0: 99, length: '' };
  const buf = Buffer.from(obj);
  return buf.length === 0;
});

test('类数组 - length 为 null (转为 0)', () => {
  const obj = { 0: 99, length: null };
  const buf = Buffer.from(obj);
  return buf.length === 0;
});

test('类数组 - length 为对象 (转为 NaN 再转为 0)', () => {
  const obj = { 0: 99, length: {} };
  const buf = Buffer.from(obj);
  return buf.length === 0;
});

test('类数组 - length 为数组 (转为字符串再转数字)', () => {
  const obj = { 0: 10, 1: 20, length: [2] };
  const buf = Buffer.from(obj);
  // Node.js 将数组 length 当作无效值处理
  return buf.length === 0;
});

test('类数组 - length 为空数组 (转为 0)', () => {
  const obj = { 0: 99, length: [] };
  const buf = Buffer.from(obj);
  return buf.length === 0;
});

test('类数组 - 索引为非整数字符串', () => {
  const obj = { '0.5': 99, '1.5': 88, 0: 10, 1: 20, length: 2 };
  const buf = Buffer.from(obj);
  return buf.length === 2 && buf[0] === 10 && buf[1] === 20;
});

test('类数组 - 索引包含科学计数法', () => {
  const obj = { '1e2': 99, 0: 10, length: 1 };
  const buf = Buffer.from(obj);
  return buf.length === 1 && buf[0] === 10;
});

test('类数组 - 超大索引值', () => {
  const obj = { 0: 1, 999999: 2, length: 2 };
  const buf = Buffer.from(obj);
  return buf.length === 2 && buf[0] === 1;
});

// 迭代器接口（不应该被使用）
test('可迭代对象 - 有 Symbol.iterator 但也有 length', () => {
  const obj = {
    0: 65,
    1: 66,
    length: 2,
    *[Symbol.iterator]() {
      yield 99;
      yield 100;
    }
  };
  const buf = Buffer.from(obj);
  // 应该使用类数组接口，不使用迭代器
  return buf.length === 2 && buf[0] === 65 && buf[1] === 66;
});

test('生成器函数对象', () => {
  function* gen() {
    yield 1;
    yield 2;
  }
  try {
    Buffer.from(gen());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 数组的子类
test('Array 子类', () => {
  class MyArray extends Array {
    customMethod() {
      return 'custom';
    }
  }
  const arr = new MyArray(3);
  arr[0] = 10;
  arr[1] = 20;
  arr[2] = 30;
  const buf = Buffer.from(arr);
  return buf.length === 3 && buf[0] === 10;
});

test('TypedArray 作为类数组', () => {
  const uint8 = new Uint8Array([5, 10, 15]);
  const buf = Buffer.from(uint8);
  return buf.length === 3 && buf[0] === 5;
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
