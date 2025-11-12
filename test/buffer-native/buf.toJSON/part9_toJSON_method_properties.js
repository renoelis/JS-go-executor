// buf.toJSON() - Method Properties and Descriptor Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌', passed: pass });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// toJSON 方法属性和描述符测试
test('toJSON 方法的 length 属性为 0', () => {
  const buf = Buffer.from([1, 2, 3]);
  if (buf.toJSON.length !== 0) return false;
  return true;
});

test('toJSON 方法的 name 属性为 toJSON', () => {
  const buf = Buffer.from([1, 2, 3]);
  if (buf.toJSON.name !== 'toJSON') return false;
  return true;
});

test('toJSON 方法是可枚举的', () => {
  const buf = Buffer.from([1, 2, 3]);
  // 检查 Buffer 实例自身没有 toJSON 属性（它在原型上）
  if (buf.hasOwnProperty('toJSON')) return false;
  // 通过 for...in 验证可枚举性
  const keys = [];
  for (const key in buf) {
    if (key === 'toJSON') keys.push(key);
  }
  // Node.js 中 Buffer.prototype.toJSON 是可枚举的
  if (!keys.includes('toJSON')) return false;
  return true;
});

test('toJSON 方法是可配置的', () => {
  const buf = Buffer.from([1, 2, 3]);
  // 通过尝试删除实例的 toJSON 来验证可配置性
  const originalMethod = buf.toJSON;
  buf.toJSON = null;
  // 可以覆盖实例属性
  if (buf.toJSON !== null) return false;
  // 恢复后再次验证
  buf.toJSON = originalMethod;
  if (typeof buf.toJSON !== 'function') return false;
  return true;
});

test('toJSON 方法是可写的', () => {
  const buf = Buffer.from([1, 2, 3]);
  // 通过覆盖方法来验证可写性
  const customFunc = () => ({ custom: true });
  buf.toJSON = customFunc;
  if (buf.toJSON !== customFunc) return false;
  if (buf.toJSON().custom !== true) return false;
  return true;
});

test('可以覆盖单个 Buffer 实例的 toJSON', () => {
  const buf = Buffer.from([1, 2, 3]);
  const customResult = { custom: true };
  buf.toJSON = () => customResult;

  const result = buf.toJSON();
  if (result.custom !== true) return false;

  // 其他 Buffer 不受影响
  const buf2 = Buffer.from([4, 5, 6]);
  const result2 = buf2.toJSON();
  if (result2.type !== 'Buffer') return false;

  return true;
});

test('JSON.stringify 会调用 toJSON 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  let called = false;

  const originalToJSON = buf.toJSON;
  buf.toJSON = function() {
    called = true;
    return originalToJSON.call(this);
  };

  JSON.stringify(buf);

  return called;
});

test('JSON.stringify 只调用 toJSON 一次', () => {
  const buf = Buffer.from([1, 2, 3]);
  let callCount = 0;

  const originalToJSON = buf.toJSON;
  buf.toJSON = function() {
    callCount++;
    return originalToJSON.call(this);
  };

  JSON.stringify(buf);

  return callCount === 1;
});

test('返回值没有 Symbol.toStringTag', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  if (json[Symbol.toStringTag] !== undefined) return false;

  return true;
});

test('Buffer 的 Symbol.toStringTag 是 Uint8Array', () => {
  const buf = Buffer.from([1, 2, 3]);
  if (buf[Symbol.toStringTag] !== 'Uint8Array') return false;
  return true;
});

test('返回对象的原型是 Object.prototype', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  // 验证对象具有 Object.prototype 的方法
  if (typeof json.toString !== 'function') return false;
  if (typeof json.hasOwnProperty !== 'function') return false;
  if (typeof json.valueOf !== 'function') return false;
  // 验证不是特殊对象（如 null 原型对象）
  if (json.toString === undefined) return false;

  return true;
});

test('返回的 data 数组的原型是 Array.prototype', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  // 验证数组具有 Array.prototype 的方法
  if (!Array.isArray(json.data)) return false;
  if (typeof json.data.push !== 'function') return false;
  if (typeof json.data.pop !== 'function') return false;
  if (typeof json.data.slice !== 'function') return false;

  return true;
});

test('返回对象使用 Object.create(null) 不影响', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  // toJSON 返回的是普通对象,有正常的原型链
  if (!json.hasOwnProperty) return false;
  if (typeof json.toString !== 'function') return false;

  return true;
});

test('返回对象是可扩展的', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  if (!Object.isExtensible(json)) return false;

  // 可以添加新属性
  json.newProp = 'test';
  if (json.newProp !== 'test') return false;

  return true;
});

test('返回的 data 数组是可扩展的', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  if (!Object.isExtensible(json.data)) return false;

  // 可以添加新元素
  json.data.push(4);
  if (json.data.length !== 4) return false;

  return true;
});

test('返回对象的属性是可枚举的', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  const keys = Object.keys(json);
  if (!keys.includes('type')) return false;
  if (!keys.includes('data')) return false;

  return true;
});

test('返回对象的属性是可写的', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  json.type = 'Modified';
  if (json.type !== 'Modified') return false;

  json.data = [99, 98, 97];
  if (json.data[0] !== 99) return false;

  return true;
});

test('返回对象的属性是可配置的', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  delete json.type;
  if ('type' in json) return false;

  delete json.data;
  if ('data' in json) return false;

  return true;
});

test('toJSON 作为普通函数调用会失败', () => {
  const buf = Buffer.from([1, 2, 3]);
  const toJSON = buf.toJSON;

  let threw = false;
  try {
    toJSON(); // 没有 this 绑定
  } catch (e) {
    threw = true;
  }

  return threw;
});

test('toJSON 绑定到非 Buffer 的 TypedArray', () => {
  const buf = Buffer.from([1, 2, 3]);
  const int8 = new Int8Array([10, 20, 30]);

  const result = buf.toJSON.call(int8);

  if (result.type !== 'Buffer') return false;
  if (result.data.length !== 3) return false;
  if (result.data[0] !== 10) return false;

  return true;
});

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

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
  console.log('\n' + JSON.stringify(result, null, 2));
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
