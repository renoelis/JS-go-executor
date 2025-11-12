// buffer.isAscii() - Part 8: Comprehensive Error Coverage Tests
const { Buffer, isAscii } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 无参数调用
test('无参数调用', () => {
  try {
    isAscii();
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// null 和 undefined
test('null 参数抛出 TypeError', () => {
  try {
    isAscii(null);
    return false;
  } catch (e) {
    return e instanceof TypeError && e.message.includes('argument');
  }
});

test('undefined 参数抛出 TypeError', () => {
  try {
    isAscii(undefined);
    return false;
  } catch (e) {
    return e instanceof TypeError && e.message.includes('argument');
  }
});

// 基本类型错误
test('boolean true 抛出 TypeError', () => {
  try {
    isAscii(true);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('boolean false 抛出 TypeError', () => {
  try {
    isAscii(false);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('number 0 抛出 TypeError', () => {
  try {
    isAscii(0);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('number 正整数抛出 TypeError', () => {
  try {
    isAscii(123);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('number 负整数抛出 TypeError', () => {
  try {
    isAscii(-123);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('number NaN 抛出 TypeError', () => {
  try {
    isAscii(NaN);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('number Infinity 抛出 TypeError', () => {
  try {
    isAscii(Infinity);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('number -Infinity 抛出 TypeError', () => {
  try {
    isAscii(-Infinity);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 字符串错误
test('空字符串抛出 TypeError', () => {
  try {
    isAscii('');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('ASCII 字符串抛出 TypeError', () => {
  try {
    isAscii('hello');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('非 ASCII 字符串抛出 TypeError', () => {
  try {
    isAscii('你好');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 对象错误
test('空对象抛出 TypeError', () => {
  try {
    isAscii({});
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('普通对象抛出 TypeError', () => {
  try {
    isAscii({ length: 5 });
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('对象带 buffer 属性抛出 TypeError', () => {
  try {
    isAscii({ buffer: Buffer.from('hello') });
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 数组错误
test('普通数组抛出 TypeError', () => {
  try {
    isAscii([1, 2, 3]);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('空数组抛出 TypeError', () => {
  try {
    isAscii([]);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('类数组对象抛出 TypeError', () => {
  try {
    isAscii({ 0: 1, 1: 2, length: 2 });
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 函数错误
test('函数抛出 TypeError', () => {
  try {
    isAscii(function() {});
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('箭头函数抛出 TypeError', () => {
  try {
    isAscii(() => {});
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// Symbol 错误
test('Symbol 抛出 TypeError', () => {
  try {
    isAscii(Symbol('test'));
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// BigInt 错误
test('BigInt 抛出 TypeError', () => {
  try {
    isAscii(123n);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// Date 对象错误
test('Date 对象抛出 TypeError', () => {
  try {
    isAscii(new Date());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// RegExp 对象错误
test('RegExp 对象抛出 TypeError', () => {
  try {
    isAscii(/test/);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// Map 和 Set 错误
test('Map 对象抛出 TypeError', () => {
  try {
    isAscii(new Map());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Set 对象抛出 TypeError', () => {
  try {
    isAscii(new Set());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// WeakMap 和 WeakSet 错误
test('WeakMap 对象抛出 TypeError', () => {
  try {
    isAscii(new WeakMap());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('WeakSet 对象抛出 TypeError', () => {
  try {
    isAscii(new WeakSet());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// Promise 错误
test('Promise 对象抛出 TypeError', () => {
  try {
    isAscii(Promise.resolve());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// Error 对象错误
test('Error 对象抛出 TypeError', () => {
  try {
    isAscii(new Error('test'));
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// ArrayBuffer with length 0
test('空 ArrayBuffer - 长度 0', () => {
  const ab = new ArrayBuffer(0);
  return isAscii(ab) === true;
});

// DataView 明确不支持
test('DataView 抛出 TypeError', () => {
  const ab = new ArrayBuffer(5);
  const dv = new DataView(ab);
  try {
    isAscii(dv);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 多个参数（应该只使用第一个）
test('多个参数 - 只使用第一个', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from([0x80]);
  // 应该只检查第一个参数
  return isAscii(buf1, buf2) === true;
});

test('多个参数 - 第一个非 ASCII', () => {
  const buf1 = Buffer.from([0x80]);
  const buf2 = Buffer.from('hello');
  return isAscii(buf1, buf2) === false;
});

// 冻结和密封的对象（TypedArray 不支持 freeze/seal，会抛出错误）
test('冻结 Buffer 会抛出错误', () => {
  try {
    const buf = Buffer.from('hello');
    Object.freeze(buf);
    return false; // 如果没抛错，说明行为不同
  } catch (e) {
    return e.message.includes('freeze');
  }
});

test('密封 Buffer 会抛出错误', () => {
  try {
    const buf = Buffer.from('hello');
    Object.seal(buf);
    return false;
  } catch (e) {
    return e.message.includes('seal');
  }
});

test('冻结 Uint8Array 会抛出错误', () => {
  try {
    const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
    Object.freeze(arr);
    return false;
  } catch (e) {
    return e.message.includes('freeze');
  }
});

// 特殊 ArrayBuffer 状态
test('SharedArrayBuffer - ASCII', () => {
  if (typeof SharedArrayBuffer !== 'undefined') {
    const sab = new SharedArrayBuffer(5);
    const arr = new Uint8Array(sab);
    arr[0] = 0x48;
    arr[1] = 0x65;
    arr[2] = 0x6C;
    arr[3] = 0x6C;
    arr[4] = 0x6F;
    return isAscii(sab) === true;
  }
  return true; // 跳过
});

test('SharedArrayBuffer - 非 ASCII', () => {
  if (typeof SharedArrayBuffer !== 'undefined') {
    const sab = new SharedArrayBuffer(2);
    const arr = new Uint8Array(sab);
    arr[0] = 0x48;
    arr[1] = 0x80;
    return isAscii(sab) === false;
  }
  return true; // 跳过
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
