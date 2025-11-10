// 快速测试 v3/v5/v6/v7 的 buffer 和 offset 参数支持
const { v3, v5, v6, v7 } = require('uuid');

console.log('测试 v3/v5/v6/v7 的 buffer 和 offset 参数支持\n');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passCount++;
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    failCount++;
  }
}

// 测试 v3 buffer 支持
test('v3 buffer 支持', () => {
  const buffer = new Array(16);
  const result = v3('hello', v3.DNS, buffer);
  if (!Array.isArray(result)) throw new Error(`返回值不是数组: ${typeof result}`);
  if (buffer[0] === undefined) throw new Error('buffer 未被写入');
});

test('v3 buffer+offset 支持', () => {
  const buffer = new Array(20);
  const result = v3('hello', v3.DNS, buffer, 4);
  if (buffer[4] === undefined) throw new Error('偏移量位置未被写入');
  if (buffer[0] !== undefined) throw new Error('偏移量之前被错误写入');
});

// 测试 v5 buffer 支持
test('v5 buffer 支持', () => {
  const buffer = new Array(16);
  const result = v5('hello', v5.DNS, buffer);
  if (!Array.isArray(result)) throw new Error(`返回值不是数组: ${typeof result}`);
  if (buffer[0] === undefined) throw new Error('buffer 未被写入');
});

test('v5 buffer+offset 支持', () => {
  const buffer = new Array(20);
  const result = v5('hello', v5.DNS, buffer, 4);
  if (buffer[4] === undefined) throw new Error('偏移量位置未被写入');
  if (buffer[0] !== undefined) throw new Error('偏移量之前被错误写入');
});

// 测试 v6 buffer 支持
test('v6 buffer 支持', () => {
  const buffer = new Array(16);
  const result = v6(null, buffer);
  if (!Array.isArray(result)) throw new Error(`返回值不是数组: ${typeof result}`);
  if (buffer[0] === undefined) throw new Error('buffer 未被写入');
});

test('v6 buffer+offset 支持', () => {
  const buffer = new Array(20);
  const result = v6(null, buffer, 4);
  if (buffer[4] === undefined) throw new Error('偏移量位置未被写入');
  if (buffer[0] !== undefined) throw new Error('偏移量之前被错误写入');
});

// 测试 v7 buffer 支持
test('v7 buffer 支持', () => {
  const buffer = new Array(16);
  const result = v7(null, buffer);
  if (!Array.isArray(result)) throw new Error(`返回值不是数组: ${typeof result}`);
  if (buffer[0] === undefined) throw new Error('buffer 未被写入');
});

test('v7 buffer+offset 支持', () => {
  const buffer = new Array(20);
  const result = v7(null, buffer, 4);
  if (buffer[4] === undefined) throw new Error('偏移量位置未被写入');
  if (buffer[0] !== undefined) throw new Error('偏移量之前被错误写入');
});

console.log(`\n总结: ${passCount} 通过, ${failCount} 失败`);

