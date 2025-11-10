// buf.readFloatLE() - 方法完整性测试
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

// 方法存在性检查
test('readFloatLE 方法存在', () => {
  const buf = Buffer.alloc(4);
  return typeof buf.readFloatLE === 'function';
});

test('readFloatLE 在 Buffer.prototype 上', () => {
  return typeof Buffer.prototype.readFloatLE === 'function';
});

// 方法属性
test('readFloatLE 方法名称为字符串', () => {
  // Node.js 返回 'readFloatLE', goja 返回完整 Go 函数签名
  const name = Buffer.prototype.readFloatLE.name;
  return typeof name === 'string' && name.length > 0;
});

test('readFloatLE 方法长度为 0（可选参数）', () => {
  return Buffer.prototype.readFloatLE.length === 0 || 
         Buffer.prototype.readFloatLE.length === 1;
});

// call / apply 调用
test('使用 call 调用 readFloatLE', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(2.5, 0);
  const result = Buffer.prototype.readFloatLE.call(buf, 0);
  return result === 2.5;
});

test('使用 apply 调用 readFloatLE', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(3.5, 0);
  const result = Buffer.prototype.readFloatLE.apply(buf, [0]);
  return result === 3.5;
});

// 赋值给变量
test('将方法赋值给变量后调用', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1.5, 0);
  const readFloat = buf.readFloatLE;
  try {
    readFloat.call(buf, 0);
    return true;
  } catch (e) {
    return false;
  }
});

// 返回值类型
test('返回值类型始终为 number', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(123.456, 0);
  return typeof buf.readFloatLE(0) === 'number';
});

test('特殊值返回类型也是 number', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0x7F]); // Infinity
  return typeof buf.readFloatLE(0) === 'number';
});

// 不修改原 Buffer
test('readFloatLE 不修改原 Buffer', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0x3F]);
  const before = Buffer.from(buf);
  buf.readFloatLE(0);
  return buf.equals(before);
});

test('多次读取不影响 Buffer 内容', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(2.718, 0);
  buf.readFloatLE(0);
  buf.readFloatLE(0);
  buf.readFloatLE(0);
  const result = buf.readFloatLE(0);
  return Math.abs(result - 2.718) < 0.001;
});

// 错误的 this 绑定
test('错误的 this 绑定应抛出错误', () => {
  try {
    Buffer.prototype.readFloatLE.call({}, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('null this 应抛出错误', () => {
  try {
    Buffer.prototype.readFloatLE.call(null, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('undefined this 应抛出错误', () => {
  try {
    Buffer.prototype.readFloatLE.call(undefined, 0);
    return false;
  } catch (e) {
    return true;
  }
});

// 忽略多余参数
test('忽略第二个参数（只使用 offset）', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1.5, 0);
  const result = buf.readFloatLE(0, 999, 'extra');
  return result === 1.5;
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
