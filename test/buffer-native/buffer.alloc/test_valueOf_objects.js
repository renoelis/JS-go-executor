// Buffer.alloc() valueOf() method support test
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

// 测试对象的 valueOf() 方法支持
test('对象 valueOf() 返回数字', () => {
  const fillObj = {
    valueOf() {
      return 0xac;
    }
  };
  const buf = Buffer.alloc(8, fillObj);
  return buf.toString('hex') === 'acacacacacacacac';
});

test('对象 valueOf() 返回 Infinity', () => {
  const fillObj = {
    valueOf() {
      return Infinity;
    }
  };
  const buf = Buffer.alloc(2, fillObj);
  return buf.toString('hex') === '0000';
});

test('对象 valueOf() 返回 NaN', () => {
  const fillObj = {
    valueOf() {
      return NaN;
    }
  };
  const buf = Buffer.alloc(2, fillObj);
  return buf.toString('hex') === '0000';
});

test('对象 valueOf() 返回字符串', () => {
  const fillObj = {
    valueOf() {
      return "ac";
    }
  };
  const buf = Buffer.alloc(2, fillObj);
  return buf.toString('hex') === '0000'; // Node.js 行为：字符串 valueOf 结果被忽略
});

test('对象 valueOf() 返回负数', () => {
  const fillObj = {
    valueOf() {
      return -257.4;
    }
  };
  const buf = Buffer.alloc(2, fillObj);
  return buf.toString('hex') === 'ffff';
});

test('对象 valueOf() 返回 null', () => {
  const fillObj = {
    valueOf() {
      return null;
    }
  };
  const buf = Buffer.alloc(2, fillObj);
  return buf.toString('hex') === '0000';
});

test('对象没有 valueOf() 方法', () => {
  const fillObj = { someProperty: 123 };
  const buf = Buffer.alloc(2, fillObj);
  return buf.toString('hex') === '0000';
});

test('对象 valueOf() 抛出异常', () => {
  try {
    const fillObj = {
      valueOf() {
        throw new Error('valueOf error');
      }
    };
    Buffer.alloc(2, fillObj);
    return false; // 不应该到达这里
  } catch (e) {
    return e.message === 'valueOf error'; // 异常应该被传播
  }
});

// 输出结果
const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

console.log(JSON.stringify({
  tests,
  summary: {
    total: tests.length,
    passed,
    failed,
    success_rate: ((passed / tests.length) * 100).toFixed(2) + '%'
  }
}, null, 2));

return { 
  passed, 
  failed, 
  total: tests.length,
  success_rate: (passed / tests.length * 100).toFixed(2)
};
