// buffer.kStringMaxLength - Part 13: Function Properties and Symbol Tests
const { Buffer, kStringMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// kStringMaxLength 是常量，不是函数，验证这一点
test('kStringMaxLength 不是函数', () => {
  return typeof kStringMaxLength !== 'function';
});

test('kStringMaxLength 没有 length 属性', () => {
  return kStringMaxLength.length === undefined;
});

test('kStringMaxLength 没有 name 属性', () => {
  return kStringMaxLength.name === undefined;
});

test('kStringMaxLength 没有 prototype 属性', () => {
  return kStringMaxLength.prototype === undefined;
});

test('kStringMaxLength 无法被调用', () => {
  try {
    kStringMaxLength();
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('kStringMaxLength 无法被new调用', () => {
  try {
    new kStringMaxLength();
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// Symbol 相关测试
test('kStringMaxLength 与 Symbol 的运算', () => {
  try {
    const sym = Symbol('test');
    // 数字与Symbol不能直接运算
    const result = kStringMaxLength + sym;
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('kStringMaxLength 可以作为 Symbol 描述', () => {
  try {
    const sym = Symbol(kStringMaxLength);
    return sym.description === kStringMaxLength.toString();
  } catch (e) {
    return false;
  }
});

// 特殊数值测试
test('kStringMaxLength 与 NaN 的运算', () => {
  return Number.isNaN(kStringMaxLength + NaN) &&
         Number.isNaN(kStringMaxLength * NaN) &&
         Number.isNaN(kStringMaxLength / NaN);
});

test('kStringMaxLength 与 Infinity 的运算', () => {
  return kStringMaxLength + Infinity === Infinity &&
         kStringMaxLength - Infinity === -Infinity &&
         kStringMaxLength / Infinity === 0;
});

test('kStringMaxLength 与 -Infinity 的运算', () => {
  return kStringMaxLength + (-Infinity) === -Infinity &&
         kStringMaxLength - (-Infinity) === Infinity;
});

test('kStringMaxLength 的平方根是合理的', () => {
  const sqrt = Math.sqrt(kStringMaxLength);
  return Number.isFinite(sqrt) && sqrt > 0;
});

test('kStringMaxLength 的对数是合理的', () => {
  const log = Math.log(kStringMaxLength);
  return Number.isFinite(log) && log > 0;
});

// 类型转换测试
test('kStringMaxLength 转换为 BigInt', () => {
  try {
    const bigint = BigInt(kStringMaxLength);
    return typeof bigint === 'bigint' && bigint > 0n;
  } catch (e) {
    return false;
  }
});

test('kStringMaxLength 用作数组索引（理论）', () => {
  // 不实际创建大数组，只是验证索引类型
  const arr = [1, 2, 3];
  try {
    // 超出范围的索引返回 undefined
    return arr[kStringMaxLength] === undefined;
  } catch (e) {
    return false;
  }
});

// WeakMap/WeakSet 键值测试
test('kStringMaxLength 不能用作 WeakMap 键', () => {
  try {
    const wm = new WeakMap();
    wm.set(kStringMaxLength, 'value');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('kStringMaxLength 不能添加到 WeakSet', () => {
  try {
    const ws = new WeakSet();
    ws.add(kStringMaxLength);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 对象属性访问测试
test('kStringMaxLength 可以通过对象属性访问', () => {
  try {
    const obj = { value: kStringMaxLength };
    return obj.value === kStringMaxLength;
  } catch (e) {
    return false;
  }
});

// 生成器和迭代器测试
test('kStringMaxLength 用于生成器循环次数', () => {
  function* generator() {
    // 使用小值模拟
    const testSize = Math.min(3, kStringMaxLength);
    for (let i = 0; i < testSize; i++) {
      yield i;
    }
  }
  
  const gen = generator();
  let count = 0;
  for (const value of gen) {
    count++;
  }
  return count === Math.min(3, kStringMaxLength);
});

// Date 对象测试
test('kStringMaxLength 作为毫秒数创建 Date', () => {
  try {
    const date = new Date(kStringMaxLength);
    return date instanceof Date && !isNaN(date.getTime());
  } catch (e) {
    return false;
  }
});

// Set/Map 测试
test('kStringMaxLength 可以作为 Set 成员', () => {
  const set = new Set();
  set.add(kStringMaxLength);
  return set.has(kStringMaxLength) && set.size === 1;
});

test('kStringMaxLength 可以作为 Map 键', () => {
  const map = new Map();
  map.set(kStringMaxLength, 'test');
  return map.has(kStringMaxLength) && map.get(kStringMaxLength) === 'test';
});

// Promise 测试
test('kStringMaxLength 用于 Promise.resolve', () => {
  return Promise.resolve(kStringMaxLength).then(value => {
    return value === kStringMaxLength;
  });
});

test('kStringMaxLength 用于 setTimeout 延时', () => {
  // 使用较小的值避免长时间等待
  const delay = Math.min(1, kStringMaxLength);
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true);
    }, delay);
  });
});

// 正则表达式测试
test('kStringMaxLength 转字符串匹配数字正则', () => {
  const str = kStringMaxLength.toString();
  const regex = /^\d+$/;
  return regex.test(str);
});

test('kStringMaxLength 作为正则表达式量词', () => {
  try {
    // 使用小值避免性能问题
    const count = Math.min(3, kStringMaxLength);
    const regex = new RegExp(`a{${count}}`);
    const str = 'a'.repeat(count);
    return regex.test(str);
  } catch (e) {
    return false;
  }
});

// 函数参数测试
test('kStringMaxLength 作为函数参数', () => {
  function testFn(param) {
    return typeof param === 'number' && param === kStringMaxLength;
  }
  return testFn(kStringMaxLength);
});

test('kStringMaxLength 用于 apply/call', () => {
  function testFn() {
    return arguments[0] === kStringMaxLength;
  }
  return testFn.call(null, kStringMaxLength) &&
         testFn.apply(null, [kStringMaxLength]);
});

// JSON 序列化测试
test('kStringMaxLength 在 JSON 中正确序列化', () => {
  const obj = { maxLength: kStringMaxLength };
  const json = JSON.stringify(obj);
  const parsed = JSON.parse(json);
  return parsed.maxLength === kStringMaxLength;
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
