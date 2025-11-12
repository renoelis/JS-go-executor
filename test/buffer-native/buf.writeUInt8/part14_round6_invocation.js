// buf.writeUInt8() - 第6轮补漏：方法调用方式和上下文测试
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

// call/apply 调用方式
test('使用 call 方法调用', () => {
  const buf = Buffer.alloc(4);
  const ret = Buffer.prototype.writeUInt8.call(buf, 111, 0);
  return buf[0] === 111 && ret === 1;
});

test('使用 apply 方法调用', () => {
  const buf = Buffer.alloc(4);
  const ret = Buffer.prototype.writeUInt8.apply(buf, [222, 1]);
  return buf[1] === 222 && ret === 2;
});

test('call 传入 Uint8Array', () => {
  const arr = new Uint8Array(4);
  Buffer.prototype.writeUInt8.call(arr, 99, 0);
  return arr[0] === 99;
});

test('apply 传入 Uint8Array', () => {
  const arr = new Uint8Array(4);
  Buffer.prototype.writeUInt8.apply(arr, [88, 1]);
  return arr[1] === 88;
});

// bind 调用
test('使用 bind 绑定后调用', () => {
  const buf = Buffer.alloc(4);
  const bound = buf.writeUInt8.bind(buf);
  const ret = bound(99, 2);
  return buf[2] === 99 && ret === 3;
});

test('bind 绑定其他 Buffer', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  const bound = buf1.writeUInt8.bind(buf2);
  bound(77, 0);
  return buf2[0] === 77 && buf1[0] === 0;
});

test('bind 预设第一个参数', () => {
  const buf = Buffer.alloc(4);
  const bound = buf.writeUInt8.bind(buf, 123);
  const ret = bound(0);
  return buf[0] === 123 && ret === 1;
});

test('bind 预设所有参数', () => {
  const buf = Buffer.alloc(4);
  const bound = buf.writeUInt8.bind(buf, 200, 2);
  const ret = bound();
  return buf[2] === 200 && ret === 3;
});

// 解构调用（会丢失 this）
test('解构后调用抛错', () => {
  const buf = Buffer.alloc(4);
  const { writeUInt8 } = buf;
  try {
    writeUInt8(88, 0);
    return false;
  } catch (e) {
    return e.message.includes('Cannot') || e.message.includes('undefined');
  }
});

// 额外参数
test('传入额外参数被忽略', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(50, 0, 999, 'extra', {});
  return buf[0] === 50 && ret === 1;
});

test('传入大量额外参数', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(100, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
  return buf[0] === 100 && ret === 1;
});

// 参数缺失
test('只传 value 不传 offset 默认为 0', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(123);
  return buf[0] === 123 && ret === 1;
});

test('不传任何参数 value 默认为 0', () => {
  const buf = Buffer.alloc(4);
  buf[0] = 255; // 先设置非0值
  const ret = buf.writeUInt8();
  return buf[0] === 0 && ret === 1;
});

// arguments 对象
test('使用 arguments 传参', () => {
  const buf = Buffer.alloc(4);
  function testFunc() {
    return buf.writeUInt8.apply(buf, arguments);
  }
  const ret = testFunc(150, 1);
  return buf[1] === 150 && ret === 2;
});

// 展开运算符
test('使用展开运算符传参', () => {
  const buf = Buffer.alloc(4);
  const args = [200, 2];
  const ret = buf.writeUInt8(...args);
  return buf[2] === 200 && ret === 3;
});

// 方法引用存储
test('方法引用存储后调用', () => {
  const buf = Buffer.alloc(4);
  const fn = Buffer.prototype.writeUInt8;
  const ret = fn.call(buf, 88, 0);
  return buf[0] === 88 && ret === 1;
});

test('实例方法引用配合 bind', () => {
  const buf = Buffer.alloc(4);
  const fn = buf.writeUInt8;
  const bound = fn.bind(buf);
  const ret = bound(77, 1);
  return buf[1] === 77 && ret === 2;
});

// 方法作为回调
test('作为回调函数使用需要 bind', () => {
  const buf = Buffer.alloc(4);
  const writeOps = [
    { value: 10, offset: 0 },
    { value: 20, offset: 1 },
    { value: 30, offset: 2 }
  ];

  writeOps.forEach(op => {
    buf.writeUInt8(op.value, op.offset);
  });

  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

// 在循环中调用
test('for 循环中调用', () => {
  const buf = Buffer.alloc(10);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt8(i * 10, i);
  }
  return buf[0] === 0 && buf[5] === 50 && buf[9] === 90;
});

test('while 循环中调用', () => {
  const buf = Buffer.alloc(5);
  let i = 0;
  while (i < 5) {
    buf.writeUInt8(i + 100, i);
    i++;
  }
  return buf[0] === 100 && buf[4] === 104;
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
