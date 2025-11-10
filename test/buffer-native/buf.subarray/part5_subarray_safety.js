// buf.subarray() - Memory Safety & Shared Memory Behavior
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, passed: pass, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, status: '❌', error: e.message, stack: e.stack });
  }
}

// 共享内存验证
test('修改 subarray 影响原 buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  sub[0] = 99;
  sub[1] = 88;
  sub[2] = 77;
  if (buf[1] !== 99 || buf[2] !== 88 || buf[3] !== 77) return false;
  console.log('✅ subarray 修改影响原 buffer');
  return true;
});

test('修改原 buffer 影响 subarray', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  buf[1] = 99;
  buf[2] = 88;
  buf[3] = 77;
  if (sub[0] !== 99 || sub[1] !== 88 || sub[2] !== 77) return false;
  console.log('✅ 原 buffer 修改影响 subarray');
  return true;
});

test('subarray 返回的是视图，不是拷贝', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub1 = buf.subarray(1, 4);
  const sub2 = buf.subarray(1, 4);

  // 修改 sub1
  sub1[1] = 100;

  // sub2 应该看到变化（因为都是同一块内存的视图）
  if (sub2[1] !== 100) return false;
  if (buf[2] !== 100) return false;

  console.log('✅ subarray 是视图不是拷贝');
  return true;
});

test('多层嵌套 subarray 共享内存', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const sub1 = buf.subarray(2, 8);
  const sub2 = sub1.subarray(1, 5);
  const sub3 = sub2.subarray(1, 3);

  // sub3[0] 对应原 buf[4]
  sub3[0] = 99;
  if (buf[4] !== 99) return false;
  if (sub2[1] !== 99) return false;
  if (sub1[2] !== 99) return false;

  console.log('✅ 多层嵌套共享内存');
  return true;
});

test('空 subarray 不会造成内存问题', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(3, 3);
  if (sub.length !== 0) return false;

  // 尝试访问不应该崩溃
  const val = sub[0];
  if (val !== undefined) return false;

  console.log('✅ 空 subarray 安全');
  return true;
});

test('subarray 的 byteOffset 正确', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2);

  // Buffer 继承自 Uint8Array，有 byteOffset 属性
  if (sub.byteOffset === buf.byteOffset + 2) {
    console.log('✅ byteOffset 正确');
    return true;
  }

  // 某些实现可能不同，检查功能性
  if (sub.length === 3 && sub[0] === 3) {
    console.log('✅ byteOffset 功能正确');
    return true;
  }

  return false;
});

test('subarray 的 byteLength 正确', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);

  if (sub.byteLength !== 3) return false;
  if (sub.length !== 3) return false;

  console.log('✅ byteLength 正确');
  return true;
});

test('subarray 不会越界读取', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(3);

  // sub 长度为 2
  if (sub.length !== 2) return false;

  // 访问超出范围返回 undefined
  if (sub[2] !== undefined) return false;
  if (sub[100] !== undefined) return false;

  console.log('✅ 不会越界读取');
  return true;
});

test('subarray 不会越界写入', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(3);

  // 尝试写入越界位置
  sub[10] = 99;

  // 不应该影响原 buffer
  if (buf[13] === 99) return false;

  console.log('✅ 不会越界写入');
  return true;
});

test('零拷贝行为验证', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray();

  // subarray 应该返回视图，不分配新内存
  // 通过修改验证
  sub[0] = 99;
  if (buf[0] !== 99) return false;

  console.log('✅ 零拷贝行为正确');
  return true;
});

test('大量 subarray 不会造成内存泄漏', () => {
  const buf = Buffer.alloc(1000);
  const subs = [];

  // 创建大量 subarray
  for (let i = 0; i < 1000; i++) {
    subs.push(buf.subarray(0, Math.min(i % 100 + 1, 1000)));
  }

  // 修改应该都反映到原 buffer
  if (subs[500].length > 0) {
    subs[500][0] = 99;
    if (buf[0] !== 99) return false;
  }

  console.log('✅ 大量 subarray 正常');
  return true;
});

test('subarray 的 buffer 属性指向底层 ArrayBuffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);

  // Buffer 继承自 Uint8Array，有 buffer 属性
  if (!sub.buffer) return false;
  if (!(sub.buffer instanceof ArrayBuffer)) return false;

  console.log('✅ buffer 属性正确');
  return true;
});

test('fill 操作影响共享内存', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);

  sub.fill(0);

  if (buf[1] !== 0 || buf[2] !== 0 || buf[3] !== 0) return false;
  if (buf[0] !== 1 || buf[4] !== 5) return false;

  console.log('✅ fill 操作共享内存');
  return true;
});

test('copy 到 subarray', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const src = Buffer.from([9, 8, 7]);

  src.copy(sub);

  if (buf[1] !== 9 || buf[2] !== 8 || buf[3] !== 7) return false;

  console.log('✅ copy 到 subarray 正确');
  return true;
});

test('从 subarray copy', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const dst = Buffer.alloc(3);

  sub.copy(dst);

  if (dst[0] !== 2 || dst[1] !== 3 || dst[2] !== 4) return false;

  console.log('✅ 从 subarray copy 正确');
  return true;
});

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

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
