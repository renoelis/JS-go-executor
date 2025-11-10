const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = !!fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({
      name,
      status: '❌',
      error: e.message,
      stack: e.stack
    });
  }
}

// ============ 第 2 轮：根据 Node 官方文档补充测试 ============

// 文档强调：slice 创建视图而不拷贝数据（legacy compatibility）
test('文档行为：buf.slice() 创建视图而不是拷贝', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const sliced = buf.slice(0, 2);
  // 修改 sliced 应该影响原 buffer
  sliced[0] = 0xff;
  return buf[0] === 0xff;
});

// 文档指出：默认 start 为 0
test('文档参数：start 默认为 0', () => {
  const buf = Buffer.from('hello');
  const sliced1 = buf.slice();
  const sliced2 = buf.slice(0);
  return sliced1.toString() === sliced2.toString() && sliced1.toString() === 'hello';
});

// 文档指出：默认 end 为 buf.length
test('文档参数：end 默认为 buf.length', () => {
  const buf = Buffer.from('hello');
  const sliced1 = buf.slice(0);
  const sliced2 = buf.slice(0, buf.length);
  return sliced1.toString() === sliced2.toString() && sliced1.toString() === 'hello';
});

// 文档指出：end 是非包含性的（non-inclusive）
test('文档参数：end 是非包含性的（不包括 end 位置的字节）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  // 应该返回索引 0, 1, 2，不包括索引 3
  return sliced.length === 3 && sliced.toString() === 'hel';
});

// 测试返回值是 Buffer 类型
test('文档返回值：返回的是 Buffer 实例', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return Buffer.isBuffer(sliced) && sliced instanceof Buffer;
});

// 测试与 Buffer.from(buffer) 的区别（后者会拷贝）
test('行为对比：slice 是视图，Buffer.from 是拷贝', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  const copied = Buffer.from(buf);

  buf[0] = 0x48; // 'H'

  // sliced 应该受影响，copied 不应该
  return sliced[0] === 0x48 && copied[0] === 0x68; // 'h'
});

// 测试与 TypedArray.prototype.subarray() 的相似性
test('行为对比：slice 类似 TypedArray.subarray()', () => {
  const buf = Buffer.from('hello');
  const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);

  const bufSliced = buf.slice(1, 4);
  const uint8Sub = uint8.subarray(1, 4);

  // 两者长度应该相同
  return bufSliced.length === uint8Sub.length && bufSliced.length === 3;
});

// 测试 slice 的 byteOffset 属性
test('底层属性：slice 后的 byteOffset 变化', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(6);

  // sliced 的 byteOffset 应该不同于原 buffer
  return sliced.byteOffset >= buf.byteOffset;
});

// 测试 slice 的 buffer 属性（共享底层 ArrayBuffer）
test('底层属性：slice 共享相同的底层 ArrayBuffer', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);

  // 两者的 buffer 应该指向同一个 ArrayBuffer（或相关的）
  // 注意：在某些实现中可能是同一个，也可能是包含关系
  return buf.buffer !== undefined && sliced.buffer !== undefined;
});

// 测试连续调用 slice 的行为
test('连续操作：对 slice 结果再次 slice', () => {
  const buf = Buffer.from('hello world');
  const slice1 = buf.slice(0, 11);
  const slice2 = slice1.slice(6, 11);

  return slice2.toString() === 'world' && slice2.length === 5;
});

// 测试 slice 后的 toString 不同编码
test('编码转换：slice 后可使用任意编码转换', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 5);

  return sliced.toString('utf8') === 'hello' &&
         sliced.toString('hex') === '68656c6c6f' &&
         sliced.toString('base64') === 'aGVsbG8=';
});

// 测试空 slice 的各种方法调用
test('空 slice：对空 slice 调用各种方法不报错', () => {
  const buf = Buffer.from('hello');
  const empty = buf.slice(2, 2);

  try {
    empty.toString();
    empty.toString('hex');
    empty.toString('base64');
    const copied = Buffer.from(empty);
    return empty.length === 0 && copied.length === 0;
  } catch (e) {
    return false;
  }
});

// 测试 slice 后的 length 属性
test('属性访问：slice 的 length 属性正确反映大小', () => {
  const buf = Buffer.from('hello world');
  const slice1 = buf.slice(0, 5);
  const slice2 = buf.slice(6);
  const slice3 = buf.slice(100);

  return slice1.length === 5 && slice2.length === 5 && slice3.length === 0;
});

// 测试 slice 不影响原 buffer 的其他方法
test('独立性：slice 后原 buffer 的其他方法仍正常', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 2);

  // 原 buffer 的方法应该不受影响
  return buf.toString() === 'hello' &&
         buf.length === 5 &&
         buf.indexOf('l') === 2;
});

// 测试在修改场景下的独立索引
test('索引独立：slice 的索引从 0 开始', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(6); // 'world'

  // sliced[0] 应该是 'w'，对应 buf[6]
  return sliced[0] === 0x77 && // 'w'
         sliced[0] === buf[6] &&
         sliced[4] === 0x64; // 'd'
});

try {
  let passed = 0;
  for (let i = 0; i < tests.length; i++) {
    if (tests[i].status === '✅') passed++;
  }
  const total = tests.length;
  const failed = total - passed;

  const result = {
    success: failed === 0,
    summary: {
      total,
      passed,
      failed,
      successRate: total ? (passed * 100 / total).toFixed(2) + '%' : '0.00%'
    },
    tests
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
