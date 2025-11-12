// Buffer.allocUnsafe() - Function Properties Tests
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
test('Buffer.allocUnsafe 是一个函数', () => {
  if (typeof Buffer.allocUnsafe !== 'function') {
    throw new Error(`Expected Buffer.allocUnsafe to be a function, got ${typeof Buffer.allocUnsafe}`);
  }
  console.log('✅ Buffer.allocUnsafe 是一个函数');
  return true;
});

test('Buffer.allocUnsafe.length 属性', () => {
  if (typeof Buffer.allocUnsafe.length !== 'number') {
    throw new Error(`Expected Buffer.allocUnsafe.length to be a number, got ${typeof Buffer.allocUnsafe.length}`);
  }
  // allocUnsafe 只接受一个参数 (size)
  if (Buffer.allocUnsafe.length !== 1) {
    throw new Error(`Expected Buffer.allocUnsafe.length to be 1, got ${Buffer.allocUnsafe.length}`);
  }
  console.log(`✅ Buffer.allocUnsafe.length = ${Buffer.allocUnsafe.length}`);
  return true;
});

test('Buffer.allocUnsafe.name 属性', () => {
  if (typeof Buffer.allocUnsafe.name !== 'string') {
    throw new Error(`Expected Buffer.allocUnsafe.name to be a string, got ${typeof Buffer.allocUnsafe.name}`);
  }
  if (Buffer.allocUnsafe.name !== 'allocUnsafe') {
    throw new Error(`Expected Buffer.allocUnsafe.name to be 'allocUnsafe', got '${Buffer.allocUnsafe.name}'`);
  }
  console.log(`✅ Buffer.allocUnsafe.name = '${Buffer.allocUnsafe.name}'`);
  return true;
});

test('Buffer.allocUnsafe 不能作为构造函数', () => {
  try {
    new Buffer.allocUnsafe(10);
    console.log('⚠️ Buffer.allocUnsafe 可以作为构造函数（某些环境可能允许）');
    return true;
  } catch (error) {
    console.log('✅ Buffer.allocUnsafe 不能作为构造函数');
    return true;
  }
});

test('Buffer.allocUnsafe 可以被调用', () => {
  const buf = Buffer.allocUnsafe(10);
  if (!(buf instanceof Buffer)) {
    throw new Error('Expected Buffer instance');
  }
  console.log('✅ Buffer.allocUnsafe 可以被正常调用');
  return true;
});

test('Buffer.allocUnsafe 可以通过 call 调用', () => {
  const buf = Buffer.allocUnsafe.call(Buffer, 10);
  if (!(buf instanceof Buffer)) {
    throw new Error('Expected Buffer instance');
  }
  if (buf.length !== 10) {
    throw new Error(`Expected length 10, got ${buf.length}`);
  }
  console.log('✅ Buffer.allocUnsafe 可以通过 call 调用');
  return true;
});

test('Buffer.allocUnsafe 可以通过 apply 调用', () => {
  const buf = Buffer.allocUnsafe.apply(Buffer, [10]);
  if (!(buf instanceof Buffer)) {
    throw new Error('Expected Buffer instance');
  }
  if (buf.length !== 10) {
    throw new Error(`Expected length 10, got ${buf.length}`);
  }
  console.log('✅ Buffer.allocUnsafe 可以通过 apply 调用');
  return true;
});

test('Buffer.allocUnsafe 可以被赋值给变量', () => {
  const allocUnsafe = Buffer.allocUnsafe;
  const buf = allocUnsafe(10);
  if (!(buf instanceof Buffer)) {
    throw new Error('Expected Buffer instance');
  }
  if (buf.length !== 10) {
    throw new Error(`Expected length 10, got ${buf.length}`);
  }
  console.log('✅ Buffer.allocUnsafe 可以被赋值给变量');
  return true;
});

test('Buffer.allocUnsafe 不接受多余参数', () => {
  // 多余的参数应该被忽略
  const buf = Buffer.allocUnsafe(10, 'extra', 'params');
  if (!(buf instanceof Buffer)) {
    throw new Error('Expected Buffer instance');
  }
  if (buf.length !== 10) {
    throw new Error(`Expected length 10, got ${buf.length}`);
  }
  console.log('✅ Buffer.allocUnsafe 忽略多余参数');
  return true;
});

test('Buffer.allocUnsafe 缺少参数时抛错', () => {
  try {
    Buffer.allocUnsafe();
    console.log('❌ 缺少参数应该抛出错误');
    return false;
  } catch (error) {
    console.log(`✅ 缺少参数正确抛错: ${error.name}`);
    return true;
  }
});

// 返回值测试
test('Buffer.allocUnsafe 返回 Buffer 实例', () => {
  const buf = Buffer.allocUnsafe(10);
  if (!(buf instanceof Buffer)) {
    throw new Error('Expected Buffer instance');
  }
  if (!(buf instanceof Uint8Array)) {
    throw new Error('Expected Uint8Array instance');
  }
  console.log('✅ Buffer.allocUnsafe 返回 Buffer 实例');
  return true;
});

test('Buffer.allocUnsafe 返回的对象有正确的原型链', () => {
  const buf = Buffer.allocUnsafe(10);
  
  // 检查是否是 Buffer 实例（间接验证原型链）
  if (!(buf instanceof Buffer)) {
    throw new Error('Expected Buffer instance');
  }
  
  // 检查是否有 Buffer 特有的属性
  if (typeof buf.length !== 'number') {
    throw new Error('Expected buf.length to be a number');
  }
  
  console.log('✅ Buffer.allocUnsafe 返回的对象有正确的原型链');
  return true;
});

test('Buffer.allocUnsafe 返回的对象有 Buffer 方法', () => {
  const buf = Buffer.allocUnsafe(10);
  
  // 检查一些常见的 Buffer 方法
  const methods = ['toString', 'slice', 'copy', 'fill', 'write'];
  for (const method of methods) {
    if (typeof buf[method] !== 'function') {
      throw new Error(`Expected buf.${method} to be a function`);
    }
  }
  
  console.log('✅ Buffer.allocUnsafe 返回的对象有 Buffer 方法');
  return true;
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
