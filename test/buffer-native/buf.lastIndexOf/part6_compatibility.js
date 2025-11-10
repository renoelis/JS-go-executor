// buf.lastIndexOf() - Node.js 兼容性和行为对齐测试
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

// 与 indexOf 的对比
test('lastIndexOf vs indexOf: 找到最后一个', () => {
  const buf = Buffer.from('test test test');
  const first = buf.indexOf('test');
  const last = buf.lastIndexOf('test');
  return first === 0 && last === 10;
});

test('lastIndexOf vs indexOf: 只有一个匹配', () => {
  const buf = Buffer.from('unique');
  return buf.indexOf('unique') === buf.lastIndexOf('unique');
});

test('lastIndexOf vs indexOf: 未找到', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('world') === -1 && buf.lastIndexOf('world') === -1;
});

// 与 String.lastIndexOf 的行为对齐
test('行为对齐: 空字符串返回 byteOffset', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf('', 2) === 2;
});

test('行为对齐: 空字符串默认返回 length', () => {
  const buf = Buffer.from('hello');
  return buf.lastIndexOf('') === 5;
});

test('行为对齐: 负数 offset 从末尾计算', () => {
  const buf = Buffer.from('abc abc abc');
  return buf.lastIndexOf('abc', -4) === 4;
});

// 编码转换一致性
test('编码一致性: utf8 和 ascii 对于纯 ASCII', () => {
  const buf = Buffer.from('hello');
  const utf8Result = buf.lastIndexOf('hello', undefined, 'utf8');
  const asciiResult = buf.lastIndexOf('hello', undefined, 'ascii');
  return utf8Result === asciiResult;
});

test('编码一致性: hex 大小写', () => {
  const buf = Buffer.from([0xAB, 0xCD, 0xAB, 0xCD]);
  const lower = buf.lastIndexOf('abcd', 'hex');
  const upper = buf.lastIndexOf('ABCD', 'hex');
  return lower === upper && lower === 2;
});

test('编码一致性: base64 填充', () => {
  const buf = Buffer.from('hello hello');
  const encoded = Buffer.from('hello').toString('base64');
  return buf.lastIndexOf(encoded, undefined, 'base64') === 6;
});

// TypedArray 互操作性
test('TypedArray: Uint8Array 与 Buffer 等价', () => {
  const buf = Buffer.from([1, 2, 3, 1, 2, 3]);
  const uint8 = new Uint8Array([1, 2, 3]);
  const bufSearch = Buffer.from([1, 2, 3]);
  return buf.lastIndexOf(uint8) === buf.lastIndexOf(bufSearch);
});

test('TypedArray: Int8Array 不被接受', () => {
  const buf = Buffer.from([254, 255, 254, 255]);
  const int8 = new Int8Array([-2, -1]);
  try {
    buf.lastIndexOf(int8);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

// 共享内存视图
test('共享内存: slice 后的 Buffer', () => {
  const original = Buffer.from('hello world hello');
  const sliced = original.slice(6, 17);
  return sliced.lastIndexOf('hello') === 6;
});

test('共享内存: subarray 后的 Buffer', () => {
  const original = Buffer.from('test test test');
  const sub = original.subarray(5, 14);
  return sub.lastIndexOf('test') === 5;
});

// 修改后的行为
test('修改后: 原 Buffer 修改影响 slice', () => {
  const buf = Buffer.from('aaa aaa');
  const slice = buf.slice(0, 7);
  buf.write('bbb', 4);
  return slice.lastIndexOf('bbb') === 4;
});

// 多次调用一致性
test('多次调用: 结果一致', () => {
  const buf = Buffer.from('test test test');
  const result1 = buf.lastIndexOf('test');
  const result2 = buf.lastIndexOf('test');
  const result3 = buf.lastIndexOf('test');
  return result1 === result2 && result2 === result3 && result1 === 10;
});

test('多次调用: 不同 offset 结果不同', () => {
  const buf = Buffer.from('abc abc abc');
  const r1 = buf.lastIndexOf('abc', 10);
  const r2 = buf.lastIndexOf('abc', 6);
  const r3 = buf.lastIndexOf('abc', 2);
  return r1 === 8 && r2 === 4 && r3 === 0;
});

// 链式调用
test('链式: 找到后再找', () => {
  const buf = Buffer.from('a b a b a');
  const first = buf.lastIndexOf('a');
  const second = buf.lastIndexOf('a', first - 1);
  return first === 8 && second === 4;
});

// 不可变性
test('不可变性: lastIndexOf 不修改 Buffer', () => {
  const buf = Buffer.from('test');
  const original = buf.toString();
  buf.lastIndexOf('test');
  return buf.toString() === original;
});

// 性能特征
test('性能: 大 Buffer 快速路径', () => {
  const size = 10000;
  const buf = Buffer.alloc(size);
  buf.write('needle', size - 10);
  const start = Date.now();
  const result = buf.lastIndexOf('needle');
  const duration = Date.now() - start;
  return result === size - 10 && duration < 100;
});

test('性能: 小 Buffer 逐字节搜索', () => {
  const buf = Buffer.from('small test small');
  const start = Date.now();
  const result = buf.lastIndexOf('small');
  const duration = Date.now() - start;
  return result === 11 && duration < 10;
});

// 边界对齐
test('边界对齐: utf16le 2字节对齐', () => {
  const buf = Buffer.from('test', 'utf16le');
  // 'test' in utf16le = 8 bytes
  // 查找 't' (2 bytes) 应该在偶数位置
  const result = buf.lastIndexOf('t', undefined, 'utf16le');
  return result % 2 === 0;
});

test('边界对齐: utf8 无对齐要求', () => {
  const buf = Buffer.from('test');
  // utf8 可以在任何位置
  return buf.lastIndexOf('t') === 3;
});

// 特殊 Buffer 类型
test('特殊类型: Buffer.allocUnsafe', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.write('test', 0);
  buf.write('test', 5);
  return buf.lastIndexOf('test') === 5;
});

test('特殊类型: Buffer.from(arrayBuffer)', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view.set([116, 101, 115, 116], 0); // 'test'
  view.set([116, 101, 115, 116], 5);
  const buf = Buffer.from(ab);
  return buf.lastIndexOf('test') === 5;
});

// 编码错误处理
test('编码错误: 无效 hex 返回 buf.length', () => {
  const buf = Buffer.from('test');
  // 无效 hex 解码失败，searchBytes 为空，返回 buf.length
  return buf.lastIndexOf('GG', 'hex') === 4;
});

test('编码错误: 无效 base64 返回 buf.length', () => {
  const buf = Buffer.from('test');
  // 无效 base64 解码失败，searchBytes 为空，返回 buf.length
  return buf.lastIndexOf('!!!', 'base64') === 4;
});

// 与原生方法的一致性
test('原生一致性: toString + lastIndexOf', () => {
  const buf = Buffer.from('hello world hello');
  const str = buf.toString();
  const bufIdx = buf.lastIndexOf('hello');
  const strIdx = str.lastIndexOf('hello');
  return bufIdx === strIdx;
});

test('原生一致性: 字节级别精确', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // 'Hello'
  return buf.lastIndexOf('Hello') === 0;
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
