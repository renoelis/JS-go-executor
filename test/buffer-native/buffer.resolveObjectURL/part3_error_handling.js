// Buffer.resolveObjectURL() - Part 3: Error Handling Tests
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

// URL 解析错误（会被 try-catch 捕获）
test('完全无效的 URL 不会抛出错误', () => {
  try {
    const result = resolveObjectURL('::::invalid::::');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('包含非法字符的 URL 不会抛出错误', () => {
  try {
    const result = resolveObjectURL('blob:nodedata:<>?');
    return result === undefined || result instanceof Blob;
  } catch (e) {
    return false;
  }
});

test('超长 URL 不会抛出错误', () => {
  try {
    const longUrl = 'blob:nodedata:' + 'a'.repeat(100000);
    const result = resolveObjectURL(longUrl);
    return result === undefined || result instanceof Blob;
  } catch (e) {
    return false;
  }
});

test('不会因为无参数调用而崩溃', () => {
  try {
    const result = resolveObjectURL();
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('不会因为多参数调用而崩溃', () => {
  try {
    const result = resolveObjectURL('blob:nodedata:id1', 'extra', 'params');
    return result === undefined || result instanceof Blob;
  } catch (e) {
    return false;
  }
});

// 边界情况不会抛出错误
test('空格字符串不会抛出错误', () => {
  try {
    const result = resolveObjectURL('   ');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('只有换行符不会抛出错误', () => {
  try {
    const result = resolveObjectURL('\n\n\n');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('只有制表符不会抛出错误', () => {
  try {
    const result = resolveObjectURL('\t\t\t');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

// 特殊 URL 格式测试
test('双斜杠格式：blob://nodedata:id', () => {
  try {
    const result = resolveObjectURL('blob://nodedata:id');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('三斜杠格式：blob:///nodedata:id', () => {
  try {
    const result = resolveObjectURL('blob:///nodedata:id');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('包含主机名：blob://localhost/nodedata:id', () => {
  try {
    const result = resolveObjectURL('blob://localhost/nodedata:id');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('包含端口：blob://localhost:8080/nodedata:id', () => {
  try {
    const result = resolveObjectURL('blob://localhost:8080/nodedata:id');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('包含用户信息：blob://user:pass@host/nodedata:id', () => {
  try {
    const result = resolveObjectURL('blob://user:pass@host/nodedata:id');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

// 路径分隔符测试
test('使用斜杠而不是冒号：blob:nodedata/id', () => {
  try {
    const result = resolveObjectURL('blob:nodedata/id');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('混合斜杠和冒号：blob:nodedata/id:extra', () => {
  try {
    const result = resolveObjectURL('blob:nodedata/id:extra');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('前导斜杠：blob:/nodedata:id', () => {
  try {
    const result = resolveObjectURL('blob:/nodedata:id');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('多个前导斜杠：blob://nodedata:id（注意这是协议+主机格式）', () => {
  try {
    const result = resolveObjectURL('blob://nodedata:id');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

// 转换错误测试
test('toString 抛出错误的对象会被捕获', () => {
  const obj = {
    toString() {
      throw new Error('toString error');
    }
  };
  try {
    const result = resolveObjectURL(obj);
    return false;
  } catch (e) {
    return e.message === 'toString error';
  }
});

test('Symbol.toPrimitive 抛出错误的对象会被捕获', () => {
  const obj = {
    [Symbol.toPrimitive]() {
      throw new Error('toPrimitive error');
    }
  };
  try {
    const result = resolveObjectURL(obj);
    return false;
  } catch (e) {
    return e.message === 'toPrimitive error';
  }
});

test('getter 抛出错误的对象会被捕获', () => {
  const obj = {
    get toString() {
      throw new Error('getter error');
    }
  };
  try {
    const result = resolveObjectURL(obj);
    return false;
  } catch (e) {
    return e.message === 'getter error';
  }
});

// 返回值验证
test('返回值不是字符串或 Buffer 等其他类型', () => {
  const result = resolveObjectURL('blob:nodedata:test');
  const validTypes = ['undefined', 'object'];
  return validTypes.includes(typeof result);
});

test('返回值如果是对象则必须是 Blob', () => {
  const result = resolveObjectURL('blob:nodedata:test');
  if (typeof result === 'object' && result !== null) {
    return result instanceof Blob;
  }
  return true;
});

// 重复调用稳定性测试
test('连续调用相同参数返回一致', () => {
  const url = 'blob:nodedata:stable-test';
  const result1 = resolveObjectURL(url);
  const result2 = resolveObjectURL(url);
  return result1 === result2;
});

test('连续调用不同参数不会互相影响', () => {
  const result1 = resolveObjectURL('blob:nodedata:id1');
  const result2 = resolveObjectURL('blob:nodedata:id2');
  const result3 = resolveObjectURL('blob:nodedata:id1');
  return result1 === result3;
});

test('大量调用不会导致内存问题（简单测试）', () => {
  try {
    for (let i = 0; i < 1000; i++) {
      resolveObjectURL(`blob:nodedata:test${i}`);
    }
    return true;
  } catch (e) {
    return false;
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
