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

// ============ 第 4 轮：系统性审阅现有测试，补充组合场景 ============

// 多参数类型组合测试
test('组合：浮点数 start + 字符串数字 end', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(1.5, '5');
  return sliced.toString() === 'ello' && sliced.length === 4;
});

test('组合：负浮点数 start + 正浮点数 end', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-3.7, 4.2);
  return sliced.toString() === 'll' && sliced.length === 2;
});

test('组合：NaN start + 正常 end', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(NaN, 3);
  return sliced.toString() === 'hel' && sliced.length === 3;
});

test('组合：正常 start + Infinity end', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(1, Infinity);
  return sliced.toString() === 'ello' && sliced.length === 4;
});

test('组合：-Infinity start + Infinity end', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-Infinity, Infinity);
  return sliced.toString() === 'hello' && sliced.length === 5;
});

test('组合：null start + undefined end', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(null, undefined);
  return sliced.toString() === 'hello' && sliced.length === 5;
});

test('组合：布尔 start + 布尔 end', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(false, true);
  return sliced.toString() === 'h' && sliced.length === 1;
});

test('组合：对象 start + 数组 end', () => {
  const buf = Buffer.from('hello');
  const objStart = { valueOf: () => 1 };
  const arrEnd = [4];
  const sliced = buf.slice(objStart, arrEnd);
  return sliced.toString() === 'ell' && sliced.length === 3;
});

// Buffer + offset + length 类型的组合（虽然 slice 不直接用 length，但测试参数组合）
test('组合：空 buffer + 任意参数', () => {
  const buf = Buffer.alloc(0);
  const slice1 = buf.slice(0, 0);
  const slice2 = buf.slice(1, 5);
  const slice3 = buf.slice(-1, -1);
  return slice1.length === 0 && slice2.length === 0 && slice3.length === 0;
});

test('组合：单字节 buffer + 各种参数组合', () => {
  const buf = Buffer.from('a');
  const slice1 = buf.slice(0, 1);
  const slice2 = buf.slice(0, 0);
  const slice3 = buf.slice(1, 1);
  const slice4 = buf.slice(-1, -1);
  return slice1.length === 1 && slice2.length === 0 && slice3.length === 0 && slice4.length === 0;
});

// 边界点的系统性覆盖
test('边界点：start = 0, end = 1（最小有效范围）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 1);
  return sliced.toString() === 'h' && sliced.length === 1;
});

test('边界点：start = length-1, end = length（最后一个字节）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(4, 5);
  return sliced.toString() === 'o' && sliced.length === 1;
});

test('边界点：start = 0, end = length（完整范围）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  return sliced.toString() === 'hello' && sliced.length === 5;
});

test('边界点：start = 1, end = length-1（去除首尾）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(1, 4);
  return sliced.toString() === 'ell' && sliced.length === 3;
});

test('边界点：start = end = length（边界空 slice）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(5, 5);
  return sliced.length === 0;
});

test('边界点：start = end = 0（起始空 slice）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 0);
  return sliced.length === 0;
});

test('边界点：start = end = length/2（中间空 slice）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(2, 2);
  return sliced.length === 0;
});

// 不同编码输入的 slice 组合
test('编码组合：从 hex 创建后 slice 并转 utf8', () => {
  const buf = Buffer.from('48656c6c6f', 'hex'); // 'Hello'
  const sliced = buf.slice(0, 5);
  return sliced.toString('utf8') === 'Hello';
});

test('编码组合：从 base64 创建后 slice 并转 hex', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64'); // 'Hello'
  const sliced = buf.slice(1, 4);
  return sliced.toString('hex') === '656c6c';
});

test('编码组合：从 latin1 创建后 slice 并转 ascii', () => {
  const buf = Buffer.from('Hello', 'latin1');
  const sliced = buf.slice(0, 5);
  return sliced.toString('ascii') === 'Hello';
});

// 静默处理的场景（不抛错但有特殊行为）
test('静默处理：start 略大于 end 返回空', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(3, 2);
  return sliced.length === 0;
});

test('静默处理：start 远大于 end 返回空', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(100, 1);
  return sliced.length === 0;
});

test('静默处理：负数参数超出范围被限制', () => {
  const buf = Buffer.from('hi');
  const sliced = buf.slice(-1000, -500);
  return sliced.length === 0;
});

// 测试 slice 后的属性访问顺序
test('属性访问：slice 的 [Symbol.iterator]', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 2);
  return typeof sliced[Symbol.iterator] === 'function';
});

test('属性访问：slice 的 byteLength', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return sliced.byteLength === 3;
});

test('属性访问：slice 的 byteOffset', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(6);
  return sliced.byteOffset !== undefined;
});

// 嵌套 slice 的深度测试
test('嵌套 slice：3 层嵌套', () => {
  const buf = Buffer.from('hello world');
  const slice1 = buf.slice(0, 11);
  const slice2 = slice1.slice(0, 5);
  const slice3 = slice2.slice(0, 3);
  return slice3.toString() === 'hel' && slice3.length === 3;
});

test('嵌套 slice：嵌套后修改影响所有层级', () => {
  const buf = Buffer.from('hello');
  const slice1 = buf.slice(0, 5);
  const slice2 = slice1.slice(0, 3);
  slice2[0] = 0x48; // 'H'
  return buf[0] === 0x48 && slice1[0] === 0x48 && slice2[0] === 0x48;
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
