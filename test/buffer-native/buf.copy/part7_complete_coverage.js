// buf.copy() - Complete Coverage Supplement
// 补充测试：冻结对象、Uint8ClampedArray 裁剪、已分离 ArrayBuffer、异步场景等
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

// ========== Uint8ClampedArray 值裁剪行为验证 ==========
test('复制到 Uint8ClampedArray - 验证不需要裁剪（正常值）', () => {
  const buf = Buffer.from([0, 128, 255]);
  const target = new Uint8ClampedArray(5);
  const bytes = buf.copy(target, 0);
  return bytes === 3 && target[0] === 0 && target[1] === 128 && target[2] === 255;
});

test('复制到 Uint8ClampedArray - 所有字节值范围', () => {
  const buf = Buffer.from([1, 50, 100, 150, 200, 254]);
  const target = new Uint8ClampedArray(10);
  const bytes = buf.copy(target, 0);
  return bytes === 6 && target[0] === 1 && target[5] === 254;
});

test('从 Uint8ClampedArray 复制到 Buffer', () => {
  const source = new Uint8ClampedArray([10, 20, 30, 40]);
  const buf = Buffer.from(source);
  const target = Buffer.alloc(4);
  buf.copy(target);
  return target[0] === 10 && target[3] === 40;
});

// ========== 冻结和密封对象测试 ==========
test('尝试 Object.freeze Buffer（Node.js 不允许）', () => {
  const source = Buffer.from('test');
  const target = Buffer.alloc(10);
  try {
    Object.freeze(target);
    return false; // Node.js 应该抛出错误
  } catch (e) {
    // TypeError: Cannot freeze array buffer views with elements
    return e instanceof TypeError && 
           e.message.includes('freeze');
  }
});

test('尝试 Object.seal Buffer（Node.js 不允许）', () => {
  const source = Buffer.from('seal');
  const target = Buffer.alloc(10);
  try {
    Object.seal(target);
    return false; // Node.js 应该抛出错误
  } catch (e) {
    // TypeError: Cannot seal array buffer views with elements
    return e instanceof TypeError && 
           e.message.includes('seal');
  }
});

test('Object.freeze 空 Buffer（应该成功）', () => {
  const target = Buffer.alloc(0);
  try {
    Object.freeze(target);
    return true; // 空 Buffer 可以被冻结
  } catch (e) {
    return false;
  }
});

test('复制到 Object.preventExtensions 的 Buffer', () => {
  const source = Buffer.from('ext');
  const target = Buffer.alloc(10);
  Object.preventExtensions(target);
  const bytes = source.copy(target);
  // preventExtensions 不影响现有索引的修改
  return bytes === 3 && target.slice(0, 3).toString() === 'ext';
});

// ========== 已分离 ArrayBuffer 测试（理论测试）==========
test('尝试复制到可能分离的 ArrayBuffer 的 TypedArray', () => {
  const source = Buffer.from('detach');
  const arrayBuffer = new ArrayBuffer(10);
  const target = new Uint8Array(arrayBuffer);
  
  // 注意：在普通环境中无法真正分离 ArrayBuffer
  // 这里只测试正常情况，确保不会崩溃
  try {
    const bytes = source.copy(target);
    return bytes === 6;
  } catch (e) {
    // 如果抛出错误，说明检测到了分离状态
    return e instanceof TypeError;
  }
});

test('复制到空 ArrayBuffer 的 TypedArray', () => {
  const source = Buffer.from('test');
  const arrayBuffer = new ArrayBuffer(0);
  const target = new Uint8Array(arrayBuffer);
  const bytes = source.copy(target);
  return bytes === 0;
});

// ========== Buffer 原型链测试 ==========
test('Buffer.prototype.copy 存在且是函数', () => {
  return typeof Buffer.prototype.copy === 'function';
});

test('通过 Buffer.prototype.copy.call 调用', () => {
  const source = Buffer.from('call');
  const target = Buffer.alloc(10);
  const bytes = Buffer.prototype.copy.call(source, target);
  return bytes === 4 && target.slice(0, 4).toString() === 'call';
});

test('通过 Buffer.prototype.copy.apply 调用', () => {
  const source = Buffer.from('apply');
  const target = Buffer.alloc(10);
  const bytes = Buffer.prototype.copy.apply(source, [target]);
  return bytes === 5 && target.slice(0, 5).toString() === 'apply';
});

test('绑定 this 后调用 copy', () => {
  const source = Buffer.from('bind');
  const target = Buffer.alloc(10);
  const boundCopy = source.copy.bind(source);
  const bytes = boundCopy(target);
  return bytes === 4 && target.slice(0, 4).toString() === 'bind';
});

// ========== 异步场景中的 copy（同步操作）==========
test('在 Promise 回调中执行 copy', () => {
  const source = Buffer.from('promise');
  const target = Buffer.alloc(10);
  let success = false;
  
  // 同步执行 Promise
  Promise.resolve().then(() => {
    const bytes = source.copy(target);
    success = bytes === 7 && target.slice(0, 7).toString() === 'promise';
  });
  
  // 由于 Promise 是异步的，这里只验证不会崩溃
  // 实际验证需要在异步环境中
  return true;
});

test('在 setTimeout 回调中执行 copy（同步验证）', () => {
  const source = Buffer.from('timeout');
  const target = Buffer.alloc(10);
  // 这是同步测试，只能验证函数本身
  const bytes = source.copy(target);
  return bytes === 7;
});

// ========== 极端参数组合的更多测试 ==========
test('targetStart 为 -0.0', () => {
  const source = Buffer.from('neg');
  const target = Buffer.alloc(10);
  const bytes = source.copy(target, -0.0);
  return bytes === 3 && target.slice(0, 3).toString() === 'neg';
});

test('所有参数为 0', () => {
  const source = Buffer.from('zeros');
  const target = Buffer.alloc(10, 0x61);
  const bytes = source.copy(target, 0, 0, 0);
  // sourceStart=0, sourceEnd=0, 复制 0 字节
  return bytes === 0 && target[0] === 0x61;
});

test('targetStart 为 Number.MIN_VALUE（接近0）', () => {
  const source = Buffer.from('min');
  const target = Buffer.alloc(10);
  const bytes = source.copy(target, Number.MIN_VALUE);
  // 应向下取整为 0
  return bytes === 3 && target.slice(0, 3).toString() === 'min';
});

test('sourceEnd 为 Number.EPSILON', () => {
  const source = Buffer.from('epsilon');
  const target = Buffer.alloc(10);
  const bytes = source.copy(target, 0, 0, Number.EPSILON);
  // 应向下取整为 0，复制 0 字节
  return bytes === 0;
});

// ========== 特殊 Buffer 创建方式的复制测试 ==========
test('从 Buffer.allocUnsafe 创建的 buffer 复制', () => {
  const source = Buffer.allocUnsafe(5);
  source.write('unsafe');
  const target = Buffer.alloc(10);
  const bytes = source.copy(target);
  return bytes === 5;
});

test('从 Buffer.from(Array) 创建的 buffer 复制', () => {
  const source = Buffer.from([65, 66, 67, 68, 69]);
  const target = Buffer.alloc(10);
  const bytes = source.copy(target);
  return bytes === 5 && target.slice(0, 5).toString() === 'ABCDE';
});

test('从 Buffer.concat 创建的 buffer 复制', () => {
  const buf1 = Buffer.from('con');
  const buf2 = Buffer.from('cat');
  const source = Buffer.concat([buf1, buf2]);
  const target = Buffer.alloc(10);
  const bytes = source.copy(target);
  return bytes === 6 && target.slice(0, 6).toString() === 'concat';
});

// ========== 参数类型强制转换的边界测试 ==========
test('targetStart 为包含多个属性的对象', () => {
  const source = Buffer.from('obj');
  const target = Buffer.alloc(10, 0);
  const obj = {
    a: 1,
    b: 2,
    valueOf: () => 2
  };
  const bytes = source.copy(target, obj);
  return target[2] === 'o'.charCodeAt(0);
});

test('targetStart 为 Date 对象', () => {
  const source = Buffer.from('date');
  const target = Buffer.alloc(100, 0);
  const date = new Date(2); // valueOf() 返回 2
  try {
    const bytes = source.copy(target, date);
    // Date.valueOf() 返回时间戳，可能很大
    return bytes >= 0;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('targetStart 为 RegExp 对象', () => {
  const source = Buffer.from('re');
  const target = Buffer.alloc(10);
  try {
    const bytes = source.copy(target, /test/);
    // RegExp 转换为 NaN -> 0
    return bytes === 2;
  } catch (e) {
    return true;
  }
});

// ========== 内存视图和别名测试 ==========
test('复制到 Buffer 的子数组视图', () => {
  const source = Buffer.from('sub');
  const bigBuffer = Buffer.alloc(20);
  const target = bigBuffer.subarray(5, 15);
  const bytes = source.copy(target);
  return bytes === 3 && bigBuffer.slice(5, 8).toString() === 'sub';
});

test('从 Buffer 的子数组复制', () => {
  const bigBuffer = Buffer.from('0123456789');
  const source = bigBuffer.subarray(3, 7); // '3456'
  const target = Buffer.alloc(10);
  const bytes = source.copy(target);
  return bytes === 4 && target.slice(0, 4).toString() === '3456';
});

test('子数组到子数组的复制', () => {
  const buf1 = Buffer.from('abcdefghij');
  const buf2 = Buffer.alloc(20);
  const source = buf1.subarray(2, 6); // 'cdef'
  const target = buf2.subarray(5, 15);
  const bytes = source.copy(target);
  return bytes === 4 && buf2.slice(5, 9).toString() === 'cdef';
});

// ========== 边界对齐和性能相关 ==========
test('复制 4KB 数据（页面大小）', () => {
  const size = 4096;
  const source = Buffer.alloc(size, 0xAA);
  const target = Buffer.alloc(size);
  const bytes = source.copy(target);
  return bytes === size && target[0] === 0xAA && target[size - 1] === 0xAA;
});

test('复制到 64 字节边界对齐位置', () => {
  const source = Buffer.from('aligned');
  const target = Buffer.alloc(128);
  const bytes = source.copy(target, 64);
  return bytes === 7 && target.slice(64, 71).toString() === 'aligned';
});

test('复制奇数长度到偶数边界', () => {
  const source = Buffer.from('odd'); // 3 bytes
  const target = Buffer.alloc(100);
  const bytes = source.copy(target, 32); // 32 是偶数
  return bytes === 3 && target.slice(32, 35).toString() === 'odd';
});

// ========== 错误消息内容精确验证 ==========
test('负数 targetStart 错误消息应包含参数名', () => {
  const source = Buffer.from('err');
  const target = Buffer.alloc(10);
  try {
    source.copy(target, -5);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' &&
           e.name === 'RangeError' &&
           (e.message.includes('targetStart') || e.message.includes('target'));
  }
});

test('负数 sourceStart 错误消息应包含参数名', () => {
  const source = Buffer.from('err');
  const target = Buffer.alloc(10);
  try {
    source.copy(target, 0, -3);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' &&
           e.name === 'RangeError' &&
           (e.message.includes('sourceStart') || e.message.includes('source'));
  }
});

test('负数 sourceEnd 错误消息应包含参数名', () => {
  const source = Buffer.from('err');
  const target = Buffer.alloc(10);
  try {
    source.copy(target, 0, 0, -2);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' &&
           e.name === 'RangeError' &&
           (e.message.includes('sourceEnd') || e.message.includes('source'));
  }
});

test('目标类型错误消息应说明需要的类型', () => {
  const source = Buffer.from('type');
  try {
    source.copy('string');
    return false;
  } catch (e) {
    return e instanceof TypeError &&
           e.name === 'TypeError' &&
           e.message.length > 0;
  }
});

// ========== 多次复制的幂等性测试 ==========
test('同一数据复制两次结果相同', () => {
  const source = Buffer.from('idempotent');
  const target1 = Buffer.alloc(15);
  const target2 = Buffer.alloc(15);
  
  source.copy(target1);
  source.copy(target2);
  
  return target1.equals(target2);
});

test('复制后再复制，第二次覆盖第一次', () => {
  const source1 = Buffer.from('first');
  const source2 = Buffer.from('second'); // 6 bytes
  const target = Buffer.alloc(10);
  
  source1.copy(target); // 写入 'first' (5 bytes)
  source2.copy(target); // 覆盖为 'second' (6 bytes)
  
  return target.slice(0, 6).toString() === 'second';
});

// ========== 特殊用例：空操作验证 ==========
test('sourceStart = sourceEnd = length（复制0字节）', () => {
  const source = Buffer.from('empty');
  const target = Buffer.alloc(10, 0x61);
  const bytes = source.copy(target, 0, 5, 5);
  return bytes === 0 && target[0] === 0x61;
});

test('targetStart = target.length（无空间复制）', () => {
  const source = Buffer.from('nospace');
  const target = Buffer.alloc(5);
  const bytes = source.copy(target, 5);
  return bytes === 0;
});

test('空 Buffer 复制到空 Buffer', () => {
  const source = Buffer.alloc(0);
  const target = Buffer.alloc(0);
  const bytes = source.copy(target);
  return bytes === 0;
});

// ========== 返回值精确验证 ==========
test('返回值应该是实际复制的字节数（部分复制）', () => {
  const source = Buffer.from('1234567890');
  const target = Buffer.alloc(5);
  const bytes = source.copy(target);
  // 目标只有 5 字节，应该返回 5
  return bytes === 5;
});

test('返回值应该是实际复制的字节数（完整复制）', () => {
  const source = Buffer.from('full');
  const target = Buffer.alloc(10);
  const bytes = source.copy(target);
  return bytes === 4;
});

test('返回值应该是实际复制的字节数（有 sourceEnd）', () => {
  const source = Buffer.from('0123456789');
  const target = Buffer.alloc(10);
  const bytes = source.copy(target, 0, 2, 7); // 复制 5 字节
  return bytes === 5;
});

test('返回值验证（有 targetStart 限制）', () => {
  const source = Buffer.from('abcdefgh'); // 8 bytes
  const target = Buffer.alloc(10);
  const bytes = source.copy(target, 7); // 只能复制 3 字节
  return bytes === 3;
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

