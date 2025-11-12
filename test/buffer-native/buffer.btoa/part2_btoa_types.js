// buffer.btoa() - Input Types Tests
const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 字符串类型测试
test('普通字符串', () => {
  const result = btoa('test');
  return result === 'dGVzdA==';
});

test('String对象', () => {
  const result = btoa(new String('test'));
  return result === 'dGVzdA==';
});

test('模板字符串', () => {
  const result = btoa(`test`);
  return result === 'dGVzdA==';
});

test('空字符串字面量', () => {
  const result = btoa('');
  return result === '';
});

test('toString转换 - 数字', () => {
  const result = btoa(123);
  return result === 'MTIz';
});

test('toString转换 - 布尔值true', () => {
  const result = btoa(true);
  return result === 'dHJ1ZQ==';
});

test('toString转换 - 布尔值false', () => {
  const result = btoa(false);
  return result === 'ZmFsc2U=';
});

test('toString转换 - 数组', () => {
  const result = btoa([1, 2, 3]);
  return result === 'MSwyLDM=';
});

test('toString转换 - 对象', () => {
  const result = btoa({});
  return result === 'W29iamVjdCBPYmplY3Rd';
});

test('toString转换 - 自定义toString', () => {
  const obj = {
    toString: function() {
      return 'custom';
    }
  };
  const result = btoa(obj);
  return result === 'Y3VzdG9t';
});

test('null参数', () => {
  const result = btoa(null);
  return result === 'bnVsbA==';
});

test('undefined参数', () => {
  const result = btoa(undefined);
  return result === 'dW5kZWZpbmVk';
});

test('Symbol.toPrimitive转换', () => {
  const obj = {
    [Symbol.toPrimitive]: function(hint) {
      return 'primitive';
    }
  };
  const result = btoa(obj);
  return result === 'cHJpbWl0aXZl';
});

test('valueOf转换', () => {
  const obj = {
    valueOf: function() {
      return 'value';
    },
    toString: function() {
      return 'string';
    }
  };
  const result = btoa(obj);
  return result === 'c3RyaW5n'; // toString优先
});

test('字符串拼接', () => {
  const result = btoa('hello' + ' ' + 'world');
  return result === 'aGVsbG8gd29ybGQ=';
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
