// buffer.kMaxLength - Part 5: Comparison and Compatibility Tests
const { Buffer, kMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 与其他限制的比较
test('kMaxLength 大于 32 位整数最大值', () => {
  const max32bit = Math.pow(2, 31) - 1;
  return kMaxLength > max32bit;
});

test('kMaxLength 大于无符号 32 位整数最大值', () => {
  const maxUint32 = Math.pow(2, 32) - 1;
  return kMaxLength > maxUint32;
});

test('kMaxLength 等于 JavaScript 最大安全整数', () => {
  return kMaxLength === Number.MAX_SAFE_INTEGER;
});

test('kMaxLength 可以用 Number.isSafeInteger 验证', () => {
  return Number.isSafeInteger(kMaxLength);
});

test('kMaxLength 是最大安全整数', () => {
  return Number.isSafeInteger(kMaxLength) && kMaxLength === Number.MAX_SAFE_INTEGER;
});

test('kMaxLength 加减运算保持精度', () => {
  const a = kMaxLength - 1000;
  const b = a + 1000;
  return b === kMaxLength;
});

// 与 ArrayBuffer 限制比较
test('ArrayBuffer 有自己的长度限制', () => {
  try {
    new ArrayBuffer(kMaxLength);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('ArrayBuffer 小尺寸正常工作', () => {
  const ab = new ArrayBuffer(1024);
  return ab.byteLength === 1024;
});

// 跨模块一致性测试
test('多次 require buffer 模块，kMaxLength 值一致', () => {
  const { kMaxLength: k1 } = require('buffer');
  const { kMaxLength: k2 } = require('buffer');
  const { kMaxLength: k3 } = require('buffer');
  return k1 === k2 && k2 === k3 && k3 === kMaxLength;
});

test('Buffer.kMaxLength 和 kMaxLength 引用相同', () => {
  const buffer = require('buffer');
  return buffer.kMaxLength === kMaxLength;
});

// 数学运算测试
test('kMaxLength 可以参与算术运算', () => {
  const half = kMaxLength / 2;
  const doubled = kMaxLength * 2;
  return half > 0 && doubled > kMaxLength;
});

test('kMaxLength 取模运算', () => {
  const remainder = kMaxLength % 1000;
  return Number.isInteger(remainder) && remainder >= 0;
});

test('kMaxLength 位运算符使用（注意：会转为 32 位）', () => {
  const result = kMaxLength | 0;
  return result !== kMaxLength;
});

// 比较运算测试
test('kMaxLength 大于 0', () => {
  return kMaxLength > 0;
});

test('kMaxLength 小于 Infinity', () => {
  return kMaxLength < Infinity;
});

test('kMaxLength 不等于 Infinity', () => {
  return kMaxLength !== Infinity;
});

test('kMaxLength 不等于 -Infinity', () => {
  return kMaxLength !== -Infinity;
});

test('kMaxLength 使用严格相等', () => {
  return kMaxLength === 9007199254740991;
});

// 字符串转换测试
test('kMaxLength.toString() 返回正确字符串', () => {
  return kMaxLength.toString() === '9007199254740991';
});

test('kMaxLength.toString(16) 返回十六进制', () => {
  const hex = kMaxLength.toString(16);
  return hex === '1fffffffffffff';
});

test('kMaxLength.toExponential() 返回科学计数法', () => {
  const exp = kMaxLength.toExponential();
  return exp.includes('e+');
});

// 内存和性能相关
test('检查 kMaxLength 的二进制表示', () => {
  return kMaxLength === 0x1FFFFFFFFFFFFF;
});

test('kMaxLength 是实际可分配内存的理论上限', () => {
  return kMaxLength > 1024 * 1024 * 1024 * 1024;
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
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%',
      kMaxLength: kMaxLength
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
