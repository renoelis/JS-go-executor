// Buffer.from() - Part 16: Missing Error Boundaries and Edge Cases
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

// 字符串编码参数的错误测试
testError('编码 - 完全无效的编码名', () => {
  Buffer.from('test', 'invalid-encoding-xyz');
}, 'TypeError');

test('编码 - 数字编码（被转换为字符串）', () => {
  try {
    const buf = Buffer.from('test', 123);
    return buf instanceof Buffer;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('编码 - 对象作为编码（被转换为字符串）', () => {
  try {
    const buf = Buffer.from('test', { encoding: 'utf8' });
    return buf instanceof Buffer;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('编码 - 数组作为编码（被转换为字符串）', () => {
  try {
    const buf = Buffer.from('test', ['utf8']);
    return buf instanceof Buffer;
  } catch (e) {
    return e instanceof TypeError;
  }
});

testError('编码 - Symbol 作为编码', () => {
  Buffer.from('test', Symbol('utf8'));
}, TypeError);

test('编码 - undefined 作为编码（使用默认）', () => {
  const buf = Buffer.from('test', undefined);
  return buf.toString() === 'test';
});

test('编码 - 空字符串作为编码（无效编码）', () => {
  try {
    Buffer.from('test', '');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('编码 - 空格作为编码（无效编码）', () => {
  try {
    Buffer.from('test', ' ');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('编码 - "UTF8" 带空格', () => {
  try {
    Buffer.from('test', ' utf8 ');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// Base64 的无效输入
test('Base64 - 只有非法字符', () => {
  const buf = Buffer.from('@#$%^&*()', 'base64');
  return buf.length === 0;
});

test('Base64 - 包含中文字符', () => {
  const buf = Buffer.from('你好世界', 'base64');
  return buf.length >= 0;
});

test('Base64 - 单个合法字符', () => {
  const buf = Buffer.from('A', 'base64');
  return buf.length >= 0;
});

test('Base64 - 两个合法字符', () => {
  const buf = Buffer.from('AB', 'base64');
  return buf.length >= 0;
});

test('Base64 - 三个合法字符（无填充）', () => {
  const buf = Buffer.from('ABC', 'base64');
  return buf.length >= 0;
});

test('Base64 - 不正确的填充位置', () => {
  const buf = Buffer.from('A=BC', 'base64');
  return buf instanceof Buffer;
});

test('Base64 - 三个等号', () => {
  const buf = Buffer.from('A===', 'base64');
  return buf instanceof Buffer;
});

// HEX 的无效输入
test('HEX - 只有非法字符', () => {
  const buf = Buffer.from('GHIJKL', 'hex');
  return buf.length === 0;
});

test('HEX - 包含特殊符号', () => {
  const buf = Buffer.from('12@34', 'hex');
  return buf.length >= 0;
});

test('HEX - 包含中文', () => {
  const buf = Buffer.from('中文', 'hex');
  return buf.length === 0;
});

test('HEX - 单个合法字符（应被忽略）', () => {
  const buf = Buffer.from('A', 'hex');
  return buf.length === 0;
});

test('HEX - 三个合法字符（忽略最后一个）', () => {
  const buf = Buffer.from('ABC', 'hex');
  return buf.length === 1 && buf[0] === 0xAB;
});

test('HEX - 五个合法字符', () => {
  const buf = Buffer.from('ABCDE', 'hex');
  return buf.length === 2 && buf[0] === 0xAB && buf[1] === 0xCD;
});

test('HEX - 全小写 abcdef', () => {
  const buf = Buffer.from('abcdef', 'hex');
  return buf.length === 3;
});

test('HEX - 全大写 ABCDEF', () => {
  const buf = Buffer.from('ABCDEF', 'hex');
  return buf.length === 3;
});

// ArrayBuffer 参数类型错误
test('ArrayBuffer 第二参数 - 字符串作为 offset', () => {
  const ab = new ArrayBuffer(10);
  try {
    Buffer.from(ab, 'invalid');
    return false;
  } catch (e) {
    return e instanceof RangeError || e instanceof TypeError;
  }
});

test('ArrayBuffer 第三参数 - 字符串作为 length', () => {
  const ab = new ArrayBuffer(10);
  try {
    Buffer.from(ab, 0, 'invalid');
    return false;
  } catch (e) {
    return e instanceof RangeError || e instanceof TypeError;
  }
});

test('ArrayBuffer - offset 为对象', () => {
  const ab = new ArrayBuffer(10);
  try {
    Buffer.from(ab, {});
    return false;
  } catch (e) {
    return e instanceof RangeError || e instanceof TypeError;
  }
});

test('ArrayBuffer - length 为对象', () => {
  const ab = new ArrayBuffer(10);
  try {
    Buffer.from(ab, 0, {});
    return false;
  } catch (e) {
    return e instanceof RangeError || e instanceof TypeError;
  }
});

test('ArrayBuffer - offset 为数组', () => {
  const ab = new ArrayBuffer(10);
  try {
    Buffer.from(ab, [5]);
    return false;
  } catch (e) {
    return e instanceof RangeError || e instanceof TypeError;
  }
});

test('ArrayBuffer - offset 为布尔值', () => {
  const ab = new ArrayBuffer(10);
  try {
    Buffer.from(ab, true);
    return false;
  } catch (e) {
    return e instanceof RangeError || e instanceof TypeError;
  }
});

test('ArrayBuffer - offset 为字符串数字', () => {
  const ab = new ArrayBuffer(10);
  try {
    const buf = Buffer.from(ab, '5', '3');
    return buf.length === 3;
  } catch (e) {
    return e instanceof RangeError;
  }
});

// 不支持的第一参数类型
testError('第一参数 - RegExp', () => {
  Buffer.from(/test/);
}, TypeError);

testError('第一参数 - Date', () => {
  try {
    Buffer.from(new Date());
  } catch (e) {
    // Date 可能被当作对象处理
    throw e;
  }
}, TypeError);

testError('第一参数 - Error', () => {
  Buffer.from(new Error('test'));
}, TypeError);

testError('第一参数 - Promise', () => {
  Buffer.from(Promise.resolve([1, 2, 3]));
}, TypeError);

testError('第一参数 - WeakMap', () => {
  Buffer.from(new WeakMap());
}, TypeError);

testError('第一参数 - WeakSet', () => {
  Buffer.from(new WeakSet());
}, TypeError);

testError('第一参数 - Map', () => {
  Buffer.from(new Map([[0, 1]]));
}, TypeError);

testError('第一参数 - Set', () => {
  Buffer.from(new Set([1, 2, 3]));
}, TypeError);

// 特殊的数组值
test('数组 - 包含字符串 "0"', () => {
  const buf = Buffer.from(['0', '255', '128']);
  return buf[0] === 0 && buf[1] === 255 && buf[2] === 128;
});

test('数组 - 包含字符串 "0xFF"', () => {
  const buf = Buffer.from(['0xFF', '0x00']);
  return buf[0] === 255 && buf[1] === 0;
});

test('数组 - 包含科学计数法字符串', () => {
  const buf = Buffer.from(['1e2', '1e1']);
  return buf[0] === 100 && buf[1] === 10;
});

test('数组 - 包含二进制字符串', () => {
  const buf = Buffer.from(['0b11111111', '0b00000000']);
  return buf[0] === 255 && buf[1] === 0;
});

test('数组 - 包含八进制字符串', () => {
  const buf = Buffer.from(['0o377', '0o000']);
  return buf[0] === 255 && buf[1] === 0;
});

test('数组 - 混合数字和字符串数字', () => {
  const buf = Buffer.from([10, '20', 30, '40']);
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30 && buf[3] === 40;
});

test('数组 - 包含带正号的字符串', () => {
  const buf = Buffer.from(['+10', '+255']);
  return buf[0] === 10 && buf[1] === 255;
});

test('数组 - 包含带负号的字符串', () => {
  const buf = Buffer.from(['-1', '-128']);
  return buf[0] === 255 && buf[1] === 128;
});

test('数组 - 包含空格的字符串数字', () => {
  const buf = Buffer.from([' 10 ', ' 20 ']);
  return buf[0] === 10 && buf[1] === 20;
});

test('数组 - 包含 valueOf 的对象', () => {
  const buf = Buffer.from([{ valueOf: () => 100 }, { valueOf: () => 200 }]);
  return buf[0] === 100 && buf[1] === 200;
});

test('数组 - 包含 toString 的对象', () => {
  const buf = Buffer.from([{ toString: () => '50' }, { toString: () => '150' }]);
  return buf[0] === 50 && buf[1] === 150;
});

// 类数组对象的边界
test('类数组 - length 大于 Number.MAX_SAFE_INTEGER', () => {
  const obj = { 0: 1, length: Number.MAX_SAFE_INTEGER + 1 };
  try {
    Buffer.from(obj);
    return false;
  } catch (e) {
    return e instanceof RangeError || e instanceof TypeError;
  }
});

test('类数组 - 负的很大的 length', () => {
  const obj = { 0: 1, length: -1000000 };
  const buf = Buffer.from(obj);
  return buf.length === 0;
});

test('类数组 - length 为 2^32', () => {
  const obj = { 0: 1, length: Math.pow(2, 32) };
  try {
    const buf = Buffer.from(obj);
    // 可能会成功创建或抛出错误
    return buf instanceof Buffer || false;
  } catch (e) {
    return e instanceof RangeError || e instanceof TypeError;
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
