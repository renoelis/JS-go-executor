// buffer.compare() - this绑定与调用上下文测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    if (pass) {
      console.log('✅', name);
    } else {
      console.log('❌', name);
    }
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log('❌', name, '-', e.message);
  }
}

test('正常的this绑定调用', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('解构后调用应该失败', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    const { compare } = buf1;
    compare(buf2);
    return false;
  } catch (e) {
    return e.message.includes('buffer') || e.message.includes('argument');
  }
});

test('call方法正确调用', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare.call(buf1, buf2);
  return result === 0;
});

test('apply方法正确调用', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare.apply(buf1, [buf2]);
  return result === 0;
});

test('null作为this应该失败', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare.call(null, buf2);
    return false;
  } catch (e) {
    return e.message.includes('buffer') || e.message.includes('argument');
  }
});

test('undefined作为this应该失败', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare.call(undefined, buf2);
    return false;
  } catch (e) {
    return e.message.includes('buffer') || e.message.includes('argument');
  }
});

test('普通对象作为this应该失败', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare.call({}, buf2);
    return false;
  } catch (e) {
    return e.message.includes('buffer') || e.message.includes('argument');
  }
});

test('数组作为this应该失败', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare.call([1, 2, 3], buf2);
    return false;
  } catch (e) {
    return e.message.includes('buffer') || e.message.includes('argument');
  }
});

test('Uint8Array作为this应该成功', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const uint8 = new Uint8Array([1, 2, 3]);
  // Uint8Array可以作为this
  const result = buf1.compare.call(uint8, buf2);
  return result === 0;
});

test('bind方法绑定后调用', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const boundCompare = buf1.compare.bind(buf1);
  const result = boundCompare(buf2);
  return result === 0;
});

test('bind到不同buffer后调用', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const buf3 = Buffer.from([1, 2, 3]);
  const boundCompare = buf1.compare.bind(buf2);
  const result = boundCompare(buf3);
  return result > 0; // buf2 [4,5,6] > buf3 [1,2,3]
});

test('作为回调函数传递', () => {
  const buffers = [
    Buffer.from([3, 2, 1]),
    Buffer.from([1, 2, 3]),
    Buffer.from([2, 2, 2])
  ];

  try {
    buffers.sort(Buffer.compare);
    return buffers[0][0] === 1 && buffers[2][0] === 3;
  } catch (e) {
    return false;
  }
});

test('箭头函数包装调用', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const compare = (a, b) => a.compare(b);
  const result = compare(buf1, buf2);
  return result === 0;
});

test('带额外属性的buffer不影响比较', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  buf2.customProp = 'test';
  buf2.customMethod = function() { return 'test'; };
  const result = buf1.compare(buf2);
  return result === 0;
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
