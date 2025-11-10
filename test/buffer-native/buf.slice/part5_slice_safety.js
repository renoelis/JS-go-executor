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

// ============ 内存共享与安全性 ============

test('内存共享：slice 与原 buffer 共享内存', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  sliced[0] = 0x48; // 'H'
  return buf.toString() === 'Hello' && sliced.toString() === 'Hello';
});

test('内存共享：修改原 buffer 影响 slice', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(1, 4);
  buf[1] = 0x45; // 'E'
  return sliced.toString() === 'Ell';
});

test('内存共享：多个 slice 共享同一内存', () => {
  const buf = Buffer.from('hello world');
  const slice1 = buf.slice(0, 5);
  const slice2 = buf.slice(0, 5);
  slice1[0] = 0x48; // 'H'
  return slice2[0] === 0x48 && buf.toString() === 'Hello world';
});

test('内存共享：嵌套 slice 共享底层内存', () => {
  const buf = Buffer.from('hello');
  const slice1 = buf.slice(0, 5);
  const slice2 = slice1.slice(1, 4);
  slice2[0] = 0x45; // 'E'
  return buf[1] === 0x45 && slice1[1] === 0x45;
});

test('内存共享：slice 不影响原 buffer 的 length', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(6);
  return buf.length === 11 && sliced.length === 5;
});

// ============ 边界检查 ============

test('边界检查：slice 不允许访问超出范围的索引', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  // sliced.length === 3，访问索引 3 应该是 undefined
  return sliced[3] === undefined && sliced.length === 3;
});

test('边界检查：slice 后写入超出范围的索引不影响原 buffer', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 5);
  sliced[10] = 0x58; // 尝试写入超出 slice 范围
  // 原 buffer 的第 10 个字节不应该被修改
  return buf[10] === 0x64; // 'd'
});

test('边界检查：负索引访问 slice', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  // 负索引不是标准的数组访问方式
  return sliced[-1] === undefined;
});

// ============ 零拷贝特性 ============

test('零拷贝：slice 不复制数据，只创建视图', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(6);
  // 验证 slice 和原 buffer 共享底层 ArrayBuffer
  // 通过修改验证零拷贝
  const originalByte = buf[6];
  sliced[0] = 0x57; // 'W'
  const modified = buf[6] === 0x57;
  buf[6] = originalByte; // 恢复
  return modified;
});

test('零拷贝：连续多次 slice 仍然共享内存', () => {
  const buf = Buffer.from('hello world');
  const slice1 = buf.slice(0, 11);
  const slice2 = slice1.slice(0, 11);
  const slice3 = slice2.slice(0, 11);
  slice3[0] = 0x48; // 'H'
  return buf[0] === 0x48;
});

// ============ 大 Buffer 安全性 ============

test('大 Buffer：slice 大 buffer 不应溢出', () => {
  const size = 1024 * 10; // 10KB
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    buf[i] = i % 256;
  }
  const sliced = buf.slice(100, 200);
  return sliced.length === 100 && sliced[0] === 100 && sliced[99] === 199;
});

test('大 Buffer：slice 超大 buffer 的末尾', () => {
  const size = 1024 * 100; // 100KB
  const buf = Buffer.alloc(size);
  buf[size - 1] = 0xff;
  const sliced = buf.slice(-10);
  return sliced.length === 10 && sliced[9] === 0xff;
});

test('大 Buffer：多次 slice 大 buffer', () => {
  const size = 1024 * 10;
  const buf = Buffer.alloc(size);
  let current = buf;
  for (let i = 0; i < 10; i++) {
    current = current.slice(10, current.length - 10);
  }
  return current.length === size - 200;
});

// ============ 视图独立性 ============

test('视图独立性：slice 有独立的 length 属性', () => {
  const buf = Buffer.from('hello world');
  const slice1 = buf.slice(0, 5);
  const slice2 = buf.slice(6);
  return slice1.length === 5 && slice2.length === 5 && buf.length === 11;
});

test('视图独立性：slice 有独立的索引访问', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(6);
  // sliced[0] 应该对应 buf[6]
  return sliced[0] === buf[6] && sliced[0] === 0x77; // 'w'
});

test('视图独立性：多个不重叠 slice 互不影响', () => {
  const buf = Buffer.from('hello world');
  const slice1 = buf.slice(0, 5);
  const slice2 = buf.slice(6, 11);
  slice1[0] = 0x48; // 'H'
  return slice2[0] === 0x77 && slice2.toString() === 'world';
});

// ============ 边界溢出保护 ============

test('溢出保护：start 大于 buffer 长度返回空 buffer', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(100);
  return sliced.length === 0;
});

test('溢出保护：end 大于 buffer 长度截止到末尾', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 100);
  return sliced.length === 5 && sliced.toString() === 'hello';
});

test('溢出保护：start 和 end 都超出范围返回空 buffer', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(100, 200);
  return sliced.length === 0;
});

test('溢出保护：负索引超出范围的处理', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-100, -10);
  return sliced.length === 0;
});

// ============ TypedArray 互操作 ============

test('TypedArray：slice buffer 后可作为 TypedArray 查看', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const sliced = buf.slice(0, 4);
  const uint8 = new Uint8Array(sliced.buffer, sliced.byteOffset, sliced.length);
  return uint8[0] === 0x01 && uint8[3] === 0x04;
});

test('TypedArray：slice 后修改通过 TypedArray 查看', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const sliced = buf.slice(1, 3);
  const uint8 = new Uint8Array(sliced.buffer, sliced.byteOffset, sliced.length);
  uint8[0] = 0xff;
  return sliced[0] === 0xff && buf[1] === 0xff;
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
