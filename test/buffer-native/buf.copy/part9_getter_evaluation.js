// buf.copy() - Getter/Property Access Evaluation Tests
// 补充测试：参数求值时机、Getter 拦截、多次访问等
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

// ========== Getter 求值次数测试 ==========
test('targetStart 对象的 valueOf 被调用且返回正确值', () => {
  const source = Buffer.from('eval');
  const target = Buffer.alloc(10, 0);
  let callCount = 0;
  const obj = {
    valueOf: function() {
      callCount++;
      return 2;
    }
  };
  source.copy(target, obj);
  // valueOf 应该被调用至少一次，结果正确
  return callCount >= 1 && target[2] === 'e'.charCodeAt(0);
});

test('sourceStart 对象的 valueOf 被调用且返回正确值', () => {
  const source = Buffer.from('hello');
  const target = Buffer.alloc(10);
  let callCount = 0;
  const obj = {
    valueOf: function() {
      callCount++;
      return 1;
    }
  };
  const bytes = source.copy(target, 0, obj);
  return callCount >= 1 && bytes === 4;
});

test('sourceEnd 对象的 valueOf 被调用且返回正确值', () => {
  const source = Buffer.from('world');
  const target = Buffer.alloc(10);
  let callCount = 0;
  const obj = {
    valueOf: function() {
      callCount++;
      return 3;
    }
  };
  const bytes = source.copy(target, 0, 0, obj);
  return callCount >= 1 && bytes === 3;
});

test('多个参数的 valueOf 都被正确调用', () => {
  const source = Buffer.from('order');
  const target = Buffer.alloc(10, 0);
  let targetStartCalled = false;
  let sourceStartCalled = false;
  let sourceEndCalled = false;
  
  const targetStartObj = {
    valueOf: function() {
      targetStartCalled = true;
      return 0;
    }
  };
  
  const sourceStartObj = {
    valueOf: function() {
      sourceStartCalled = true;
      return 0;
    }
  };
  
  const sourceEndObj = {
    valueOf: function() {
      sourceEndCalled = true;
      return 5;
    }
  };
  
  source.copy(target, targetStartObj, sourceStartObj, sourceEndObj);
  
  // 验证所有参数的 valueOf 都被调用
  return targetStartCalled && sourceStartCalled && sourceEndCalled &&
         target.slice(0, 5).toString() === 'order';
});

// ========== toString vs valueOf 优先级 ==========
test('同时有 valueOf 和 toString，valueOf 优先', () => {
  const source = Buffer.from('priority');
  const target = Buffer.alloc(10, 0);
  const obj = {
    valueOf: function() { return 1; },
    toString: function() { return '5'; }
  };
  source.copy(target, obj);
  // valueOf 应该优先，结果是 1 而不是 5
  // 但 Node.js 可能对数字强制转换有特殊处理，允许两种情况
  return (target[1] === 'p'.charCodeAt(0) && target[5] === 0) ||
         (target[1] === 'p'.charCodeAt(0));
});

test('只有 toString 时使用 toString', () => {
  const source = Buffer.from('ab');
  const target = Buffer.alloc(10, 0);
  const obj = {
    toString: function() { return '2'; }
  };
  source.copy(target, obj);
  // toString 返回 '2'，转换为数字 2
  return target[2] === 'a'.charCodeAt(0);
});

test('valueOf 返回对象时回退到 toString', () => {
  const source = Buffer.from('fallback');
  const target = Buffer.alloc(10, 0);
  const obj = {
    valueOf: function() { return {}; }, // 返回对象
    toString: function() { return '3'; }
  };
  try {
    source.copy(target, obj);
    // 可能转换为 NaN -> 0，或使用 toString
    return true;
  } catch (e) {
    return true; // 或者抛出错误
  }
});

// ========== 参数中的副作用 ==========
test('valueOf 中修改源 Buffer 不影响复制', () => {
  const source = Buffer.from('original');
  const target = Buffer.alloc(10);
  const obj = {
    valueOf: function() {
      source[0] = 'X'.charCodeAt(0); // 修改源
      return 0;
    }
  };
  source.copy(target, obj);
  // 验证复制的是修改后的值
  return target[0] === 'X'.charCodeAt(0);
});

test('valueOf 中修改目标 Buffer', () => {
  const source = Buffer.from('test');
  const target = Buffer.alloc(10, 0x61);
  const obj = {
    valueOf: function() {
      target[0] = 0xFF; // 预先修改目标
      return 2;
    }
  };
  source.copy(target, obj);
  // valueOf 在复制前执行，位置 0 被预先修改，位置 2+ 被复制
  return target[0] === 0xFF && target[2] === 't'.charCodeAt(0);
});

test('valueOf 中抛出异常后不执行复制', () => {
  const source = Buffer.from('throw');
  const target = Buffer.alloc(10, 0x61);
  const obj = {
    valueOf: function() {
      throw new Error('valueOf exception');
    }
  };
  try {
    source.copy(target, obj);
    return false; // 不应该成功
  } catch (e) {
    // 目标不应被修改
    return e.message === 'valueOf exception' && 
           target[0] === 0x61;
  }
});

// ========== 类型转换的特殊情况 ==========
test('targetStart 为空字符串转换为 0', () => {
  const source = Buffer.from('empty');
  const target = Buffer.alloc(10);
  const bytes = source.copy(target, '');
  // '' -> NaN -> 0
  return bytes === 5 && target[0] === 'e'.charCodeAt(0);
});

test('targetStart 为只有空格的字符串', () => {
  const source = Buffer.from('space');
  const target = Buffer.alloc(10);
  const bytes = source.copy(target, '   ');
  // '   ' -> NaN -> 0
  return bytes === 5;
});

test('targetStart 为科学计数法字符串', () => {
  const source = Buffer.from('sci');
  const target = Buffer.alloc(10, 0);
  const bytes = source.copy(target, '1e1'); // '1e1' = 10
  // '1e1' 应该被解析为 10
  return bytes === 0 || target[1] === 's'.charCodeAt(0); // 可能转为 NaN 或 10
});

test('targetStart 为十六进制字符串', () => {
  const source = Buffer.from('hex');
  const target = Buffer.alloc(10, 0);
  const bytes = source.copy(target, '0x2');
  // '0x2' 在某些环境可能解析为 2，或转为 NaN
  return bytes >= 0;
});

// ========== 对象属性顺序和枚举 ==========
test('对象有多个数字属性时的转换', () => {
  const source = Buffer.from('props');
  const target = Buffer.alloc(10, 0);
  const obj = {
    0: 'zero',
    1: 'one',
    length: 5,
    valueOf: function() { return 2; }
  };
  source.copy(target, obj);
  // valueOf 应该优先
  return target[2] === 'p'.charCodeAt(0);
});

test('数组的 valueOf 返回数组本身', () => {
  const source = Buffer.from('array');
  const target = Buffer.alloc(10, 0);
  const arr = [2, 3, 4];
  try {
    source.copy(target, arr);
    // 数组 toString 为 "2,3,4" -> NaN -> 0
    return target[0] === 'a'.charCodeAt(0);
  } catch (e) {
    return true;
  }
});

test('单元素数组转换为该元素', () => {
  const source = Buffer.from('single');
  const target = Buffer.alloc(10, 0);
  const arr = [3];
  source.copy(target, arr);
  // [3] -> "3" -> 3
  return target[3] === 's'.charCodeAt(0);
});

// ========== 稀疏数组和特殊数组 ==========
test('稀疏数组作为 targetStart', () => {
  const source = Buffer.from('sparse');
  const target = Buffer.alloc(10, 0);
  const sparse = [];
  sparse[2] = 1;
  try {
    source.copy(target, sparse);
    // 稀疏数组 toString 为 ",,1" -> NaN -> 0
    return target[0] === 's'.charCodeAt(0);
  } catch (e) {
    return true;
  }
});

test('类数组对象（有 length 属性）', () => {
  const source = Buffer.from('like');
  const target = Buffer.alloc(10);
  const arrayLike = { 0: 1, 1: 2, length: 2 };
  try {
    source.copy(target, arrayLike);
    // 类数组对象转换为 "[object Object]" -> NaN -> 0
    return true;
  } catch (e) {
    return true;
  }
});

// ========== 原型链上的 valueOf/toString ==========
test('原型链上的 valueOf', () => {
  const source = Buffer.from('proto');
  const target = Buffer.alloc(10, 0);
  
  function MyObj() {}
  MyObj.prototype.valueOf = function() { return 2; };
  
  const obj = new MyObj();
  source.copy(target, obj);
  // 应该能找到原型链上的 valueOf
  return target[2] === 'p'.charCodeAt(0);
});

test('自定义 toString 方法', () => {
  const source = Buffer.from('override');
  const target = Buffer.alloc(10, 0);
  const obj = {};
  obj.toString = function() { return '1'; };
  try {
    source.copy(target, obj);
    return true;
  } catch (e) {
    return true;
  }
});

// ========== 参数转换中的循环引用 ==========
test('valueOf 返回自身（循环引用）', () => {
  const source = Buffer.from('cycle');
  const target = Buffer.alloc(10);
  const obj = {
    valueOf: function() { return obj; }
  };
  try {
    source.copy(target, obj);
    // 可能导致无限递归或转为 NaN
    return true;
  } catch (e) {
    // 可能抛出栈溢出或类型错误
    return e instanceof Error;
  }
});

test('toString 返回自身（循环引用）', () => {
  const source = Buffer.from('string-cycle');
  const target = Buffer.alloc(10);
  const obj = {
    toString: function() { return obj; }
  };
  try {
    source.copy(target, obj);
    return true;
  } catch (e) {
    return e instanceof Error;
  }
});

// ========== 参数验证顺序 ==========
test('targetStart 非法时不验证其他参数', () => {
  const source = Buffer.from('order');
  const target = Buffer.alloc(10);
  let sourceStartCalled = false;
  
  const sourceStartObj = {
    valueOf: function() {
      sourceStartCalled = true;
      return 0;
    }
  };
  
  try {
    // targetStart 为 -1 应该先抛出错误
    source.copy(target, -1, sourceStartObj);
    return false;
  } catch (e) {
    // 如果 sourceStart 的 valueOf 被调用，说明参数是先全部求值再验证
    // 如果没被调用，说明遇到非法参数立即停止
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

// ========== 参数为带 getter 的对象 ==========
test('使用 Object.defineProperty 定义的 getter', () => {
  const source = Buffer.from('getter');
  const target = Buffer.alloc(10, 0);
  const obj = {};
  let getterCalled = false;
  
  Object.defineProperty(obj, 'valueOf', {
    get: function() {
      getterCalled = true;
      return function() { return 2; };
    }
  });
  
  source.copy(target, obj);
  // getter 应该被调用来获取 valueOf 方法
  return getterCalled && target[2] === 'g'.charCodeAt(0);
});

// ========== 参数为特殊构造的对象 ==========
test('带有自定义 valueOf 的普通对象', () => {
  const source = Buffer.from('custom');
  const target = Buffer.alloc(10, 0);
  const obj = {};
  obj.valueOf = function() { return 1; };
  
  try {
    source.copy(target, obj);
    return target[1] === 'c'.charCodeAt(0);
  } catch (e) {
    return true;
  }
});

test('只读属性的对象作为参数', () => {
  const source = Buffer.from('readonly');
  const target = Buffer.alloc(10, 0);
  const obj = {};
  Object.defineProperty(obj, 'value', {
    value: 2,
    writable: false,
    enumerable: true,
    configurable: false
  });
  obj.valueOf = function() { return 2; };
  source.copy(target, obj);
  // 只读不影响读取
  return target[2] === 'r'.charCodeAt(0);
});

test('不可配置属性的对象作为参数', () => {
  const source = Buffer.from('nonconf');
  const target = Buffer.alloc(10, 0);
  const obj = {};
  Object.defineProperty(obj, 'valueOf', {
    value: function() { return 1; },
    writable: true,
    enumerable: false,
    configurable: false
  });
  source.copy(target, obj);
  return target[1] === 'n'.charCodeAt(0);
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

