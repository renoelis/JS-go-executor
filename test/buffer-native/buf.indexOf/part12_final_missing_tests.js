// buf.indexOf() - Final Missing Tests
// 补充官方文档中明确但未覆盖的场景
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

function testError(name, fn, expectedErrorType) {
  try {
    fn();
    tests.push({ name, status: '❌', error: 'Expected error but none thrown' });
  } catch (e) {
    const pass = e.name === expectedErrorType || e.message.includes(expectedErrorType);
    tests.push({ name, status: pass ? '✅' : '❌', error: pass ? undefined : e.message });
  }
}

// 官方文档明确的空值行为测试
test('空字符串 byteOffset < buf.length - 返回 byteOffset', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('', 2) === 2;
});

test('空字符串 byteOffset === buf.length - 返回 buf.length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('', 5) === 5;
});

test('空字符串 byteOffset > buf.length - 返回 buf.length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('', 10) === 5;
});

test('空 Buffer byteOffset < buf.length - 返回 byteOffset', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(Buffer.alloc(0), 2) === 2;
});

test('空 Buffer byteOffset === buf.length - 返回 buf.length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(Buffer.alloc(0), 5) === 5;
});

test('空 Buffer byteOffset > buf.length - 返回 buf.length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(Buffer.alloc(0), 10) === 5;
});

test('空 Uint8Array byteOffset < buf.length - 返回 byteOffset', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(new Uint8Array(0), 3) === 3;
});

test('空 Uint8Array byteOffset === buf.length - 返回 buf.length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(new Uint8Array(0), 5) === 5;
});

test('空 Uint8Array byteOffset > buf.length - 返回 buf.length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(new Uint8Array(0), 100) === 5;
});

// 官方文档：byteOffset 强制转换为数字，结果为 NaN 或 0 时搜索整个 buffer
test('byteOffset 强制转换 - undefined 搜索整个 buffer', () => {
  const buf = Buffer.from('abcdef');
  return buf.indexOf('b', undefined) === 1;
});

test('byteOffset 强制转换 - {} 搜索整个 buffer', () => {
  const buf = Buffer.from('abcdef');
  return buf.indexOf('b', {}) === 1;
});

test('byteOffset 强制转换 - null 搜索整个 buffer', () => {
  const buf = Buffer.from('abcdef');
  return buf.indexOf('b', null) === 1;
});

test('byteOffset 强制转换 - [] 搜索整个 buffer', () => {
  const buf = Buffer.from('abcdef');
  return buf.indexOf('b', []) === 1;
});

test('byteOffset 强制转换 - NaN 搜索整个 buffer', () => {
  const buf = Buffer.from('abcdef');
  return buf.indexOf('b', NaN) === 1;
});

// 官方文档：数字会被强制转换为有效字节值（0-255）
test('数字强制转换 - 99.9 转为 99', () => {
  const buf = Buffer.from('abcdef');
  return buf.indexOf(99.9) === 2; // 'c' 的 ASCII 值是 99
});

test('数字强制转换 - 256 + 99 转为 99', () => {
  const buf = Buffer.from('abcdef');
  return buf.indexOf(256 + 99) === 2;
});

test('数字强制转换 - 512 + 99 转为 99', () => {
  const buf = Buffer.from('abcdef');
  return buf.indexOf(512 + 99) === 2;
});

test('数字强制转换 - 1024 + 97 转为 97', () => {
  const buf = Buffer.from('abcdef');
  return buf.indexOf(1024 + 97) === 0; // 'a' 的 ASCII 值是 97
});

// 官方文档：value 不是 string/number/Buffer 时抛出 TypeError
testError('TypeError - value 为普通对象', () => {
  const buf = Buffer.from('hello');
  buf.indexOf({ key: 'value' });
}, 'TypeError');

testError('TypeError - value 为数组', () => {
  const buf = Buffer.from('hello');
  buf.indexOf(['a', 'b']);
}, 'TypeError');

testError('TypeError - value 为 Date', () => {
  const buf = Buffer.from('hello');
  buf.indexOf(new Date());
}, 'TypeError');

testError('TypeError - value 为 RegExp', () => {
  const buf = Buffer.from('hello');
  buf.indexOf(/test/);
}, 'TypeError');

testError('TypeError - value 为 Symbol', () => {
  const buf = Buffer.from('hello');
  buf.indexOf(Symbol('test'));
}, 'TypeError');

testError('TypeError - value 为 Function', () => {
  const buf = Buffer.from('hello');
  buf.indexOf(function() {});
}, 'TypeError');

testError('TypeError - value 为 Boolean true', () => {
  const buf = Buffer.from('hello');
  buf.indexOf(true);
}, 'TypeError');

testError('TypeError - value 为 Boolean false', () => {
  const buf = Buffer.from('hello');
  buf.indexOf(false);
}, 'TypeError');

testError('TypeError - value 为 undefined', () => {
  const buf = Buffer.from('hello');
  buf.indexOf(undefined);
}, 'TypeError');

testError('TypeError - value 为 null', () => {
  const buf = Buffer.from('hello');
  buf.indexOf(null);
}, 'TypeError');

// 官方文档示例的精确复现
test('官方示例 - buf.indexOf("this")', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.indexOf('this') === 0;
});

test('官方示例 - buf.indexOf("is")', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.indexOf('is') === 2;
});

test('官方示例 - buf.indexOf(Buffer.from("a buffer"))', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.indexOf(Buffer.from('a buffer')) === 8;
});

test('官方示例 - buf.indexOf(97)', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.indexOf(97) === 8; // 97 是 'a' 的 ASCII 值
});

test('官方示例 - buf.indexOf(Buffer.from("a buffer example"))', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.indexOf(Buffer.from('a buffer example')) === -1;
});

test('官方示例 - buf.indexOf(Buffer.from("a buffer example").slice(0, 8))', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.indexOf(Buffer.from('a buffer example').slice(0, 8)) === 8;
});

test('官方示例 - UTF-16LE indexOf("\\u03a3", 0, "utf16le")', () => {
  const utf16Buffer = Buffer.from('\u039a\u0391\u03a3\u03a3\u0395', 'utf16le');
  return utf16Buffer.indexOf('\u03a3', 0, 'utf16le') === 4;
});

test('官方示例 - UTF-16LE indexOf("\\u03a3", -4, "utf16le")', () => {
  const utf16Buffer = Buffer.from('\u039a\u0391\u03a3\u03a3\u0395', 'utf16le');
  return utf16Buffer.indexOf('\u03a3', -4, 'utf16le') === 6;
});

test('官方示例 - indexOf(99.9)', () => {
  const b = Buffer.from('abcdef');
  return b.indexOf(99.9) === 2;
});

test('官方示例 - indexOf(256 + 99)', () => {
  const b = Buffer.from('abcdef');
  return b.indexOf(256 + 99) === 2;
});

test('官方示例 - indexOf("b", undefined)', () => {
  const b = Buffer.from('abcdef');
  return b.indexOf('b', undefined) === 1;
});

test('官方示例 - indexOf("b", {})', () => {
  const b = Buffer.from('abcdef');
  return b.indexOf('b', {}) === 1;
});

test('官方示例 - indexOf("b", null)', () => {
  const b = Buffer.from('abcdef');
  return b.indexOf('b', null) === 1;
});

test('官方示例 - indexOf("b", [])', () => {
  const b = Buffer.from('abcdef');
  return b.indexOf('b', []) === 1;
});

// 使用 buf.subarray 的测试（官方文档推荐）
test('使用 buf.subarray - 部分 Buffer 比较', () => {
  const buf = Buffer.from('this is a buffer');
  const search = Buffer.from('a buffer example');
  return buf.indexOf(search.subarray(0, 8)) === 8;
});

test('使用 buf.subarray - 空 subarray', () => {
  const buf = Buffer.from('hello');
  const search = Buffer.from('world');
  return buf.indexOf(search.subarray(0, 0)) === 0;
});

test('使用 buf.subarray - 完整 subarray', () => {
  const buf = Buffer.from('hello world');
  const search = Buffer.from('world');
  return buf.indexOf(search.subarray(0, 5)) === 6;
});

test('使用 buf.subarray - 中间 subarray', () => {
  const buf = Buffer.from('abcdefghij');
  const search = Buffer.from('cdefgh');
  return buf.indexOf(search.subarray(1, 4)) === 3; // 'def'
});

// 负偏移的精确行为测试
test('负偏移 - 从末尾计算正确位置', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', -5) === 6;
});

test('负偏移 - 负偏移超出范围从头开始', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('h', -100) === 0;
});

test('负偏移 - -1 从最后一个字节开始', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('o', -1) === 4;
});

test('负偏移 - -2 从倒数第二个字节开始', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('l', -2) === 3;
});

// 编码参数的完整测试
test('encoding 参数 - utf8', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 0, 'utf8') === 6;
});

test('encoding 参数 - utf-8', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 0, 'utf-8') === 6;
});

test('encoding 参数 - UTF8', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 0, 'UTF8') === 6;
});

test('encoding 参数 - hex', () => {
  const buf = Buffer.from('48656c6c6f', 'hex'); // "Hello"
  return buf.indexOf('6c6c', 0, 'hex') === 2;
});

test('encoding 参数 - HEX', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  return buf.indexOf('6c6c', 0, 'HEX') === 2;
});

test('encoding 参数 - base64', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64'); // "Hello"
  return buf.indexOf('Hello', 0, 'utf8') === 0;
});

test('encoding 参数 - latin1', () => {
  const buf = Buffer.from('hello', 'latin1');
  return buf.indexOf('hello', 0, 'latin1') === 0;
});

test('encoding 参数 - binary', () => {
  const buf = Buffer.from('hello', 'binary');
  return buf.indexOf('hello', 0, 'binary') === 0;
});

test('encoding 参数 - ascii', () => {
  const buf = Buffer.from('hello', 'ascii');
  return buf.indexOf('hello', 0, 'ascii') === 0;
});

test('encoding 参数 - ucs2', () => {
  const buf = Buffer.from('hello', 'ucs2');
  return buf.indexOf('hello', 0, 'ucs2') === 0;
});

test('encoding 参数 - ucs-2', () => {
  const buf = Buffer.from('hello', 'ucs2');
  return buf.indexOf('hello', 0, 'ucs-2') === 0;
});

test('encoding 参数 - utf16le', () => {
  const buf = Buffer.from('hello', 'utf16le');
  return buf.indexOf('hello', 0, 'utf16le') === 0;
});

test('encoding 参数 - utf-16le', () => {
  const buf = Buffer.from('hello', 'utf16le');
  return buf.indexOf('hello', 0, 'utf-16le') === 0;
});

testError('encoding 参数 - 无效编码', () => {
  const buf = Buffer.from('hello');
  buf.indexOf('hello', 0, 'invalid-encoding');
}, 'TypeError');

testError('encoding 参数 - 空字符串', () => {
  const buf = Buffer.from('hello');
  buf.indexOf('hello', 0, '');
}, 'TypeError');

// 极端数值测试
test('极端数值 - Number.MAX_SAFE_INTEGER 作为 byteOffset', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', Number.MAX_SAFE_INTEGER) === -1;
});

test('极端数值 - Number.MIN_SAFE_INTEGER 作为 byteOffset', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', Number.MIN_SAFE_INTEGER) === 0;
});

test('极端数值 - Infinity 作为 byteOffset', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', Infinity) === -1;
});

test('极端数值 - -Infinity 作为 byteOffset', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', -Infinity) === 0;
});

test('极端数值 - 0 作为 value', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(0) === 0;
});

test('极端数值 - 255 作为 value', () => {
  const buf = Buffer.from([0, 1, 255, 3]);
  return buf.indexOf(255) === 2;
});

test('极端数值 - NaN 作为 value（转为 0）', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(NaN) === 0;
});

test('极端数值 - Infinity 作为 value（转为 0）', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(Infinity) === 0;
});

test('极端数值 - -Infinity 作为 value（转为 0）', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(-Infinity) === 0;
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
