// Buffer.isEncoding - part12: 特殊场景与组合测试
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

// 变量作用域测试
test('使用 let 声明的编码变量应正确识别', () => {
  let encoding = 'utf8';
  return Buffer.isEncoding(encoding) === true;
});

test('使用 const 声明的编码变量应正确识别', () => {
  const encoding = 'hex';
  return Buffer.isEncoding(encoding) === true;
});

test('使用 var 声明的编码变量应正确识别', () => {
  var encoding = 'base64';
  return Buffer.isEncoding(encoding) === true;
});

// 函数参数传递
test('作为函数参数传递的编码名应正确识别', () => {
  function checkEncoding(enc) {
    return Buffer.isEncoding(enc);
  }
  return checkEncoding('utf8') === true;
});

test('通过默认参数传递的编码名应正确识别', () => {
  function checkEncoding(enc = 'utf8') {
    return Buffer.isEncoding(enc);
  }
  return checkEncoding() === true;
});

test('通过剩余参数传递的编码名应正确识别', () => {
  function checkEncoding(...args) {
    return Buffer.isEncoding(args[0]);
  }
  return checkEncoding('hex', 'utf8') === true;
});

test('通过解构参数传递的编码名应正确识别', () => {
  function checkEncoding({encoding}) {
    return Buffer.isEncoding(encoding);
  }
  return checkEncoding({encoding: 'base64'}) === true;
});

// 对象属性访问
test('从对象属性读取的编码名应正确识别', () => {
  const obj = {encoding: 'utf8'};
  return Buffer.isEncoding(obj.encoding) === true;
});

test('从嵌套对象属性读取的编码名应正确识别', () => {
  const obj = {config: {encoding: 'hex'}};
  return Buffer.isEncoding(obj.config.encoding) === true;
});

test('使用方括号访问对象属性的编码名应正确识别', () => {
  const obj = {encoding: 'base64'};
  return Buffer.isEncoding(obj['encoding']) === true;
});

test('使用计算属性访问的编码名应正确识别', () => {
  const obj = {enc: 'ascii'};
  const key = 'enc';
  return Buffer.isEncoding(obj[key]) === true;
});

// 数组元素访问
test('从数组读取的编码名应正确识别', () => {
  const arr = ['utf8', 'hex', 'base64'];
  return Buffer.isEncoding(arr[0]) === true;
});

test('使用数组解构的编码名应正确识别', () => {
  const [encoding] = ['utf8'];
  return Buffer.isEncoding(encoding) === true;
});

test('使用数组 at 方法的编码名应正确识别', () => {
  const arr = ['utf8', 'hex'];
  return Buffer.isEncoding(arr.at(0)) === true;
});

test('使用数组 find 方法的编码名应正确识别', () => {
  const arr = ['unknown', 'utf8', 'invalid'];
  const encoding = arr.find(e => Buffer.isEncoding(e));
  return encoding === 'utf8';
});

// Map 和 Set
test('从 Map 读取的编码名应正确识别', () => {
  const map = new Map([['default', 'utf8']]);
  return Buffer.isEncoding(map.get('default')) === true;
});

test('从 Set 遍历的编码名应正确识别', () => {
  const set = new Set(['utf8', 'hex', 'base64']);
  const values = Array.from(set);
  return Buffer.isEncoding(values[0]) === true;
});

// 条件表达式
test('使用条件表达式的编码名应正确识别', () => {
  const useUtf8 = true;
  const encoding = useUtf8 ? 'utf8' : 'hex';
  return Buffer.isEncoding(encoding) === true;
});

test('使用逻辑或的编码名应正确识别', () => {
  const encoding = undefined || 'utf8';
  return Buffer.isEncoding(encoding) === true;
});

test('使用空值合并的编码名应正确识别', () => {
  const encoding = null ?? 'utf8';
  return Buffer.isEncoding(encoding) === true;
});

// 异常处理中的使用
test('在 try-catch 中使用应正常工作', () => {
  try {
    return Buffer.isEncoding('utf8') === true;
  } catch (e) {
    return false;
  }
});

test('在 finally 中使用应正常工作', () => {
  let result;
  try {
    result = Buffer.isEncoding('utf8');
  } finally {
    return result === true;
  }
});

// 循环中的使用
test('在 for 循环中使用应正常工作', () => {
  const encodings = ['utf8', 'hex', 'base64'];
  for (let i = 0; i < encodings.length; i++) {
    if (!Buffer.isEncoding(encodings[i])) {
      return false;
    }
  }
  return true;
});

test('在 for...of 循环中使用应正常工作', () => {
  const encodings = ['utf8', 'hex', 'base64'];
  for (const encoding of encodings) {
    if (!Buffer.isEncoding(encoding)) {
      return false;
    }
  }
  return true;
});

test('在 while 循环中使用应正常工作', () => {
  let i = 0;
  const encodings = ['utf8', 'hex'];
  while (i < encodings.length) {
    if (!Buffer.isEncoding(encodings[i])) {
      return false;
    }
    i++;
  }
  return true;
});

// 数组方法
test('在 filter 中使用应正常工作', () => {
  const encodings = ['utf8', 'unknown', 'hex', 'invalid'];
  const valid = encodings.filter(e => Buffer.isEncoding(e));
  return valid.length === 2 && valid[0] === 'utf8' && valid[1] === 'hex';
});

test('在 map 中使用应正常工作', () => {
  const encodings = ['utf8', 'unknown'];
  const results = encodings.map(e => Buffer.isEncoding(e));
  return results[0] === true && results[1] === false;
});

test('在 some 中使用应正常工作', () => {
  const encodings = ['unknown', 'utf8', 'invalid'];
  return encodings.some(e => Buffer.isEncoding(e)) === true;
});

test('在 every 中使用应正常工作', () => {
  const encodings = ['utf8', 'hex', 'base64'];
  return encodings.every(e => Buffer.isEncoding(e)) === true;
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
