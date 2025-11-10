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

// ============ 第 3 轮：根据 Node 实际行为补充边缘分支测试 ============

// 测试参数转换边缘情况
test('参数转换：start 为小数点后全是 9 的浮点数', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(2.999999999);
  // 应该截断为 2
  return sliced.toString() === 'llo world';
});

test('参数转换：start 为负数小数', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-2.5);
  // -2.5 截断为 -2，从倒数第 2 个开始
  return sliced.toString() === 'lo';
});

test('参数转换：科学计数法表示的参数', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(1e0, 3e0);
  return sliced.toString() === 'el';
});

test('参数转换：字符串 "0x10" 进制表示', () => {
  const buf = Buffer.from('hello world');
  // "0x10" 作为字符串会被 parseInt 解析，实际会变成 0（只看前面合法部分）
  const sliced = buf.slice('0x10', 5);
  return sliced.length === 0; // '0x10' -> 0, slice(0, 5) 但结果不符合预期时返回空
});

// 测试非常规的边界组合
test('边界组合：start 和 end 都是 -0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-0, -0);
  return sliced.length === 0;
});

test('边界组合：start 为正 0，end 为负 0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(+0, -0);
  return sliced.length === 0;
});

test('边界组合：start 大于 length，end 也大于 length', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(10, 20);
  return sliced.length === 0;
});

test('边界组合：start 为负且大于 length，end 为正', () => {
  const buf = Buffer.from('hi'); // length 2
  const sliced = buf.slice(-10, 1);
  // -10 会被限制为 0
  return sliced.toString() === 'h' && sliced.length === 1;
});

test('边界组合：start 为 0，end 为负数且绝对值大于 length', () => {
  const buf = Buffer.from('hi'); // length 2
  const sliced = buf.slice(0, -10);
  // -10 会被限制为 0
  return sliced.length === 0;
});

// 测试连续负索引
test('连续负索引：-1 表示最后一个字节', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-1);
  return sliced.toString() === 'o' && sliced.length === 1;
});

test('连续负索引：-length 表示从头开始', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-5);
  return sliced.toString() === 'hello';
});

test('连续负索引：start 和 end 都是 -1', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-1, -1);
  return sliced.length === 0;
});

test('连续负索引：start 为 -3，end 为 -1', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-3, -1);
  return sliced.toString() === 'll' && sliced.length === 2;
});

// 测试二进制数据的特殊值
test('二进制特殊值：全 0 buffer 的 slice', () => {
  const buf = Buffer.alloc(10); // 全是 0
  const sliced = buf.slice(2, 5);
  return sliced.length === 3 && sliced[0] === 0 && sliced[1] === 0 && sliced[2] === 0;
});

test('二进制特殊值：全 0xff buffer 的 slice', () => {
  const buf = Buffer.alloc(10, 0xff);
  const sliced = buf.slice(2, 5);
  return sliced.length === 3 && sliced[0] === 0xff && sliced[1] === 0xff && sliced[2] === 0xff;
});

test('二进制特殊值：混合 0x00 和 0xff 的 buffer', () => {
  const buf = Buffer.from([0x00, 0xff, 0x00, 0xff, 0x00]);
  const sliced = buf.slice(1, 4);
  return sliced.length === 3 && sliced[0] === 0xff && sliced[1] === 0x00 && sliced[2] === 0xff;
});

// 测试 slice 后的写入行为
test('写入行为：slice 后立即写入', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  sliced[0] = 0x41; // 'A'
  return buf[0] === 0x41 && sliced.toString() === 'Ael';
});

test('写入行为：原 buffer 写入影响多个 slice', () => {
  const buf = Buffer.from('hello world');
  const slice1 = buf.slice(0, 5);
  const slice2 = buf.slice(0, 5);
  buf[0] = 0x48; // 'H'
  return slice1[0] === 0x48 && slice2[0] === 0x48;
});

test('写入行为：不同 slice 区域不互相影响', () => {
  const buf = Buffer.from('hello world');
  const slice1 = buf.slice(0, 5);
  const slice2 = buf.slice(6, 11);
  slice1[0] = 0x48; // 'H'
  return slice2[0] === 0x77 && slice2.toString() === 'world';
});

// 测试 Symbol.toStringTag
test('Symbol.toStringTag：slice 返回的 Buffer 有正确的类型标签', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return Object.prototype.toString.call(sliced) === '[object Uint8Array]';
});

// 测试 slice 后的迭代器
test('迭代器：slice 可以被 for...of 遍历', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  const values = [];
  for (const byte of sliced) {
    values.push(byte);
  }
  return values.length === 3 && values[0] === 2 && values[1] === 3 && values[2] === 4;
});

test('迭代器：空 slice 可以被遍历', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(2, 2);
  let count = 0;
  for (const byte of sliced) {
    count++;
  }
  return count === 0;
});

// 测试 slice 与数组方法
test('数组方法：slice 支持 indexOf', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 5);
  return sliced.indexOf('l') === 2;
});

test('数组方法：slice 支持 includes', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return sliced.includes('el');
});

test('数组方法：slice 支持 lastIndexOf', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  return sliced.lastIndexOf('l') === 3;
});

// 测试 slice 的 JSON 序列化
test('JSON 序列化：slice 可以被 JSON.stringify', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 2);
  const json = JSON.stringify(sliced);
  const parsed = JSON.parse(json);
  return parsed.type === 'Buffer' && parsed.data[0] === 1 && parsed.data[1] === 2;
});

// 测试极小和极大的 offset
test('极端 offset：offset 为 Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(Number.MAX_SAFE_INTEGER);
  return sliced.length === 0;
});

test('极端 offset：offset 为 Number.MIN_SAFE_INTEGER', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(Number.MIN_SAFE_INTEGER);
  // 应该从 0 开始
  return sliced.toString() === 'hello';
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
