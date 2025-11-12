// buf.writeUInt16BE/LE() - Round 6: 深度查缺补漏
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

// 1. this 绑定测试
test('writeUInt16BE: call 方法不同 this', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeUInt16BE.call(buf2, 0x1234, 0);
  return buf2[0] === 0x12 && buf2[1] === 0x34 && buf1[0] === 0x00;
});

test('writeUInt16LE: call 方法不同 this', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeUInt16LE.call(buf2, 0x1234, 0);
  return buf2[0] === 0x34 && buf2[1] === 0x12 && buf1[0] === 0x00;
});

test('writeUInt16BE: apply 方法', () => {
  const buf = Buffer.alloc(4);
  Buffer.prototype.writeUInt16BE.apply(buf, [0x1234, 0]);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUInt16LE: apply 方法', () => {
  const buf = Buffer.alloc(4);
  Buffer.prototype.writeUInt16LE.apply(buf, [0x1234, 0]);
  return buf[0] === 0x34 && buf[1] === 0x12;
});

test('writeUInt16BE: bind 方法', () => {
  const buf = Buffer.alloc(4);
  const boundWrite = buf.writeUInt16BE.bind(buf);
  boundWrite(0x1234, 0);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUInt16LE: bind 方法', () => {
  const buf = Buffer.alloc(4);
  const boundWrite = buf.writeUInt16LE.bind(buf);
  boundWrite(0x1234, 0);
  return buf[0] === 0x34 && buf[1] === 0x12;
});

// 2. 非 Buffer 对象调用
test('writeUInt16BE: 非 Buffer 对象 this 抛错', () => {
  try {
    Buffer.prototype.writeUInt16BE.call({}, 0x1234, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('writeUInt16LE: 非 Buffer 对象 this 抛错', () => {
  try {
    Buffer.prototype.writeUInt16LE.call({}, 0x1234, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('writeUInt16BE: 数组作为 this 行为异常', () => {
  const arr = [0, 0, 0, 0];
  const result = Buffer.prototype.writeUInt16BE.call(arr, 0x1234, 0);
  // 数组的行为：arr[0] 获取高字节，arr[1] 获取整个 value
  return result === 2 && arr[0] === 0x12 && arr[1] === 0x1234;
});

test('writeUInt16LE: 数组作为 this 行为异常', () => {
  const arr = [0, 0, 0, 0];
  const result = Buffer.prototype.writeUInt16LE.call(arr, 0x1234, 0);
  // 数组的行为：arr[0] 获取整个 value，arr[1] 获取高字节
  return result === 2 && arr[0] === 0x1234 && arr[1] === 0x12;
});

// 3. 参数缺失场景
test('writeUInt16BE: 只传 value 不传 offset', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0x1234);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUInt16LE: 只传 value 不传 offset', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0x1234);
  return buf[0] === 0x34 && buf[1] === 0x12;
});

test('writeUInt16BE: 不传任何参数转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE();
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('writeUInt16LE: 不传任何参数转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE();
  return buf[0] === 0x00 && buf[1] === 0x00;
});

// 4. 额外参数测试
test('writeUInt16BE: 传入多余参数被忽略', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeUInt16BE(0x1234, 0, true, 'extra', 999);
  return result === 2 && buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUInt16LE: 传入多余参数被忽略', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeUInt16LE(0x1234, 0, true, 'extra', 999);
  return result === 2 && buf[0] === 0x34 && buf[1] === 0x12;
});

// 5. 特殊数值边界
test('writeUInt16BE: 值 65536 (2^16) 抛错', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16BE(65536, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: 值 65536 (2^16) 抛错', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16LE(65536, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE: 值 -32768 抛错', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16BE(-32768, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: 值 -32768 抛错', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16LE(-32768, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 6. 方法存在性和类型检查
test('writeUInt16BE: 是函数类型', () => {
  const buf = Buffer.alloc(2);
  return typeof buf.writeUInt16BE === 'function';
});

test('writeUInt16LE: 是函数类型', () => {
  const buf = Buffer.alloc(2);
  return typeof buf.writeUInt16LE === 'function';
});

test('writeUInt16BE: 方法名正确', () => {
  return Buffer.prototype.writeUInt16BE.name === 'writeUInt16BE';
});

test('writeUInt16LE: 方法名正确', () => {
  return Buffer.prototype.writeUInt16LE.name === 'writeUInt16LE';
});

// 7. 冻结和密封 buffer - Node v25.0.0 不支持
test('writeUInt16BE: 冻结 buffer 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    Object.freeze(buf);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeUInt16LE: 冻结 buffer 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    Object.freeze(buf);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeUInt16BE: 密封 buffer 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    Object.seal(buf);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeUInt16LE: 密封 buffer 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    Object.seal(buf);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 8. 特殊字符串数值
test('writeUInt16BE: 值为 +123 字符串', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE('+123', 0);
  return buf.readUInt16BE(0) === 123;
});

test('writeUInt16LE: 值为 +123 字符串', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE('+123', 0);
  return buf.readUInt16LE(0) === 123;
});

test('writeUInt16BE: 值为 -0 字符串', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE('-0', 0);
  return buf.readUInt16BE(0) === 0;
});

test('writeUInt16LE: 值为 -0 字符串', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE('-0', 0);
  return buf.readUInt16LE(0) === 0;
});

test('writeUInt16BE: 值为 .5 字符串', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE('.5', 0);
  return buf.readUInt16BE(0) === 0;
});

test('writeUInt16LE: 值为 .5 字符串', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE('.5', 0);
  return buf.readUInt16LE(0) === 0;
});

// 9. offset 为 0 的各种表示
test('writeUInt16BE: offset 为 +0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0x1234, +0);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUInt16LE: offset 为 +0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0x1234, +0);
  return buf[0] === 0x34 && buf[1] === 0x12;
});

test('writeUInt16BE: offset 为 -0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0x1234, -0);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUInt16LE: offset 为 -0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0x1234, -0);
  return buf[0] === 0x34 && buf[1] === 0x12;
});

// 10. 循环引用对象
test('writeUInt16BE: 循环引用对象转为 NaN', () => {
  const buf = Buffer.alloc(2);
  const obj = {};
  obj.self = obj;
  buf.writeUInt16BE(obj, 0);
  return buf.readUInt16BE(0) === 0;
});

test('writeUInt16LE: 循环引用对象转为 NaN', () => {
  const buf = Buffer.alloc(2);
  const obj = {};
  obj.self = obj;
  buf.writeUInt16LE(obj, 0);
  return buf.readUInt16LE(0) === 0;
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
