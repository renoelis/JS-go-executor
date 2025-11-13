// Buffer.from() - Part 18: Deep Edge Cases Supplement 
// 针对 Node.js v25.0.0 的深层边界情况补充测试
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

function testError(name, fn, expectedError) {
  try {
    fn();
    tests.push({ name, status: '❌', error: 'Expected error was not thrown' });
  } catch (e) {
    let pass = true;
    if (expectedError) {
      if (typeof expectedError === 'string') {
        pass = e.name === expectedError || e.code === expectedError;
      } else {
        pass = e instanceof expectedError;
      }
    }
    tests.push({ name, status: pass ? '✅' : '❌', actualError: e.message });
  }
}

// 1. TypedArray 的深层边界测试
test('BigInt64Array - 正边界值', () => {
  try {
    const bigints = new BigInt64Array([0n, 127n, 255n]);
    const buf = Buffer.from(bigints);
    // BigInt64Array 每个元素是8字节，应该被截断为1字节
    return buf.length === 3 && buf[0] === 0 && buf[1] === 127 && buf[2] === 255;
  } catch (e) {
    // 如果不支持，应该抛出 TypeError
    return e instanceof TypeError;
  }
});

test('BigUint64Array - 超出范围值', () => {
  try {
    const bigints = new BigUint64Array([256n, 65536n]);
    const buf = Buffer.from(bigints);
    // 大值应该被模256截断
    return buf.length === 2 && buf[0] === 0 && buf[1] === 0;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Float64Array - NaN 和 Infinity', () => {
  const floats = new Float64Array([NaN, Infinity, -Infinity, 1.5, -1.5]);
  const buf = Buffer.from(floats);
  // NaN -> 0, Infinity -> 0, -Infinity -> 0, 1.5 -> 1, -1.5 -> 255
  return buf.length === 5 && buf[0] === 0 && buf[1] === 0 && buf[2] === 0;
});

test('TypedArray - 自定义子类', () => {
  class CustomUint8Array extends Uint8Array {}
  const custom = new CustomUint8Array([1, 2, 3]);
  const buf = Buffer.from(custom);
  return buf.length === 3 && buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// 2. 对象转换的复杂场景
test('对象 - getter 属性', () => {
  const obj = {
    get 0() { return 10; },
    get 1() { return 20; },
    get length() { return 2; }
  };
  const buf = Buffer.from(obj);
  return buf.length === 2 && buf[0] === 10 && buf[1] === 20;
});

test('对象 - setter 副作用', () => {
  let sideEffect = 0;
  const obj = {
    get 0() { sideEffect++; return 100; },
    get length() { return 1; }
  };
  const buf = Buffer.from(obj);
  return buf[0] === 100 && sideEffect === 1; // getter 应该只被调用一次
});

test('对象 - 原型链属性', () => {
  function Proto() {}
  Proto.prototype[0] = 50;
  Proto.prototype.length = 1;
  
  const obj = new Proto();
  const buf = Buffer.from(obj);
  return buf.length === 1 && buf[0] === 50;
});

test('对象 - Symbol.toPrimitive 优先级', () => {
  const obj = {
    toString() { return 'string'; },
    valueOf() { return [1, 2, 3]; },
    [Symbol.toPrimitive]() { return 'primitive'; }
  };
  const buf = Buffer.from(obj);
  // 实际上在Buffer.from中，valueOf返回数组时会被使用
  return buf.length === 3 && buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// 3. 字符串编码的深层测试
test('UTF-8 - BOM 处理', () => {
  const withBOM = '\uFEFF测试';
  const withoutBOM = '测试';
  const buf1 = Buffer.from(withBOM, 'utf8');
  const buf2 = Buffer.from(withoutBOM, 'utf8');
  return buf1.length > buf2.length; // BOM 应该增加字节数
});

test('UTF-8 - 替代字符', () => {
  const surrogates = '\uD83D\uDE00'; // 😀 emoji
  const buf = Buffer.from(surrogates, 'utf8');
  return buf.length === 4; // emoji 应该是4字节
});

test('Base64 - 不标准填充', () => {
  try {
    Buffer.from('SGVsbG8=====', 'base64'); // 过多填充
    return true; // Node.js 通常容忍这种情况
  } catch (e) {
    return false;
  }
});

test('HEX - 大小写混合', () => {
  const buf1 = Buffer.from('48656c6c6f', 'hex');
  const buf2 = Buffer.from('48656C6C6F', 'hex');
  return buf1.equals(buf2);
});

// 4. ArrayBuffer 的深层测试
test('ArrayBuffer - SharedArrayBuffer', () => {
  try {
    const sab = new SharedArrayBuffer(8);
    const view = new Uint8Array(sab);
    view[0] = 42;
    const buf = Buffer.from(sab);
    return buf[0] === 42;
  } catch (e) {
    // SharedArrayBuffer 可能不可用
    return e.message.includes('SharedArrayBuffer');
  }
});

test('ArrayBuffer - 分离的 ArrayBuffer', () => {
  const ab = new ArrayBuffer(4);
  // 注意：无法直接分离 ArrayBuffer，这个测试验证正常情况
  const buf = Buffer.from(ab);
  return buf.length === 4;
});

test('ArrayBuffer - 零字节 offset', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 0, 0);
  return buf.length === 0;
});

// 5. 边界值的精确测试
test('数组 - 所有特殊数字边界', () => {
  const special = [
    Number.MIN_SAFE_INTEGER, // -9007199254740991
    Number.MAX_SAFE_INTEGER, // 9007199254740991
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -0,
    +0
  ];
  const buf = Buffer.from(special);
  return buf.length === 6; // 所有值都应该转换为有效字节
});

test('数组 - Number 对象包装', () => {
  const numbers = [new Number(65), new Number(66), new Number(67)];
  const buf = Buffer.from(numbers);
  return buf.toString() === 'ABC';
});

test('数组 - Boolean 转换', () => {
  const bools = [true, false, new Boolean(true), new Boolean(false)];
  const buf = Buffer.from(bools);
  return buf[0] === 1 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0;
});

// 6. 函数和特殊类型
test('参数 - Generator 函数', () => {
  function* generator() {
    yield 1;
    yield 2;
    yield 3;
  }
  try {
    Buffer.from(generator());
    return false; // 应该抛出错误
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('参数 - AsyncFunction', () => {
  async function asyncFn() {}
  try {
    Buffer.from(asyncFn);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('参数 - Promise', () => {
  try {
    Buffer.from(Promise.resolve([1, 2, 3]));
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 7. Symbol 相关的完整测试
test('数组 - Symbol 键', () => {
  const arr = [1, 2, 3];
  arr[Symbol('test')] = 999; // Symbol 键应该被忽略
  const buf = Buffer.from(arr);
  return buf.length === 3 && buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('对象 - Symbol 属性', () => {
  const sym = Symbol('value');
  const obj = {
    [sym]: 100,
    0: 50,
    length: 1
  };
  const buf = Buffer.from(obj);
  return buf.length === 1 && buf[0] === 50; // Symbol 属性被忽略
});

// 8. 内存和性能边界
test('大数组 - 渐进式增长', () => {
  const size = 1000;
  const arr = new Array(size);
  for (let i = 0; i < size; i++) {
    arr[i] = i % 256;
  }
  const buf = Buffer.from(arr);
  return buf.length === size && buf[0] === 0 && buf[255] === 255;
});

test('稀疏数组 - 大间隔', () => {
  const arr = [];
  arr[0] = 10;
  arr[100] = 20;
  arr.length = 101;
  const buf = Buffer.from(arr);
  return buf.length === 101 && buf[0] === 10 && buf[1] === 0 && buf[100] === 20;
});

// 9. 类型强制转换的边界
test('数组值 - toString 调用', () => {
  const obj = {
    toString() { return '65'; },
    valueOf() { return 66; }
  };
  const buf = Buffer.from([obj]);
  return buf[0] === 66; // valueOf 优先于 toString
});

test('数组值 - 复杂转换链', () => {
  let conversionStep = '';
  const nested = {
    valueOf() {
      conversionStep = 'valueOf';
      return 67;
    },
    toString() {
      conversionStep = 'toString';
      return '67';
    }
  };
  const buf = Buffer.from([nested]);
  // 应该调用valueOf并返回数字67
  return buf[0] === 67 && conversionStep === 'valueOf';
});

// 10. 极端类型组合
test('类数组 - 混合属性类型', () => {
  const obj = {
    0: '48', // 字符串 -> 48
    1: true, // 布尔 -> 1
    2: null, // null -> 0
    3: undefined, // undefined -> 0
    length: 4 // 数字长度
  };
  const buf = Buffer.from(obj);
  return buf.length === 4 && buf[0] === 48 && buf[1] === 1 && buf[2] === 0 && buf[3] === 0;
});

// 输出结果
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
