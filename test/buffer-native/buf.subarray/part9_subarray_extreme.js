// buf.subarray() - Extreme Cases & Historical Behaviors
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

// 超极端参数
test('start 为 Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(Number.MAX_SAFE_INTEGER);
  if (sub.length !== 0) return false;
  console.log('✅ MAX_SAFE_INTEGER 返回空');
  return true;
});

test('start 为 Number.MIN_SAFE_INTEGER', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(Number.MIN_SAFE_INTEGER);
  if (sub.length !== 5) return false;
  console.log('✅ MIN_SAFE_INTEGER 从 0 开始');
  return true;
});

test('end 为 Number.MAX_VALUE', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, Number.MAX_VALUE);
  if (sub.length !== 4) return false;
  console.log('✅ MAX_VALUE 截取到末尾');
  return true;
});

test('end 为 Number.MIN_VALUE', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0, Number.MIN_VALUE);
  // MIN_VALUE 是非常小的正数，会被截断为 0
  if (sub.length !== 0) return false;
  console.log('✅ MIN_VALUE 截断为 0');
  return true;
});

test('start 为 Number.EPSILON', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(Number.EPSILON);
  // EPSILON 是非常小的正数，截断为 0
  if (sub.length !== 5) return false;
  console.log('✅ EPSILON 截断为 0');
  return true;
});

// 特殊数字组合
test('start 和 end 都是 NaN', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(NaN, NaN);
  // NaN 都转为 0
  if (sub.length !== 0) return false;
  console.log('✅ 双 NaN 返回空');
  return true;
});

test('start 为 0.5, end 为 4.5', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0.5, 4.5);
  // 0.5 -> 0, 4.5 -> 4
  if (sub.length !== 4) return false;
  if (sub[0] !== 1 || sub[3] !== 4) return false;
  console.log('✅ 0.5 和 4.5 截断正确');
  return true;
});

test('start 为 -0.5', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-0.5);
  // -0.5 截断为 0，视为从头开始
  if (sub.length !== 5) return false;
  console.log('✅ -0.5 截断为 0');
  return true;
});

test('start 为 -0.1', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-0.1);
  // -0.1 截断为 0，视为从头开始
  if (sub.length !== 5) return false;
  console.log('✅ -0.1 截断为 0');
  return true;
});

// UTF-8 边界问题
test('UTF-8 多字节字符边界切分', () => {
  const buf = Buffer.from('你好世界', 'utf8');
  // 每个汉字 3 字节
  const sub = buf.subarray(0, 6);
  if (sub.toString('utf8') !== '你好') return false;
  console.log('✅ UTF-8 多字节边界正确');
  return true;
});

test('UTF-8 字符中间切分会乱码', () => {
  const buf = Buffer.from('你好', 'utf8');
  // "你" 占 3 字节，从中间切会乱码
  const sub = buf.subarray(0, 2);
  const str = sub.toString('utf8');
  // 不完整的 UTF-8 会显示替换字符或乱码
  console.log('✅ UTF-8 中间切分:', str);
  return true;
});

test('emoji 字符的 subarray', () => {
  const buf = Buffer.from('😀😃😄', 'utf8');
  // emoji 通常占 4 字节
  const sub = buf.subarray(0, 4);
  if (sub.toString('utf8') !== '😀') return false;
  console.log('✅ emoji subarray 正确');
  return true;
});

// 性能相关场景
test('频繁创建和销毁 subarray', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < 10000; i++) {
    const sub = buf.subarray(i % 100, (i % 100) + 10);
    if (sub.length !== 10) return false;
  }
  console.log('✅ 频繁创建 subarray 正常');
  return true;
});

test('多个 subarray 同时修改不同位置', () => {
  const buf = Buffer.alloc(100);
  const subs = [];
  for (let i = 0; i < 10; i++) {
    subs.push(buf.subarray(i * 10, (i + 1) * 10));
  }

  // 同时修改
  for (let i = 0; i < 10; i++) {
    subs[i].fill(i);
  }

  // 验证
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      if (buf[i * 10 + j] !== i) return false;
    }
  }

  console.log('✅ 多 subarray 并发修改正确');
  return true;
});

// 与其他 TypedArray 方法配合
test('subarray 配合 set 方法', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(3, 8);
  const src = new Uint8Array([1, 2, 3, 4, 5]);
  sub.set(src);

  if (buf[3] !== 1 || buf[7] !== 5) return false;
  console.log('✅ subarray 配合 set 正确');
  return true;
});

test('subarray 配合 reverse', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  sub.reverse();

  if (buf[1] !== 4 || buf[2] !== 3 || buf[3] !== 2) return false;
  console.log('✅ subarray 配合 reverse 正确');
  return true;
});

test('subarray 配合 sort', () => {
  const buf = Buffer.from([5, 1, 3, 2, 4]);
  const sub = buf.subarray(0, 3);
  sub.sort();

  if (buf[0] !== 1 || buf[1] !== 3 || buf[2] !== 5) return false;
  if (buf[3] !== 2 || buf[4] !== 4) return false;
  console.log('✅ subarray 配合 sort 正确');
  return true;
});

test('subarray 配合 forEach', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const values = [];
  sub.forEach((val) => values.push(val));

  if (values.length !== 3) return false;
  if (values[0] !== 2 || values[2] !== 4) return false;
  console.log('✅ subarray 配合 forEach 正确');
  return true;
});

test('subarray 配合 map', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const mapped = Array.from(sub.map(x => x * 2));

  if (mapped.length !== 3) return false;
  if (mapped[0] !== 4 || mapped[2] !== 8) return false;
  console.log('✅ subarray 配合 map 正确');
  return true;
});

test('subarray 配合 filter', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0, 5);
  const filtered = Array.from(sub.filter(x => x > 2));

  if (filtered.length !== 3) return false;
  if (filtered[0] !== 3 || filtered[2] !== 5) return false;
  console.log('✅ subarray 配合 filter 正确');
  return true;
});

test('subarray 配合 reduce', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const sum = sub.reduce((acc, val) => acc + val, 0);

  if (sum !== 9) return false; // 2 + 3 + 4
  console.log('✅ subarray 配合 reduce 正确');
  return true;
});

// 历史兼容性
test('subarray 和 slice 在 Node v25 行为一致', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const sli = buf.slice(1, 4);

  // 长度和内容相同
  if (sub.length !== sli.length) return false;
  for (let i = 0; i < sub.length; i++) {
    if (sub[i] !== sli[i]) return false;
  }

  // 都共享内存
  sub[0] = 99;
  if (buf[1] !== 99) return false;
  sli[1] = 88;
  if (buf[2] !== 88) return false;

  console.log('✅ subarray 和 slice 行为一致');
  return true;
});

// 边界内存测试
test('极小 Buffer 的 subarray', () => {
  const buf = Buffer.from([42]);
  const sub = buf.subarray(0, 1);
  if (sub.length !== 1 || sub[0] !== 42) return false;

  sub[0] = 99;
  if (buf[0] !== 99) return false;

  console.log('✅ 极小 Buffer subarray 正确');
  return true;
});

test('所有可能的单字节 subarray', () => {
  for (let i = 0; i < 256; i++) {
    const buf = Buffer.from([i]);
    const sub = buf.subarray();
    if (sub[0] !== i) return false;
  }
  console.log('✅ 所有单字节 subarray 正确');
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
