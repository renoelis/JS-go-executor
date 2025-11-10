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

// ============ 基本功能测试 ============

test('基本功能：无参数调用 - 应返回整个 buffer 的视图', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice();
  return sliced.toString() === 'hello world' && sliced.length === buf.length;
});

test('基本功能：只传 start - 从 start 到末尾', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(6);
  return sliced.toString() === 'world' && sliced.length === 5;
});

test('基本功能：传 start 和 end - 截取指定范围', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 5);
  return sliced.toString() === 'hello' && sliced.length === 5;
});

test('基本功能：start 和 end 相等 - 返回空 buffer', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(2, 2);
  return sliced.length === 0;
});

test('基本功能：start 大于 end - 返回空 buffer', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(4, 2);
  return sliced.length === 0;
});

// ============ 负索引测试 ============

test('负索引：start 为负数 - 从末尾计数', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(-5);
  return sliced.toString() === 'world' && sliced.length === 5;
});

test('负索引：end 为负数 - 从末尾计数', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, -6);
  return sliced.toString() === 'hello' && sliced.length === 5;
});

test('负索引：start 和 end 都为负数', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(-11, -6);
  return sliced.toString() === 'hello' && sliced.length === 5;
});

test('负索引：start 负数超过 buffer 长度 - 从 0 开始', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-100, 3);
  return sliced.toString() === 'hel' && sliced.length === 3;
});

test('负索引：end 负数超过 buffer 长度 - 截止到 0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, -100);
  return sliced.length === 0;
});

// ============ 边界测试 ============

test('边界：start 为 0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0);
  return sliced.toString() === 'hello';
});

test('边界：start 等于 buffer 长度 - 返回空 buffer', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(5);
  return sliced.length === 0;
});

test('边界：start 超过 buffer 长度 - 返回空 buffer', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(100);
  return sliced.length === 0;
});

test('边界：end 为 0 - 返回空 buffer', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 0);
  return sliced.length === 0;
});

test('边界：end 等于 buffer 长度', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  return sliced.toString() === 'hello';
});

test('边界：end 超过 buffer 长度 - 截止到末尾', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 100);
  return sliced.toString() === 'hello';
});

// ============ 空 buffer 测试 ============

test('空 buffer：对长度为 0 的 buffer 调用 slice()', () => {
  const buf = Buffer.alloc(0);
  const sliced = buf.slice();
  return sliced.length === 0;
});

test('空 buffer：对长度为 0 的 buffer 调用 slice(0, 0)', () => {
  const buf = Buffer.alloc(0);
  const sliced = buf.slice(0, 0);
  return sliced.length === 0;
});

test('空 buffer：对长度为 0 的 buffer 调用 slice(0, 1)', () => {
  const buf = Buffer.alloc(0);
  const sliced = buf.slice(0, 1);
  return sliced.length === 0;
});

// ============ 视图特性测试 ============

test('视图特性：slice 返回的是原 buffer 的视图，修改会互相影响', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  sliced[0] = 0x48; // 'H'
  return buf[0] === 0x48 && buf.toString() === 'Hello';
});

test('视图特性：修改原 buffer 会影响 slice 的结果', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  buf[0] = 0x48; // 'H'
  return sliced[0] === 0x48 && sliced.toString() === 'Hello';
});

test('视图特性：多层 slice 也共享底层内存', () => {
  const buf = Buffer.from('hello world');
  const sliced1 = buf.slice(0, 5);
  const sliced2 = sliced1.slice(1, 4);
  sliced2[0] = 0x45; // 'E'
  return buf[1] === 0x45 && buf.toString() === 'hEllo world';
});

// ============ 单字节 buffer 测试 ============

test('单字节 buffer：slice() 无参数', () => {
  const buf = Buffer.from('a');
  const sliced = buf.slice();
  return sliced.length === 1 && sliced.toString() === 'a';
});

test('单字节 buffer：slice(0, 1)', () => {
  const buf = Buffer.from('a');
  const sliced = buf.slice(0, 1);
  return sliced.length === 1 && sliced.toString() === 'a';
});

test('单字节 buffer：slice(0, 0)', () => {
  const buf = Buffer.from('a');
  const sliced = buf.slice(0, 0);
  return sliced.length === 0;
});

test('单字节 buffer：slice(1)', () => {
  const buf = Buffer.from('a');
  const sliced = buf.slice(1);
  return sliced.length === 0;
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
