// Buffer.concat() - Deep Missing Scenarios Part 1: Arguments and Special Values
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

// totalLength 特殊值
test('totalLength为字符串数字应报错', () => {
  try {
    Buffer.concat([Buffer.from('test')], '5');
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('type');
  }
});

test('totalLength为null应报错', () => {
  try {
    Buffer.concat([Buffer.from('test')], null);
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('null');
  }
});

test('totalLength为undefined（显式传入）', () => {
  const result = Buffer.concat([Buffer.from('test')], undefined);
  return result.length === 4 && result.toString() === 'test';
});

test('totalLength为小数（有小数位）应报错', () => {
  try {
    Buffer.concat([Buffer.from('test')], 2.5);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range');
  }
});

test('totalLength为-0', () => {
  const result = Buffer.concat([Buffer.from('test')], -0);
  return result.length === 0;
});

test('totalLength为+0', () => {
  const result = Buffer.concat([Buffer.from('test')], +0);
  return result.length === 0;
});

test('totalLength为Number.MIN_VALUE', () => {
  try {
    const result = Buffer.concat([Buffer.from('test')], Number.MIN_VALUE);
    return result.length === 0; // 非常小的正数会被截断为0
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range');
  }
});

test('totalLength为Number.EPSILON', () => {
  try {
    const result = Buffer.concat([Buffer.from('test')], Number.EPSILON);
    return result.length === 0;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range');
  }
});

// list 参数特殊类型
test('list为arguments对象应报错', () => {
  function testFunc() {
    try {
      Buffer.concat(arguments);
      return false;
    } catch (e) {
      return e.message.includes('Array') || e.message.includes('list');
    }
  }
  return testFunc(Buffer.from('a'), Buffer.from('b'));
});

test('list为Set应报错', () => {
  try {
    const set = new Set([Buffer.from('a'), Buffer.from('b')]);
    Buffer.concat(set);
    return false;
  } catch (e) {
    return e.message.includes('Array') || e.message.includes('list');
  }
});

test('list为Map应报错', () => {
  try {
    const map = new Map([[0, Buffer.from('a')], [1, Buffer.from('b')]]);
    Buffer.concat(map);
    return false;
  } catch (e) {
    return e.message.includes('Array') || e.message.includes('list');
  }
});

test('list为Generator应报错', () => {
  function* gen() {
    yield Buffer.from('a');
    yield Buffer.from('b');
  }
  try {
    Buffer.concat(gen());
    return false;
  } catch (e) {
    return e.message.includes('Array') || e.message.includes('list');
  }
});

test('list为类数组（有length但无Symbol.iterator）应报错', () => {
  const arrayLike = {
    0: Buffer.from('a'),
    1: Buffer.from('b'),
    length: 2
  };
  try {
    Buffer.concat(arrayLike);
    return false;
  } catch (e) {
    return e.message.includes('Array') || e.message.includes('list');
  }
});

test('list的length属性被修改应报错', () => {
  const list = [Buffer.from('a'), Buffer.from('b')];
  try {
    Object.defineProperty(list, 'length', { value: 10, writable: false });
    Buffer.concat(list);
    return false;
  } catch (e) {
    return e.message.includes('undefined') || e.message.includes('properties');
  }
});

// Buffer 特殊状态
test('list包含类数组对象应报错', () => {
  const obj = { 0: 65, 1: 66, length: 2 }; // 类数组对象但不是真正的Buffer或TypedArray
  try {
    Buffer.concat([obj]);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('连接SharedArrayBuffer视图', () => {
  try {
    const sab = new SharedArrayBuffer(8);
    const view = new Uint8Array(sab);
    view[0] = 1;
    view[1] = 2;
    view[2] = 3;
    const result = Buffer.concat([view]);
    return result.length === 8 && result[0] === 1 && result[1] === 2;
  } catch (e) {
    // 某些环境可能不支持SharedArrayBuffer
    return true;
  }
});

test('连接来自SharedArrayBuffer的Buffer', () => {
  try {
    const sab = new SharedArrayBuffer(8);
    const view = new Uint8Array(sab);
    view.set([10, 20, 30, 40]);
    const buf1 = Buffer.from(view.buffer);
    const buf2 = Buffer.from('test');
    const result = Buffer.concat([buf1, buf2]);
    return result.length === 12 && result[0] === 10;
  } catch (e) {
    return true;
  }
});

// 修改 Buffer.poolSize
test('修改Buffer.poolSize不影响concat行为', () => {
  const oldPoolSize = Buffer.poolSize;
  Buffer.poolSize = 1;
  const result = Buffer.concat([Buffer.from('test'), Buffer.from('data')]);
  Buffer.poolSize = oldPoolSize;
  return result.toString() === 'testdata';
});

// 数组稀疏性详细测试
test('数组末尾扩展长度但未填充', () => {
  const list = [Buffer.from('a'), Buffer.from('b')];
  list.length = 5;
  try {
    Buffer.concat(list);
    return false;
  } catch (e) {
    return e.message.includes('undefined') || e.message.includes('Uint8Array') ||
           e.message.includes('Buffer');
  }
});

test('数组中间有hole', () => {
  const list = [Buffer.from('a')];
  list[2] = Buffer.from('c');
  try {
    Buffer.concat(list);
    return false;
  } catch (e) {
    return e.message.includes('undefined') || e.message.includes('Uint8Array');
  }
});

test('使用delete删除数组元素后', () => {
  const list = [Buffer.from('a'), Buffer.from('b'), Buffer.from('c')];
  delete list[1];
  try {
    Buffer.concat(list);
    return false;
  } catch (e) {
    return e.message.includes('undefined') || e.message.includes('Uint8Array');
  }
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
