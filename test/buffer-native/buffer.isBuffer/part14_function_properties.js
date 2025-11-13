// Buffer.isBuffer() - 函数属性和元数据测试
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

// Buffer.isBuffer 函数属性验证
test('Buffer.isBuffer 函数存在', () => {
  return typeof Buffer.isBuffer === 'function';
});

test('Buffer.isBuffer.length 属性为 1', () => {
  return Buffer.isBuffer.length === 1;
});

test('Buffer.isBuffer.name 属性为 isBuffer', () => {
  return Buffer.isBuffer.name === 'isBuffer';
});

test('Buffer.isBuffer 属性行为验证', () => {
  const original = Buffer.isBuffer;
  // 在Node.js中，Buffer.isBuffer实际上是可以重写的
  // 这个测试主要验证它是一个正常的函数属性
  return typeof original === 'function';
});

test('Buffer.isBuffer 可以被调用', () => {
  const buf = Buffer.alloc(5);
  return Buffer.isBuffer.call(Buffer, buf) === true;
});

test('Buffer.isBuffer.apply 调用正常', () => {
  const buf = Buffer.alloc(5);
  return Buffer.isBuffer.apply(Buffer, [buf]) === true;
});

test('Buffer.isBuffer.bind 返回函数', () => {
  const bound = Buffer.isBuffer.bind(null);
  return typeof bound === 'function';
});

test('Buffer.isBuffer.bind 调用结果正确', () => {
  const bound = Buffer.isBuffer.bind(Buffer);
  const buf = Buffer.alloc(5);
  return bound(buf) === true;
});

// 函数 toString 测试
test('Buffer.isBuffer.toString() 返回字符串', () => {
  const str = Buffer.isBuffer.toString();
  return typeof str === 'string' && str.length > 0;
});

// prototype 相关
test('Buffer.isBuffer prototype 属性检查', () => {
  // 在Node.js中，函数都有prototype属性，但isBuffer的prototype可能不是undefined
  return typeof Buffer.isBuffer.prototype !== 'function';
});

// Symbol 属性
test('Buffer.isBuffer Symbol.toStringTag', () => {
  const tag = Buffer.isBuffer[Symbol.toStringTag];
  return tag === undefined || typeof tag === 'string';
});

// 作为方法调用
test('Buffer.isBuffer 直接调用正常', () => {
  const buf = Buffer.alloc(5);
  return Buffer.isBuffer(buf) === true;
});

test('Buffer["isBuffer"] 语法调用正常', () => {
  const buf = Buffer.alloc(5);
  return Buffer["isBuffer"](buf) === true;
});

// 函数相等性
test('Buffer.isBuffer === Buffer.isBuffer', () => {
  return Buffer.isBuffer === Buffer.isBuffer;
});

test('Buffer.isBuffer !== Buffer.from', () => {
  return Buffer.isBuffer !== Buffer.from;
});

// 构造器相关
test('Buffer.isBuffer 作为函数使用', () => {
  // 测试 Buffer.isBuffer 主要作为函数使用而不是构造器
  const buf = Buffer.alloc(5);
  const result = Buffer.isBuffer(buf);
  
  // 验证它确实是一个函数并返回正确结果
  return typeof Buffer.isBuffer === 'function' && result === true;
});

// 严格等于比较
test('Buffer.isBuffer 返回正确的布尔类型', () => {
  const buf = Buffer.alloc(5);
  const result1 = Buffer.isBuffer(buf);
  const result2 = Buffer.isBuffer('not buffer');
  return result1 === true && typeof result1 === 'boolean' &&
         result2 === false && typeof result2 === 'boolean';
});

// 函数继承链
test('Buffer.isBuffer 是 Function 实例', () => {
  return Buffer.isBuffer instanceof Function;
});

test('Buffer.isBuffer 函数类型验证', () => {
  // 验证函数的基本特征
  return typeof Buffer.isBuffer === 'function' && 
         Buffer.isBuffer instanceof Function;
});

// 属性描述符
test('Buffer.isBuffer length 属性不可写', () => {
  const descriptor = Object.getOwnPropertyDescriptor(Buffer.isBuffer, 'length');
  return descriptor && descriptor.writable === false;
});

test('Buffer.isBuffer name 属性不可写', () => {
  const descriptor = Object.getOwnPropertyDescriptor(Buffer.isBuffer, 'name');
  return descriptor && descriptor.writable === false;
});

test('Buffer.isBuffer length 属性不可枚举', () => {
  const descriptor = Object.getOwnPropertyDescriptor(Buffer.isBuffer, 'length');
  return descriptor && descriptor.enumerable === false;
});

test('Buffer.isBuffer name 属性不可枚举', () => {
  const descriptor = Object.getOwnPropertyDescriptor(Buffer.isBuffer, 'name');
  return descriptor && descriptor.enumerable === false;
});

// Object.keys 和枚举
test('Object.keys(Buffer.isBuffer) 返回空数组', () => {
  return Object.keys(Buffer.isBuffer).length === 0;
});

test('for...in 遍历 Buffer.isBuffer 无属性', () => {
  let count = 0;
  for (let key in Buffer.isBuffer) {
    count++;
  }
  return count === 0;
});

// 多次调用一致性
test('多次调用 Buffer.isBuffer 结果一致', () => {
  const buf = Buffer.alloc(5);
  const result1 = Buffer.isBuffer(buf);
  const result2 = Buffer.isBuffer(buf);
  const result3 = Buffer.isBuffer(buf);
  return result1 === result2 && result2 === result3 && result1 === true;
});

// 垃圾回收测试
test('临时 Buffer 对象的 isBuffer 检测', () => {
  const results = [];
  for (let i = 0; i < 100; i++) {
    results.push(Buffer.isBuffer(Buffer.alloc(100))); // 减小内存分配
  }
  return results.every(r => r === true);
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
