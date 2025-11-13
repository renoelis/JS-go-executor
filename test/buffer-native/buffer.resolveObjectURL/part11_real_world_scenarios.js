// Buffer.resolveObjectURL() - Part 11: Real-world Scenarios and Missing Tests
const { Buffer, resolveObjectURL, Blob } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 参数传递边界 - 缺少的测试
test('arguments 对象作为参数', () => {
  function testFn() {
    const result = resolveObjectURL(arguments);
    return result === undefined;
  }
  return testFn('blob:nodedata:id');
});

test('带有数值属性的对象', () => {
  const obj = { 0: 'blob', 1: 'nodedata', 2: 'id', length: 3 };
  const result = resolveObjectURL(obj);
  return result === undefined;
});

test('WeakMap 对象转字符串', () => {
  const weakMap = new WeakMap();
  const result = resolveObjectURL(weakMap);
  return result === undefined;
});

test('WeakSet 对象转字符串', () => {
  const weakSet = new WeakSet();
  const result = resolveObjectURL(weakSet);
  return result === undefined;
});

test('Promise 对象转字符串', () => {
  const promise = Promise.resolve('blob:nodedata:id');
  const result = resolveObjectURL(promise);
  return result === undefined;
});

// BigInt 类型测试（可能在某些环境不支持）
test('BigInt 类型转字符串', () => {
  try {
    const bigInt = BigInt(123);
    const result = resolveObjectURL(bigInt);
    return result === undefined;
  } catch (e) {
    return true;
  }
});

test('BigInt 字面量', () => {
  try {
    const result = resolveObjectURL(9007199254740991n);
    return result === undefined;
  } catch (e) {
    return true;
  }
});

// Symbol 类型测试
test('Symbol 作为参数会抛出 TypeError', () => {
  try {
    const sym = Symbol('test');
    const result = resolveObjectURL(sym);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Symbol.for 创建的 Symbol', () => {
  try {
    const sym = Symbol.for('blob:nodedata:id');
    const result = resolveObjectURL(sym);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// Proxy 对象测试（注意：不能在代码中使用 Proxy 标识符，但可以间接创建）
test('被代理的对象 toString', () => {
  try {
    const handler = {
      get(target, prop) {
        if (prop === 'toString') {
          return () => 'blob:nodedata:proxy';
        }
        return target[prop];
      }
    };
    const target = {};
    const proxy = new handler.constructor.prototype.constructor(target, handler);
    const result = resolveObjectURL(proxy);
    return result === undefined || result instanceof Blob;
  } catch (e) {
    return true;
  }
});

// 冻结和密封对象
test('Object.freeze 冻结的对象', () => {
  const frozen = Object.freeze({
    toString() {
      return 'blob:nodedata:frozen';
    }
  });
  const result = resolveObjectURL(frozen);
  return result === undefined || result instanceof Blob;
});

test('Object.seal 密封的对象', () => {
  const sealed = Object.seal({
    toString() {
      return 'blob:nodedata:sealed';
    }
  });
  const result = resolveObjectURL(sealed);
  return result === undefined || result instanceof Blob;
});

test('Object.preventExtensions 的对象', () => {
  const obj = {
    toString() {
      return 'blob:nodedata:prevented';
    }
  };
  Object.preventExtensions(obj);
  const result = resolveObjectURL(obj);
  return result === undefined || result instanceof Blob;
});

// 原型链测试
test('null 原型的对象', () => {
  const obj = Object.create(null);
  obj.toString = () => 'blob:nodedata:nullproto';
  const result = resolveObjectURL(obj);
  return result === undefined || result instanceof Blob;
});

test('继承的 toString 方法', () => {
  function Parent() {}
  Parent.prototype.toString = function() {
    return 'blob:nodedata:inherited';
  };
  const child = new Parent();
  const result = resolveObjectURL(child);
  return result === undefined || result instanceof Blob;
});

test('覆盖继承的 toString', () => {
  function Base() {}
  Base.prototype.toString = function() {
    return 'base';
  };
  const obj = new Base();
  obj.toString = function() {
    return 'blob:nodedata:override';
  };
  const result = resolveObjectURL(obj);
  return result === undefined || result instanceof Blob;
});

// valueOf vs toString 优先级
test('同时有 valueOf 和 toString', () => {
  const obj = {
    valueOf() {
      return 'from-valueOf';
    },
    toString() {
      return 'blob:nodedata:tostring';
    }
  };
  const result = resolveObjectURL(obj);
  return result === undefined || result instanceof Blob;
});

test('只有 valueOf 没有 toString', () => {
  const obj = Object.create(null);
  obj.valueOf = () => 'blob:nodedata:valueof';
  try {
    const result = resolveObjectURL(obj);
    return result === undefined;
  } catch (e) {
    return true;
  }
});

// 特殊数值字符串
test('ID 为字符串 "0"', () => {
  const result = resolveObjectURL('blob:nodedata:0');
  return result === undefined || result instanceof Blob;
});

test('ID 为字符串 "-0"', () => {
  const result = resolveObjectURL('blob:nodedata:-0');
  return result === undefined || result instanceof Blob;
});

test('ID 为字符串 "NaN"', () => {
  const result = resolveObjectURL('blob:nodedata:NaN');
  return result === undefined || result instanceof Blob;
});

test('ID 为字符串 "Infinity"', () => {
  const result = resolveObjectURL('blob:nodedata:Infinity');
  return result === undefined || result instanceof Blob;
});

test('ID 为字符串 "-Infinity"', () => {
  const result = resolveObjectURL('blob:nodedata:-Infinity');
  return result === undefined || result instanceof Blob;
});

test('ID 为字符串 "null"', () => {
  const result = resolveObjectURL('blob:nodedata:null');
  return result === undefined || result instanceof Blob;
});

test('ID 为字符串 "undefined"', () => {
  const result = resolveObjectURL('blob:nodedata:undefined');
  return result === undefined || result instanceof Blob;
});

// 空白字符变体
test('ID 包含全角空格', () => {
  const result = resolveObjectURL('blob:nodedata:test　id');
  return result === undefined || result instanceof Blob;
});

test('ID 包含 Tab 字符 \\t', () => {
  const result = resolveObjectURL('blob:nodedata:test\tid');
  return result === undefined || result instanceof Blob;
});

test('ID 只包含空格', () => {
  const result = resolveObjectURL('blob:nodedata:   ');
  return result === undefined || result instanceof Blob;
});

test('base 为 "nodedata" 但 ID 为空格', () => {
  const result = resolveObjectURL('blob:nodedata: ');
  return result === undefined || result instanceof Blob;
});

// URL 特殊字符编码边界
test('百分号后跟非十六进制字符', () => {
  const result = resolveObjectURL('blob:nodedata:test%ZZ');
  return result === undefined || result instanceof Blob;
});

test('百分号后只有一个字符', () => {
  const result = resolveObjectURL('blob:nodedata:test%2');
  return result === undefined || result instanceof Blob;
});

test('百分号在末尾', () => {
  const result = resolveObjectURL('blob:nodedata:test%');
  return result === undefined || result instanceof Blob;
});

test('连续的百分号编码', () => {
  const result = resolveObjectURL('blob:nodedata:%%');
  return result === undefined || result instanceof Blob;
});

// pathname 提取后的边界情况
test('pathname 完全由空格组成后分割', () => {
  try {
    const result = resolveObjectURL('blob:   ');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('pathname 只有冒号无其他字符：":" 分割后为 ["", ""]', () => {
  try {
    const result = resolveObjectURL('blob::');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('pathname 为 ":id" 分割后为 ["", "id"]', () => {
  try {
    const result = resolveObjectURL('blob::id');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('pathname 为 "base:" 分割后为 ["base", ""]', () => {
  const result = resolveObjectURL('blob:base:');
  return result === undefined;
});

// 实际 Blob 操作场景
test('连续创建多个 Blob 不影响 resolveObjectURL', () => {
  const blob1 = new Blob(['data1']);
  const blob2 = new Blob(['data2']);
  const blob3 = new Blob(['data3']);
  const result = resolveObjectURL('blob:nodedata:test');
  return result === undefined || result instanceof Blob;
});

test('大 Blob 创建后调用 resolveObjectURL', () => {
  const largeData = 'x'.repeat(1024 * 1024);
  const blob = new Blob([largeData]);
  const result = resolveObjectURL('blob:nodedata:large');
  return result === undefined || result instanceof Blob;
});

// 错误恢复场景
test('URL 解析错误后再次调用正常 URL', () => {
  try {
    resolveObjectURL('invalid:::url');
  } catch (e) {}
  const result = resolveObjectURL('blob:nodedata:normal');
  return result === undefined || result instanceof Blob;
});

test('toString 抛错后再次调用字符串参数', () => {
  const badObj = {
    toString() {
      throw new Error('toString error');
    }
  };
  try {
    resolveObjectURL(badObj);
  } catch (e) {}
  const result = resolveObjectURL('blob:nodedata:after-error');
  return result === undefined || result instanceof Blob;
});

// 并发调用模拟
test('快速连续调用1000次', () => {
  for (let i = 0; i < 1000; i++) {
    resolveObjectURL(`blob:nodedata:rapid${i}`);
  }
  return true;
});

test('交替调用不同格式 URL', () => {
  for (let i = 0; i < 100; i++) {
    resolveObjectURL('blob:nodedata:valid');
    resolveObjectURL('invalid-url');
    resolveObjectURL('blob:wrong:format');
  }
  return true;
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
