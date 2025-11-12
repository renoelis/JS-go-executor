// Buffer.concat() - Additional API Coverage Tests
// 补充一些可能遗漏的 Node.js v25.0.0 特定功能
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

// 函数属性测试
test('Buffer.concat函数名称正确', () => {
  return Buffer.concat.name === 'concat';
});

test('Buffer.concat函数长度正确', () => {
  return Buffer.concat.length === 2; // list 和 totalLength 两个参数
});

test('Buffer.concat是函数类型', () => {
  return typeof Buffer.concat === 'function';
});

// 内存池行为测试（根据文档，Buffer.concat可能使用内部Buffer池）
test('多次concat结果独立性', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const result1 = Buffer.concat([buf1, buf2]);
  const result2 = Buffer.concat([buf1, buf2]);
  
  // 修改第一个结果不应影响第二个
  result1[0] = 99;
  return result1[0] === 99 && result2[0] === 1;
});

// 大数组场景
test('连接大量小Buffer', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    buffers.push(Buffer.from([i % 256]));
  }
  const result = Buffer.concat(buffers);
  return result.length === 100 && result[0] === 0 && result[99] === 99;
});

// 空白字符和特殊字符
test('连接包含空白字符的Buffer', () => {
  const buf1 = Buffer.from('\t\n\r ');
  const buf2 = Buffer.from('text');
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 8 && result.toString() === '\t\n\r text';
});

test('连接包含Unicode字符的Buffer', () => {
  const buf1 = Buffer.from('Hello 世界', 'utf8');
  const buf2 = Buffer.from(' 🚀', 'utf8');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString('utf8') === 'Hello 世界 🚀';
});

test('连接包含null字节的Buffer', () => {
  const buf1 = Buffer.from([65, 0, 66]); // A\0B
  const buf2 = Buffer.from([0, 67]); // \0C
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 5 && 
         result[0] === 65 && result[1] === 0 && result[2] === 66 &&
         result[3] === 0 && result[4] === 67;
});

// totalLength的特殊值处理
test('totalLength为MAX_SAFE_INTEGER的行为', () => {
  const buf = Buffer.from('test');
  try {
    const result = Buffer.concat([buf], Number.MAX_SAFE_INTEGER);
    // 在某些环境中可能会成功创建但为空或长度不正确
    return result.length <= Number.MAX_SAFE_INTEGER;
  } catch (e) {
    // 或者抛出内存/范围错误也是可接受的
    return e.message.includes('Invalid') || e.message.includes('size') || 
           e.message.includes('memory') || e.message.includes('range') ||
           e.message.includes('too large') || e.message.includes('allocation failed');
  }
});

test('totalLength为0.5的处理', () => {
  const buf = Buffer.from('ab');
  try {
    const result = Buffer.concat([buf], 1.5);
    return false; // Node.js v25.0.0 会对小数抛出错误
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range');
  }
});

// 数组操作相关
test('使用稀疏数组', () => {
  const arr = [];
  arr[0] = Buffer.from('a');
  arr[2] = Buffer.from('c'); // 跳过索引1
  arr.length = 3;
  
  try {
    const result = Buffer.concat(arr);
    return false; // 应该失败，因为索引1是undefined
  } catch (e) {
    return e.message.includes('Buffer') || e.message.includes('Uint8Array') ||
           e.message.includes('undefined') || e.message.includes('list');
  }
});

test('数组包含getter属性', () => {
  const arr = [Buffer.from('test')];
  Object.defineProperty(arr, '1', {
    get() { return Buffer.from('getter'); }
  });
  arr.length = 2;
  
  const result = Buffer.concat(arr);
  return result.toString() === 'testgetter';
});

// 类型强制转换（Node.js v25.0.0严格类型检查）
test('totalLength字符串数字转换', () => {
  const buf = Buffer.from('hello');
  try {
    const result = Buffer.concat([buf], '3');
    return false; // 应该抛出类型错误
  } catch (e) {
    return e.message.includes('number') || e.message.includes('type');
  }
});

test('totalLength布尔值转换', () => {
  const buf = Buffer.from('test');
  try {
    const result1 = Buffer.concat([buf], true);
    return false; // 应该抛出类型错误
  } catch (e) {
    return e.message.includes('number') || e.message.includes('type');
  }
});

// Buffer池和内存相关
test('连接后原Buffer修改不影响结果', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result = Buffer.concat([buf1, buf2]);
  
  // 修改原始buffer
  buf1.fill(0);
  buf2.fill(0);
  
  return result[0] === 1 && result[3] === 4 && result[5] === 6;
});

// 参数验证细节
test('使用arguments对象作为数组', () => {
  function testConcat() {
    try {
      return Buffer.concat(arguments);
    } catch (e) {
      return e;
    }
  }
  
  const result = testConcat(Buffer.from('a'), Buffer.from('b'));
  return result instanceof Error && 
         (result.message.includes('Array') || result.message.includes('list'));
});

// 边界值精确测试
test('totalLength为1时只取第一个字节', () => {
  const buf1 = Buffer.from([0xFF, 0xFE]);
  const buf2 = Buffer.from([0xFD, 0xFC]);
  const result = Buffer.concat([buf1, buf2], 1);
  return result.length === 1 && result[0] === 0xFF;
});

test('超长数组边界', () => {
  try {
    const buffers = new Array(1000).fill(Buffer.from('x'));
    const result = Buffer.concat(buffers);
    return result.length === 1000 && result.toString() === 'x'.repeat(1000);
  } catch (e) {
    // 如果内存不足也是合理的
    return e.message.includes('memory') || e.message.includes('size');
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
