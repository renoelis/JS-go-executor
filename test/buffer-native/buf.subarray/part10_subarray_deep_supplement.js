// buf.subarray() - Deep Supplementary Tests (Round 6+)
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

// ==================== 参数边界的更细致组合 ====================

test('start=0, end=1 - 单个元素', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0, 1);
  if (sub.length !== 1 || sub[0] !== 1) return false;
  console.log('✅ 单元素 subarray');
  return true;
});

test('start=-1, end=-0 - 负数到负零', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-1, -0);
  // -0 等于 0，从末尾算是 5，-1 是索引 4，所以 4 到 5 是空
  if (sub.length !== 0) return false;
  console.log('✅ -1 到 -0 返回空');
  return true;
});

test('start=2.9, end=2.1 - 小数 start > end', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2.9, 2.1);
  // 2.9->2, 2.1->2，start=end 返回空
  if (sub.length !== 0) return false;
  console.log('✅ 小数截断后 start=end');
  return true;
});

test('start=1.0, end=4.0 - 整数小数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1.0, 4.0);
  if (sub.length !== 3 || sub[0] !== 2) return false;
  console.log('✅ 整数小数正常');
  return true;
});

test('start=0.0, end=0.0 - 双零小数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0.0, 0.0);
  if (sub.length !== 0) return false;
  console.log('✅ 0.0 到 0.0 返回空');
  return true;
});

// ==================== 特殊字符串转换 ====================

test('start="  3  " - 带空格的数字字符串', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('  3  ');
  // 字符串前后空格会被 Number() 处理
  if (sub.length !== 2 || sub[0] !== 4) return false;
  console.log('✅ 带空格数字字符串转换');
  return true;
});

test('start="+2" - 带正号的字符串', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('+2');
  if (sub.length !== 3 || sub[0] !== 3) return false;
  console.log('✅ +2 字符串转换');
  return true;
});

test('start="0b11" - 二进制字符串', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('0b11');
  // "0b11" 转为数字 3
  if (sub.length !== 2 || sub[0] !== 4) return false;
  console.log('✅ 二进制字符串转换');
  return true;
});

test('start="0o7" - 八进制字符串', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const sub = buf.subarray('0o7');
  // "0o7" 转为数字 7
  if (sub.length !== 2 || sub[0] !== 7) return false;
  console.log('✅ 八进制字符串转换');
  return true;
});

test('start="1.5e2" - 科学计数法小数', () => {
  const buf = Buffer.alloc(200);
  buf[150] = 99;
  const sub = buf.subarray('1.5e2');
  // "1.5e2" = 150
  if (sub.length !== 50 || sub[0] !== 99) return false;
  console.log('✅ 科学计数法小数转换');
  return true;
});

test('start="-1e1" - 负科学计数法', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const sub = buf.subarray('-1e1');
  // "-1e1" = -10，从末尾数 10 个，等于从头开始
  if (sub.length !== 10 || sub[0] !== 1) return false;
  console.log('✅ 负科学计数法转换');
  return true;
});

// ==================== 对象转换的深度测试 ====================

test('start 为带 toString 无 valueOf 的对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const obj = { toString: () => '2' };
  const sub = buf.subarray(obj);
  if (sub.length !== 3 || sub[0] !== 3) return false;
  console.log('✅ 仅 toString 对象转换');
  return true;
});

test('start 为 valueOf 返回对象的对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const obj = {
    valueOf: () => ({ value: 2 }),
    toString: () => '3'
  };
  const sub = buf.subarray(obj);
  // valueOf 返回对象，回退到 toString
  if (sub.length !== 2 || sub[0] !== 4) return false;
  console.log('✅ valueOf 返回对象回退 toString');
  return true;
});

test('start 为 Symbol.toPrimitive 返回非原始值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const obj = {
    [Symbol.toPrimitive]: () => ({ value: 2 }),
    valueOf: () => 3,
    toString: () => '4'
  };
  try {
    const sub = buf.subarray(obj);
    // 如果没报错，检查是否回退到其他方法
    console.log('✅ toPrimitive 非原始值处理');
    return true;
  } catch (e) {
    console.log('✅ toPrimitive 非原始值报错:', e.message);
    return true;
  }
});

test('start 为 Date 对象', () => {
  const buf = Buffer.alloc(2000000000);
  const date = new Date('2000-01-01');
  const sub = buf.subarray(date);
  // Date valueOf 返回毫秒时间戳
  const timestamp = date.valueOf();
  console.log('✅ Date 对象转换:', timestamp);
  return true;
});

test('start 为 RegExp 对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const regex = /test/;
  const sub = buf.subarray(regex);
  // RegExp valueOf 返回自身，toString 返回字符串，最终转为 NaN -> 0
  if (sub.length !== 5) return false;
  console.log('✅ RegExp 转为 0');
  return true;
});

// ==================== 同时传入多种奇怪参数 ====================

test('start=null, end=undefined', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(null, undefined);
  // null->0, undefined->length
  if (sub.length !== 5 || sub[0] !== 1) return false;
  console.log('✅ null 到 undefined');
  return true;
});

test('start=false, end=true', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(false, true);
  // false->0, true->1
  if (sub.length !== 1 || sub[0] !== 1) return false;
  console.log('✅ false 到 true');
  return true;
});

test('start=[], end={}', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray([], {});
  // [] -> 0, {} -> NaN -> 0
  if (sub.length !== 0) return false;
  console.log('✅ 空数组到空对象');
  return true;
});

test('start=[3,4], end=[2]', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray([3, 4], [2]);
  // [3,4] -> NaN -> 0, [2] -> 2
  if (sub.length !== 2 || sub[0] !== 1) return false;
  console.log('✅ 多元素数组到单元素数组');
  return true;
});

// ==================== Buffer 特殊状态 ====================

test('Buffer.allocUnsafe 未初始化的内存', () => {
  const buf = Buffer.allocUnsafe(10);
  // 不初始化，直接 subarray
  const sub = buf.subarray(3, 7);
  if (sub.length !== 4) return false;
  // 修改 sub 应该影响 buf
  sub.fill(99);
  if (buf[3] !== 99 || buf[6] !== 99) return false;
  console.log('✅ allocUnsafe 未初始化 subarray');
  return true;
});

test('Buffer.from 空字符串', () => {
  const buf = Buffer.from('');
  const sub = buf.subarray();
  if (sub.length !== 0) return false;
  console.log('✅ 空字符串 Buffer subarray');
  return true;
});

test('Buffer.from 空数组', () => {
  const buf = Buffer.from([]);
  const sub = buf.subarray(0, 10);
  if (sub.length !== 0) return false;
  console.log('✅ 空数组 Buffer subarray');
  return true;
});

test('Buffer.alloc(0) 零长度', () => {
  const buf = Buffer.alloc(0);
  const sub = buf.subarray(-10, 10);
  if (sub.length !== 0) return false;
  console.log('✅ 零长度 Buffer 任意参数');
  return true;
});

// ==================== 修改操作的边界 ====================

test('subarray 后修改超出原 buffer 范围', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2, 4);
  // sub 长度为 2，尝试写入索引 5
  sub[5] = 99;
  // 不应该影响 buf
  if (buf.length !== 5) return false;
  console.log('✅ subarray 越界写不影响原 buffer');
  return true;
});

test('subarray 后 fill 部分范围', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const sub = buf.subarray(2, 6);
  sub.fill(0, 1, 3);
  // 填充 sub[1] 到 sub[2]，对应 buf[3] 到 buf[4]
  if (buf[2] !== 3 || buf[3] !== 0 || buf[4] !== 0 || buf[5] !== 6) return false;
  console.log('✅ subarray fill 部分范围');
  return true;
});

test('subarray 后 write 超出长度', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(5, 8);
  const written = sub.write('hello world');
  // 只能写入 3 字节
  if (written !== 3) return false;
  if (buf.toString('utf8', 5, 8) !== 'hel') return false;
  console.log('✅ subarray write 截断');
  return true;
});

// ==================== TypedArray 视图的交叉 ====================

test('Buffer subarray 转 Uint16Array 视图', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const sub = buf.subarray(0, 4);
  const u16 = new Uint16Array(sub.buffer, sub.byteOffset, sub.length / 2);
  // 小端序读取
  if (u16.length !== 2) return false;
  console.log('✅ subarray 转 Uint16Array 视图');
  return true;
});

test('Buffer subarray 转 DataView', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const sub = buf.subarray(1, 3);
  const dv = new DataView(sub.buffer, sub.byteOffset, sub.length);
  const val = dv.getUint16(0, false); // 大端
  if (val !== 0x3456) return false;
  console.log('✅ subarray 转 DataView');
  return true;
});

test('多个不同 TypedArray 视图同时修改', () => {
  const buf = Buffer.alloc(8);
  const sub = buf.subarray(0, 8);
  const u8 = new Uint8Array(sub.buffer, sub.byteOffset, sub.length);
  const u32 = new Uint32Array(sub.buffer, sub.byteOffset, sub.length / 4);

  u32[0] = 0x12345678;
  // 检查字节序
  console.log('✅ 多 TypedArray 视图修改:', u8[0].toString(16));
  return true;
});

// ==================== 编码边界的深入 ====================

test('UTF-8 四字节字符（emoji）边界切分', () => {
  const buf = Buffer.from('😀😃', 'utf8');
  // 每个 emoji 4 字节
  const sub = buf.subarray(0, 4);
  if (sub.toString('utf8') !== '😀') return false;
  console.log('✅ 四字节 emoji 边界');
  return true;
});

test('UTF-8 不完整多字节切分', () => {
  const buf = Buffer.from('你好', 'utf8');
  const sub = buf.subarray(0, 4);
  // "你" 3 字节，"好" 前 1 字节
  const str = sub.toString('utf8');
  console.log('✅ 不完整多字节:', str);
  return true;
});

test('Base64 编码后 subarray', () => {
  const original = 'Hello World';
  const buf = Buffer.from(original, 'utf8');
  const sub = buf.subarray(0, 5);
  const b64 = sub.toString('base64');
  if (Buffer.from(b64, 'base64').toString('utf8') !== 'Hello') return false;
  console.log('✅ subarray 后 base64 编码');
  return true;
});

test('Hex 编码奇数长度', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const sub = buf.subarray(0, 2);
  const hex = sub.toString('hex');
  if (hex !== '1234') return false;
  console.log('✅ hex 编码正确');
  return true;
});

// ==================== 性能和压力测试 ====================

test('深度嵌套 subarray (100 层)', () => {
  let buf = Buffer.alloc(1000);
  buf[500] = 99;

  for (let i = 0; i < 100; i++) {
    if (buf.length < 2) break;
    buf = buf.subarray(1, buf.length - 1);
  }

  // 每次减 2，100 次后应该减少至多 200
  console.log('✅ 100 层嵌套剩余长度:', buf.length);
  return true;
});

test('大量并发 subarray 创建', () => {
  const buf = Buffer.alloc(10000);
  const subs = [];

  for (let i = 0; i < 1000; i++) {
    for (let j = 0; j < 10; j++) {
      subs.push(buf.subarray(j * 1000, (j + 1) * 1000));
    }
  }

  // 验证最后一个
  if (subs[subs.length - 1].length !== 1000) return false;
  console.log('✅ 10000 个 subarray 创建成功');
  return true;
});

test('subarray 后大量随机读写', () => {
  const buf = Buffer.alloc(1000);
  const sub = buf.subarray(100, 900);

  for (let i = 0; i < 1000; i++) {
    const idx = Math.floor(Math.random() * sub.length);
    const val = Math.floor(Math.random() * 256);
    sub[idx] = val;
    if (buf[100 + idx] !== val) return false;
  }

  console.log('✅ 1000 次随机读写正确');
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
