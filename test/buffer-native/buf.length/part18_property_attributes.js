// buf.length - Part 18: Property Attributes Tests (without forbidden keywords)
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

// 测试 length 属性的只读性（通过赋值行为验证）
test('length 属性是只读的（赋值不生效）', () => {
  const buf = Buffer.alloc(10);
  const original = buf.length;
  buf.length = 999;
  return buf.length === original; // 如果是只读，赋值不会生效
});

test('length 属性不可删除', () => {
  const buf = Buffer.alloc(10);
  const before = buf.length;
  delete buf.length;
  const after = buf.length;
  return before === after && after === 10;
});

test('严格模式下修改 length 不抛出错误（静默失败）', () => {
  'use strict';
  const buf = Buffer.alloc(10);
  try {
    buf.length = 100;
    // 在严格模式下，如果是只读属性，应该抛出 TypeError
    // 但 Buffer.length 可能是 getter，不会抛出错误
    return buf.length === 10;
  } catch (e) {
    // 如果抛出错误，说明是只读属性
    return e.name === 'TypeError' && buf.length === 10;
  }
});

test('Object.keys 不包含 length（不可枚举）', () => {
  const buf = Buffer.alloc(10);
  const keys = Object.keys(buf);
  return !keys.includes('length');
});

test('Object.getOwnPropertyNames 不包含 length（非自有属性）', () => {
  const buf = Buffer.alloc(10);
  const names = Object.getOwnPropertyNames(buf);
  return !names.includes('length');
});

test('JSON.stringify 不包含 length', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = JSON.stringify(buf);
  const parsed = JSON.parse(json);
  return !('length' in parsed) || parsed.type === 'Buffer';
});

test('Object.assign 不会复制 length', () => {
  const buf = Buffer.from([1, 2, 3]);
  const obj = Object.assign({}, buf);
  // length 是继承属性，不会被 Object.assign 复制
  return obj.length === undefined || obj.length !== buf.length;
});

test('扩展运算符不包含 length 属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const obj = { ...buf };
  // 扩展运算符只复制可枚举的自有属性
  return obj.length === undefined;
});

// 测试 length 在不同上下文中的行为
test('length 可以用于条件判断', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(10);
  return !buf1.length && !!buf2.length;
});

test('length 可以用于数学运算', () => {
  const buf = Buffer.alloc(10);
  const result = buf.length * 2 + 5;
  return result === 25;
});

test('length 可以用于字符串拼接', () => {
  const buf = Buffer.alloc(10);
  const str = 'Buffer length: ' + buf.length;
  return str === 'Buffer length: 10';
});

test('length 可以用于模板字符串', () => {
  const buf = Buffer.alloc(10);
  const str = `Buffer has ${buf.length} bytes`;
  return str === 'Buffer has 10 bytes';
});

// 测试 length 与数组方法的兼容性
test('Array.prototype.slice.call 使用 length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const arr = Array.prototype.slice.call(buf, 0, buf.length);
  return arr.length === buf.length;
});

test('Array.prototype.forEach.call 使用 length', () => {
  const buf = Buffer.from([1, 2, 3]);
  let count = 0;
  Array.prototype.forEach.call(buf, () => count++);
  return count === buf.length;
});

test('Array.prototype.map.call 使用 length', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = Array.prototype.map.call(buf, x => x * 2);
  return arr.length === buf.length;
});

test('Array.prototype.filter.call 使用 length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const arr = Array.prototype.filter.call(buf, x => x > 2);
  return arr.length < buf.length;
});

// 测试 length 的类型检查
test('typeof length 是 number', () => {
  const buf = Buffer.alloc(10);
  return typeof buf.length === 'number';
});

test('length 是整数', () => {
  const buf = Buffer.alloc(10);
  return Number.isInteger(buf.length);
});

test('length 是有限数', () => {
  const buf = Buffer.alloc(10);
  return Number.isFinite(buf.length);
});

test('length 不是 NaN', () => {
  const buf = Buffer.alloc(10);
  return !Number.isNaN(buf.length);
});

test('length 是安全整数', () => {
  const buf = Buffer.alloc(10);
  return Number.isSafeInteger(buf.length);
});

// 测试 length 的边界值
test('最小 length 为 0', () => {
  const buf = Buffer.alloc(0);
  return buf.length === 0 && buf.length >= 0;
});

test('length 总是非负数', () => {
  const buffers = [
    Buffer.alloc(0),
    Buffer.alloc(1),
    Buffer.alloc(100),
    Buffer.from('test'),
    Buffer.from([1, 2, 3])
  ];
  return buffers.every(buf => buf.length >= 0);
});

test('length 与 MAX_SAFE_INTEGER 的关系', () => {
  const buf = Buffer.alloc(100);
  return buf.length <= Number.MAX_SAFE_INTEGER;
});

// 测试 length 在原型链中的位置
test('buf.hasOwnProperty("length") 为 false', () => {
  const buf = Buffer.alloc(10);
  return !buf.hasOwnProperty('length');
});

test('"length" in buf 为 true', () => {
  const buf = Buffer.alloc(10);
  return 'length' in buf;
});

// 测试 length 与其他属性的关系
test('length 等于 byteLength', () => {
  const buffers = [
    Buffer.alloc(0),
    Buffer.alloc(10),
    Buffer.from('hello'),
    Buffer.from([1, 2, 3, 4, 5])
  ];
  return buffers.every(buf => buf.length === buf.byteLength);
});

test('length 与 buffer 属性的关系', () => {
  const buf = Buffer.alloc(10);
  return buf.buffer.byteLength >= buf.length;
});

// 测试 length 在不同创建方式下的一致性
test('alloc 和 allocUnsafe 相同 size 的 length 相等', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.allocUnsafe(10);
  return buf1.length === buf2.length;
});

test('from(string) 和 from(Buffer) 的 length', () => {
  const str = 'hello';
  const buf1 = Buffer.from(str);
  const buf2 = Buffer.from(buf1);
  return buf1.length === buf2.length;
});

test('from(array) 的 length 等于数组长度', () => {
  const arr = [1, 2, 3, 4, 5];
  const buf = Buffer.from(arr);
  return buf.length === arr.length;
});

// 测试 length 在操作后的不变性
test('fill 操作不改变 length', () => {
  const buf = Buffer.alloc(10);
  const before = buf.length;
  buf.fill(0);
  return buf.length === before;
});

test('write 操作不改变 length', () => {
  const buf = Buffer.alloc(10);
  const before = buf.length;
  buf.write('test', 0);
  return buf.length === before;
});

test('copy 操作不改变 length', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10);
  const before = buf1.length;
  buf2.copy(buf1, 0);
  return buf1.length === before;
});

test('swap16 操作不改变 length', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const before = buf.length;
  buf.swap16();
  return buf.length === before;
});

test('swap32 操作不改变 length', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const before = buf.length;
  buf.swap32();
  return buf.length === before;
});

test('swap64 操作不改变 length', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const before = buf.length;
  buf.swap64();
  return buf.length === before;
});

test('reverse 操作不改变 length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const before = buf.length;
  buf.reverse();
  return buf.length === before;
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
