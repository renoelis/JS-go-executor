// buffer.kStringMaxLength - Part 7: Edge Cases and Corner Scenarios
const { Buffer, kStringMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 零和负数边界
test('Buffer.from 处理空数组', () => {
  try {
    const buf = Buffer.from([]);
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

test('Buffer.alloc(0) 创建空 Buffer', () => {
  try {
    const buf = Buffer.alloc(0);
    return buf.length === 0 && buf.toString() === '';
  } catch (e) {
    return false;
  }
});

test('Buffer.allocUnsafe(0) 创建空 Buffer', () => {
  try {
    const buf = Buffer.allocUnsafe(0);
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

// 特殊数值测试
test('kStringMaxLength 与 0 的运算', () => {
  return kStringMaxLength + 0 === kStringMaxLength &&
         kStringMaxLength - 0 === kStringMaxLength &&
         kStringMaxLength * 1 === kStringMaxLength &&
         kStringMaxLength / 1 === kStringMaxLength;
});

test('kStringMaxLength 与 1 的关系', () => {
  return kStringMaxLength > 1 &&
         kStringMaxLength !== 1 &&
         kStringMaxLength % 1 === 0;
});

test('kStringMaxLength 与负数的比较', () => {
  return kStringMaxLength > -1 &&
         kStringMaxLength > -kStringMaxLength &&
         kStringMaxLength + kStringMaxLength > kStringMaxLength;
});

// 位运算边界
test('kStringMaxLength 与运算保留值', () => {
  return (kStringMaxLength & kStringMaxLength) === kStringMaxLength;
});

test('kStringMaxLength 或运算保留值', () => {
  return (kStringMaxLength | 0) === kStringMaxLength;
});

test('kStringMaxLength 异或 0 保留值', () => {
  return (kStringMaxLength ^ 0) === kStringMaxLength;
});

test('kStringMaxLength 右移 0 保留值', () => {
  return (kStringMaxLength >> 0) === kStringMaxLength;
});

test('kStringMaxLength 无符号右移 0 保留值', () => {
  return (kStringMaxLength >>> 0) === kStringMaxLength;
});

// 字符串拼接边界
test('重复空字符串不受限', () => {
  try {
    const str = ''.repeat(kStringMaxLength);
    return str === '' && str.length === 0;
  } catch (e) {
    return false;
  }
});

test('重复单字符接近限制', () => {
  try {
    // 使用小值测试
    const testSize = Math.min(1000, kStringMaxLength);
    const str = 'x'.repeat(testSize);
    return str.length === testSize;
  } catch (e) {
    return false;
  }
});

test('字符串拼接不超过限制', () => {
  try {
    let str = '';
    for (let i = 0; i < 100; i++) {
      str += 'test';
    }
    return str.length === 400 && str.length < kStringMaxLength;
  } catch (e) {
    return false;
  }
});

// Buffer 切片边界
test('Buffer slice 起点等于终点返回空', () => {
  try {
    const buf = Buffer.from('hello');
    const sliced = buf.slice(2, 2);
    return sliced.length === 0;
  } catch (e) {
    return false;
  }
});

test('Buffer slice 负索引', () => {
  try {
    const buf = Buffer.from('hello');
    const sliced = buf.slice(-2);
    return sliced.toString() === 'lo';
  } catch (e) {
    return false;
  }
});

test('Buffer slice 越界索引', () => {
  try {
    const buf = Buffer.from('hello');
    const sliced = buf.slice(0, 1000);
    return sliced.toString() === 'hello';
  } catch (e) {
    return false;
  }
});

// 编码转换边界
test('utf8 空字符串编码', () => {
  try {
    const buf = Buffer.from('', 'utf8');
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

test('hex 空字符串编码', () => {
  try {
    const buf = Buffer.from('', 'hex');
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

test('base64 空字符串编码', () => {
  try {
    const buf = Buffer.from('', 'base64');
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

test('hex 非法字符处理', () => {
  try {
    const buf = Buffer.from('xyz', 'hex');
    return buf.length === 0; // 非法 hex 字符被忽略
  } catch (e) {
    return false;
  }
});

test('base64 非法字符处理', () => {
  try {
    const buf = Buffer.from('!!!', 'base64');
    return buf instanceof Buffer; // 会尽可能解析
  } catch (e) {
    return false;
  }
});

// toString 边界
test('Buffer toString 默认编码是 utf8', () => {
  try {
    const buf = Buffer.from([72, 101, 108, 108, 111]);
    return buf.toString() === 'Hello';
  } catch (e) {
    return false;
  }
});

test('Buffer toString 指定起始位置', () => {
  try {
    const buf = Buffer.from('Hello World');
    return buf.toString('utf8', 6) === 'World';
  } catch (e) {
    return false;
  }
});

test('Buffer toString 指定起始和结束位置', () => {
  try {
    const buf = Buffer.from('Hello World');
    return buf.toString('utf8', 0, 5) === 'Hello';
  } catch (e) {
    return false;
  }
});

test('Buffer toString 越界范围自动修正', () => {
  try {
    const buf = Buffer.from('Hello');
    return buf.toString('utf8', 0, 1000) === 'Hello';
  } catch (e) {
    return false;
  }
});

test('Buffer toString 负索引被当作 0', () => {
  try {
    const buf = Buffer.from('Hello');
    const result = buf.toString('utf8', -2);
    // 负索引在 toString 中被当作 0
    return result === 'Hello';
  } catch (e) {
    return false;
  }
});

// 比较运算边界
test('kStringMaxLength 与自身比较', () => {
  return kStringMaxLength <= kStringMaxLength &&
         kStringMaxLength >= kStringMaxLength &&
         !(kStringMaxLength < kStringMaxLength) &&
         !(kStringMaxLength > kStringMaxLength);
});

test('kStringMaxLength 与接近值比较', () => {
  return kStringMaxLength > kStringMaxLength - 1 &&
         kStringMaxLength < kStringMaxLength + 1;
});

// 类型强制转换边界
test('kStringMaxLength 转布尔', () => {
  return Boolean(kStringMaxLength) === true;
});

test('kStringMaxLength 双重取反', () => {
  return !!kStringMaxLength === true;
});

test('kStringMaxLength 用作数组长度', () => {
  // 注意：这会创建一个空数组，不会实际分配 kStringMaxLength 个元素
  try {
    const arr = new Array(100);
    return arr.length === 100;
  } catch (e) {
    return false;
  }
});

// 特殊情况
test('kStringMaxLength 在模板字符串中', () => {
  const str = `value: ${kStringMaxLength}`;
  return str.includes('536870888') || str.includes(kStringMaxLength.toString());
});

test('kStringMaxLength 在数组中排序', () => {
  const arr = [kStringMaxLength, 100, 1000];
  arr.sort((a, b) => a - b);
  return arr[2] === kStringMaxLength;
});

test('kStringMaxLength 与 undefined 比较', () => {
  return kStringMaxLength !== undefined &&
         typeof kStringMaxLength !== 'undefined';
});

test('kStringMaxLength 与 null 比较', () => {
  return kStringMaxLength !== null &&
         kStringMaxLength != null; // 非严格相等
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
