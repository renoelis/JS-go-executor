// buf.length - Part 6: Read-only Property Tests
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

// length 只读属性测试
test('尝试修改 length 不生效', () => {
  const buf = Buffer.alloc(10);
  const original = buf.length;
  buf.length = 20;
  return buf.length === original;
});

test('尝试删除 length 属性', () => {
  const buf = Buffer.alloc(10);
  const original = buf.length;
  try {
    delete buf.length;
  } catch (e) {
    // 可能抛出错误
  }
  return buf.length === original;
});

test('尝试设置 length 为 0', () => {
  const buf = Buffer.alloc(10);
  buf.length = 0;
  return buf.length === 10;
});

test('尝试设置 length 为负数', () => {
  const buf = Buffer.alloc(10);
  buf.length = -5;
  return buf.length === 10;
});

test('尝试设置 length 为字符串', () => {
  const buf = Buffer.alloc(10);
  buf.length = 'invalid';
  return buf.length === 10;
});

test('尝试设置 length 为对象', () => {
  const buf = Buffer.alloc(10);
  buf.length = {};
  return buf.length === 10;
});

test('尝试设置 length 为 null', () => {
  const buf = Buffer.alloc(10);
  buf.length = null;
  return buf.length === 10;
});

test('尝试设置 length 为 undefined', () => {
  const buf = Buffer.alloc(10);
  buf.length = undefined;
  return buf.length === 10;
});

// 严格模式测试
test('严格模式下修改 length', () => {
  'use strict';
  const buf = Buffer.alloc(10);
  let errorThrown = false;
  try {
    buf.length = 20;
  } catch (e) {
    errorThrown = true;
  }
  // 在严格模式下，可能抛出 TypeError 或静默失败
  return buf.length === 10;
});

// length 属性描述符测试
test('length 属性存在', () => {
  const buf = Buffer.alloc(10);
  return 'length' in buf;
});

test('length 是数字类型', () => {
  const buf = Buffer.alloc(10);
  return typeof buf.length === 'number';
});

test('length 是整数', () => {
  const buf = Buffer.alloc(10);
  return Number.isInteger(buf.length);
});

test('length 非负', () => {
  const buf = Buffer.alloc(10);
  return buf.length >= 0;
});

test('空 buffer 的 length 为 0', () => {
  const buf = Buffer.alloc(0);
  return buf.length === 0 && typeof buf.length === 'number';
});

// 多次读取 length
test('多次读取 length 值一致', () => {
  const buf = Buffer.alloc(10);
  const len1 = buf.length;
  const len2 = buf.length;
  const len3 = buf.length;
  return len1 === len2 && len2 === len3 && len1 === 10;
});

// 操作后 length 保持不变
test('修改内容后 length 不变', () => {
  const buf = Buffer.alloc(10);
  buf[0] = 255;
  buf[5] = 128;
  buf[9] = 0;
  return buf.length === 10;
});

test('fill 后 length 不变', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0xFF);
  return buf.length === 10;
});

test('swap 操作后 length 不变', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();
  return buf.length === 4;
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
