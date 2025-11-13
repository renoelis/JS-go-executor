// buffer.transcode() - Part 16: Function Properties and Call Methods Tests
const { Buffer, transcode } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 函数属性验证
test('transcode 函数 length 属性', () => {
  return transcode.length === 3;
});

test('transcode 函数 name 属性', () => {
  return transcode.name === 'transcode';
});

test('transcode 函数 toString 方法', () => {
  const str = transcode.toString();
  return typeof str === 'string' && str.includes('transcode');
});

// 函数调用方式测试
test('transcode.call() 方法调用', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode.call(null, source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 8;
});

test('transcode.apply() 方法调用', () => {
  const source = Buffer.from('Test', 'utf8');
  const args = [source, 'utf8', 'utf16le'];
  const result = transcode.apply(null, args);
  return result instanceof Buffer && result.length === 8;
});

test('transcode.bind() 方法调用', () => {
  const source = Buffer.from('Test', 'utf8');
  const boundTranscode = transcode.bind(null, source, 'utf8');
  const result = boundTranscode('utf16le');
  return result instanceof Buffer && result.length === 8;
});

// 极端参数类型测试
test('Symbol 作为第一个参数', () => {
  try {
    transcode(Symbol('test'), 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Symbol 作为源编码', () => {
  try {
    const source = Buffer.from('Test', 'utf8');
    transcode(source, Symbol('utf8'), 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Symbol 作为目标编码', () => {
  try {
    const source = Buffer.from('Test', 'utf8');
    transcode(source, 'utf8', Symbol('utf16le'));
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('BigInt 作为参数', () => {
  try {
    transcode(123n, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Function 作为输入', () => {
  try {
    transcode(function(){}, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('RegExp 作为输入', () => {
  try {
    transcode(/test/, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Date 作为输入', () => {
  try {
    transcode(new Date(), 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Error 作为输入', () => {
  try {
    transcode(new Error(), 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 数值特殊值测试
test('NaN 作为编码', () => {
  try {
    const source = Buffer.from('Test', 'utf8');
    transcode(source, NaN, 'utf16le');
    return false;
  } catch (e) {
    return true; // 应该报错
  }
});

test('Infinity 作为编码', () => {
  try {
    const source = Buffer.from('Test', 'utf8');
    transcode(source, 'utf8', Infinity);
    return false;
  } catch (e) {
    return true; // 应该报错
  }
});

test('-Infinity 作为编码', () => {
  try {
    const source = Buffer.from('Test', 'utf8');
    transcode(source, -Infinity, 'utf16le');
    return false;
  } catch (e) {
    return true; // 应该报错
  }
});

// 编码名称极端情况
test('非常长的编码名称', () => {
  try {
    const source = Buffer.from('Test', 'utf8');
    const longEncoding = 'utf8' + 'x'.repeat(1000);
    transcode(source, longEncoding, 'utf16le');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode') || e.message.includes('ILLEGAL_ARGUMENT');
  }
});

test('包含特殊字符的编码名称', () => {
  try {
    const source = Buffer.from('Test', 'utf8');
    transcode(source, 'utf8\x00null', 'utf16le');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode') || e.message.includes('ILLEGAL_ARGUMENT');
  }
});

test('包含换行符的编码名称', () => {
  try {
    const source = Buffer.from('Test', 'utf8');
    transcode(source, 'utf8\n', 'utf16le');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode') || e.message.includes('ILLEGAL_ARGUMENT');
  }
});

// WeakMap/WeakSet 等现代 JS 类型
test('WeakMap 作为输入', () => {
  try {
    transcode(new WeakMap(), 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('WeakSet 作为输入', () => {
  try {
    transcode(new WeakSet(), 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Map 作为输入', () => {
  try {
    transcode(new Map(), 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Set 作为输入', () => {
  try {
    transcode(new Set(), 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// Promise 等异步类型
test('Promise 作为输入', () => {
  try {
    transcode(Promise.resolve(), 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 生成器函数
test('Generator 作为输入', () => {
  try {
    function* gen() { yield 1; }
    transcode(gen(), 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// ArrayBuffer 的各种视图类型（确认不支持）
test('Float32Array 作为输入（不支持）', () => {
  try {
    const arr = new Float32Array([65, 66, 67]);
    transcode(arr, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Int32Array 作为输入（不支持）', () => {
  try {
    const arr = new Int32Array([65, 66, 67]);
    transcode(arr, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 原型链相关测试
test('Buffer 子类实例', () => {
  class CustomBuffer extends Buffer {}
  const source = CustomBuffer.from('Test', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 8;
});

// 多重嵌套参数
test('嵌套数组作为参数', () => {
  try {
    transcode([[1, 2, 3]], 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
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
