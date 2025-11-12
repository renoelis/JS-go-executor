// buf.writeInt32LE() - 深度类型转换和边缘情况测试
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

// ==================== Symbol.toPrimitive ====================

test('value 支持 Symbol.toPrimitive', () => {
  const buf = Buffer.alloc(8);
  const obj = {
    [Symbol.toPrimitive](hint) {
      return 123;
    }
  };
  buf.writeInt32LE(obj, 0);
  return buf.readInt32LE(0) === 123;
});

test('Symbol.toPrimitive 返回字符串数字', () => {
  const buf = Buffer.alloc(8);
  const obj = {
    [Symbol.toPrimitive](hint) {
      return '456';
    }
  };
  buf.writeInt32LE(obj, 0);
  return buf.readInt32LE(0) === 456;
});

test('Symbol.toPrimitive 优先于 valueOf', () => {
  const buf = Buffer.alloc(8);
  const obj = {
    [Symbol.toPrimitive](hint) {
      return 100;
    },
    valueOf() {
      return 200;
    }
  };
  buf.writeInt32LE(obj, 0);
  return buf.readInt32LE(0) === 100;
});

// ==================== valueOf vs toString ====================

test('valueOf 优先于 toString', () => {
  const buf = Buffer.alloc(8);
  const obj = {
    valueOf() { return 100; },
    toString() { return '200'; }
  };
  buf.writeInt32LE(obj, 0);
  return buf.readInt32LE(0) === 100;
});

test('只有 toString 时使用 toString', () => {
  const buf = Buffer.alloc(8);
  const obj = {
    toString() { return '300'; }
  };
  buf.writeInt32LE(obj, 0);
  return buf.readInt32LE(0) === 300;
});

test('valueOf 返回非原始值时使用 toString', () => {
  const buf = Buffer.alloc(8);
  const obj = {
    valueOf() { return {}; },
    toString() { return '400'; }
  };
  buf.writeInt32LE(obj, 0);
  return buf.readInt32LE(0) === 400;
});

// ==================== 原型链 ====================

test('原型链上的 valueOf（通过函数继承）', () => {
  const buf = Buffer.alloc(8);
  function Parent() {}
  Parent.prototype.valueOf = function() { return 123; };
  const obj = new Parent();
  buf.writeInt32LE(obj, 0);
  return buf.readInt32LE(0) === 123;
});

test('原型链上的 Symbol.toPrimitive（通过函数继承）', () => {
  const buf = Buffer.alloc(8);
  function Parent() {}
  Parent.prototype[Symbol.toPrimitive] = function(hint) { return 456; };
  const obj = new Parent();
  buf.writeInt32LE(obj, 0);
  return buf.readInt32LE(0) === 456;
});

// ==================== 特殊对象 ====================

test('空对象转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE({}, 0);
  return buf.readInt32LE(0) === 0;
});

test('空数组转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE([], 0);
  return buf.readInt32LE(0) === 0;
});

test('单元素数组转换为元素值', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE([123], 0);
  return buf.readInt32LE(0) === 123;
});

test('多元素数组转换为 NaN -> 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE([1, 2], 0);
  return buf.readInt32LE(0) === 0;
});

test('正则表达式转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE(/123/, 0);
  return buf.readInt32LE(0) === 0;
});

// ==================== 异常情况 ====================

test('valueOf 抛出异常应传播', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      valueOf() {
        throw new Error('Custom error');
      }
    };
    buf.writeInt32LE(obj, 0);
    return false;
  } catch (e) {
    return e.message === 'Custom error';
  }
});

test('Symbol.toPrimitive 抛出异常应传播', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      [Symbol.toPrimitive](hint) {
        throw new Error('ToPrimitive error');
      }
    };
    buf.writeInt32LE(obj, 0);
    return false;
  } catch (e) {
    return e.message === 'ToPrimitive error';
  }
});

// ==================== offset 参数特殊处理 ====================

test('offset 不接受对象（即使有 valueOf）', () => {
  try {
    const buf = Buffer.alloc(8);
    const offset = {
      valueOf() { return 0; }
    };
    buf.writeInt32LE(123, offset);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('offset');
  }
});

test('offset 不接受数组', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32LE(123, [0]);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('offset');
  }
});

// ==================== Getter 属性 ====================

test('value 的 Getter valueOf', () => {
  const buf = Buffer.alloc(8);
  let called = false;
  const obj = {
    get valueOf() {
      called = true;
      return () => 123;
    }
  };
  buf.writeInt32LE(obj, 0);
  return called && buf.readInt32LE(0) === 123;
});

// ==================== 字符串数字 ====================

test('字符串数字应正确转换', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE('123', 0);
  return buf.readInt32LE(0) === 123;
});

test('带空格的字符串数字', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE('  456  ', 0);
  return buf.readInt32LE(0) === 456;
});

test('十六进制字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE('0x10', 0);
  return buf.readInt32LE(0) === 16;
});

test('八进制字符串（ES5+ 不支持）', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE('0o10', 0);
  return buf.readInt32LE(0) === 8;
});

test('二进制字符串（ES6+）', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE('0b10', 0);
  return buf.readInt32LE(0) === 2;
});

test('无效字符串转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE('abc', 0);
  return buf.readInt32LE(0) === 0;
});

// ==================== 布尔值 ====================

test('true 转换为 1', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE(true, 0);
  return buf.readInt32LE(0) === 1;
});

test('false 转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE(false, 0);
  return buf.readInt32LE(0) === 0;
});

// ==================== 输出结果 ====================

const summary = {
  total: tests.length,
  passed: tests.filter(t => t.status === '✅').length,
  failed: tests.filter(t => t.status === '❌').length,
  successRate: ((tests.filter(t => t.status === '✅').length / tests.length) * 100).toFixed(2) + '%'
};

const result = {
  success: summary.failed === 0,
  summary,
  tests
};

console.log(JSON.stringify(result, null, 2));
return result;
