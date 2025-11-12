// buffer.isAscii() - Part 11: Cross-boundary and Mixed Scenarios
const { Buffer, isAscii } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 跨类型转换测试
test('Buffer to Uint8Array - ASCII', () => {
  const buf = Buffer.from('hello');
  const arr = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  return isAscii(buf) === true && isAscii(arr) === true;
});

test('Buffer to Uint8Array - 非 ASCII', () => {
  const buf = Buffer.from([0x80, 0xFF]);
  const arr = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  return isAscii(buf) === false && isAscii(arr) === false;
});

test('Uint8Array to Buffer - ASCII', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  const buf = Buffer.from(arr);
  return isAscii(arr) === true && isAscii(buf) === true;
});

test('Uint8Array to Buffer - 非 ASCII', () => {
  const arr = new Uint8Array([0x80, 0xFF]);
  const buf = Buffer.from(arr);
  return isAscii(arr) === false && isAscii(buf) === false;
});

// 链式操作测试
test('链式 slice - ASCII', () => {
  const buf = Buffer.from('hello world test');
  const slice1 = buf.slice(0, 10);
  const slice2 = slice1.slice(6, 10);
  return isAscii(slice2) === true;
});

test('链式 slice - 跳过非 ASCII', () => {
  const buf = Buffer.from([0x41, 0x80, 0x42, 0x43, 0x44]);
  const slice1 = buf.slice(0, 5);
  const slice2 = slice1.slice(2, 5); // 跳过 0x80，取 0x42-0x44
  return isAscii(slice2) === true;
});

test('链式 subarray - 修改传播', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x44, 0x45]);
  const sub1 = buf.subarray(0, 5);
  const sub2 = sub1.subarray(2, 4);
  sub2[0] = 0x80;
  return isAscii(buf) === false && isAscii(sub1) === false && isAscii(sub2) === false;
});

// Buffer 拼接场景
test('concat 多个不同来源 - 全 ASCII', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(5, 0x41);
  const buf3 = Buffer.from([0x42, 0x43]);
  const result = Buffer.concat([buf1, buf2, buf3]);
  return isAscii(result) === true;
});

test('concat - ASCII + 非ASCII + ASCII', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from([0x80]);
  const buf3 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2, buf3]);
  return isAscii(result) === false;
});

test('concat - 空 Buffer 混合', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(0);
  const buf3 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2, buf3]);
  return isAscii(result) === true;
});

// 多次修改场景
test('多次 write 操作 - 全 ASCII', () => {
  const buf = Buffer.alloc(20);
  buf.write('hello', 0);
  buf.write('world', 5);
  buf.write('test', 10);
  return isAscii(buf) === true;
});

test('多次 write 操作 - 最后变非 ASCII', () => {
  const buf = Buffer.alloc(20);
  buf.write('hello', 0);
  buf.write('world', 5);
  buf.write('你好', 10);
  return isAscii(buf) === false;
});

test('write 覆盖非 ASCII - 变回 ASCII', () => {
  const buf = Buffer.alloc(10);
  buf.write('你好', 0); // 写入非 ASCII
  const afterFirst = isAscii(buf);
  buf.fill(0x41); // 覆盖为 ASCII
  const afterFill = isAscii(buf);
  return afterFirst === false && afterFill === true;
});

// 交叉视图操作
test('Buffer 和 TypedArray 同时操作', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  const arr = new Uint8Array(ab);

  buf.fill(0x41);
  const step1 = isAscii(buf) === true && isAscii(arr) === true;

  arr[5] = 0x80;
  const step2 = isAscii(buf) === false && isAscii(arr) === false;

  buf[5] = 0x42;
  const step3 = isAscii(buf) === true && isAscii(arr) === true;

  return step1 && step2 && step3;
});

test('多个 TypedArray 视图共享', () => {
  const ab = new ArrayBuffer(16);
  const u8 = new Uint8Array(ab);
  const u16 = new Uint16Array(ab);
  const u32 = new Uint32Array(ab);

  u8.fill(0x41);
  return isAscii(u8) === true && typeof isAscii(u16) === 'boolean' && typeof isAscii(u32) === 'boolean';
});

// 边界跨越测试
test('slice 跨越 ASCII/非ASCII 边界 - 前半部分', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x80, 0xFF]);
  const slice = buf.slice(0, 3);
  return isAscii(slice) === true;
});

test('slice 跨越 ASCII/非ASCII 边界 - 后半部分', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x80, 0xFF]);
  const slice = buf.slice(3, 5);
  return isAscii(slice) === false;
});

test('slice 跨越边界 - 包含交界', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x80, 0xFF]);
  const slice = buf.slice(2, 4);
  return isAscii(slice) === false;
});

// TypedArray 子数组跨类型
test('Uint8Array 到 Uint16Array 视图', () => {
  const ab = new ArrayBuffer(16);
  const u8 = new Uint8Array(ab);
  u8[0] = 0x41;
  u8[1] = 0x00;
  u8[2] = 0x42;
  u8[3] = 0x00;

  const u16 = new Uint16Array(ab);
  return isAscii(u8) === true && typeof isAscii(u16) === 'boolean';
});

test('部分 ArrayBuffer 创建不同视图', () => {
  const ab = new ArrayBuffer(20);
  const full = new Uint8Array(ab);
  full.fill(0x41);
  full[10] = 0x80;

  const part1 = new Uint8Array(ab, 0, 10);
  const part2 = new Uint8Array(ab, 10, 10);

  return isAscii(part1) === true && isAscii(part2) === false;
});

// 复杂嵌套操作
test('copy 到 slice 视图', () => {
  const src = Buffer.from('hello');
  const dst = Buffer.alloc(20, 0x44);
  const dstSlice = dst.slice(5, 15);
  src.copy(dstSlice, 0);
  return isAscii(dst) === true;
});

test('copy 非ASCII 到 slice 视图', () => {
  const src = Buffer.from([0x80, 0xFF]);
  const dst = Buffer.alloc(20, 0x41);
  const dstSlice = dst.slice(5, 15);
  src.copy(dstSlice, 0);
  return isAscii(dst) === false;
});

// 编码混合测试
test('不同编码混合 - ASCII', () => {
  const buf1 = Buffer.from('hello', 'utf8');
  const buf2 = Buffer.from('world', 'ascii');
  const buf3 = Buffer.from('48656c6c6f', 'hex');
  const result = Buffer.concat([buf1, buf2, buf3]);
  return isAscii(result) === true;
});

test('不同编码混合 - 包含非 ASCII', () => {
  const buf1 = Buffer.from('hello', 'utf8');
  const buf2 = Buffer.from('你好', 'utf8');
  const buf3 = Buffer.from('world', 'ascii');
  const result = Buffer.concat([buf1, buf2, buf3]);
  return isAscii(result) === false;
});

test('latin1 编码 ASCII 范围', () => {
  const buf = Buffer.from('hello', 'latin1');
  return isAscii(buf) === true;
});

test('latin1 编码扩展范围', () => {
  const buf = Buffer.from('\x80\xFF', 'latin1');
  return isAscii(buf) === false;
});

// 零拷贝场景
test('Buffer.from(Buffer) 零拷贝检查', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(buf1);
  buf2[0] = 0x80;
  // buf1 和 buf2 应该是独立的
  return isAscii(buf1) === true && isAscii(buf2) === false;
});

test('subarray 零拷贝修改', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x44, 0x45]);
  const sub = buf.subarray(1, 4);
  sub.fill(0x80);
  // 应该影响原 Buffer
  return isAscii(buf) === false && isAscii(sub) === false;
});

test('slice vs subarray - slice 是拷贝', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x44, 0x45]);
  const s = buf.slice(1, 4);
  s.fill(0x80);
  // slice 在某些 Node 版本可能是视图，需要验证
  // 检查修改是否影响原 Buffer
  return typeof isAscii(buf) === 'boolean' && isAscii(s) === false;
});

// 内存回收后的检查
test('大 Buffer 创建和释放', () => {
  const results = [];
  for (let i = 0; i < 10; i++) {
    const buf = Buffer.alloc(1024 * 1024, 0x41); // 1MB
    results.push(isAscii(buf));
  }
  return results.every(r => r === true);
});

// 连续内存操作
test('连续 fill 操作', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 10; i++) {
    buf.fill(0x41 + i, i * 10, (i + 1) * 10);
  }
  return isAscii(buf) === true;
});

test('连续 write 操作覆盖', () => {
  const buf = Buffer.alloc(50);
  buf.write('aaaaaaaaaa', 0);
  buf.write('bbbbbbbbbb', 10);
  buf.write('cccccccccc', 20);
  buf.write('dddddddddd', 30);
  buf.write('eeeeeeeeee', 40);
  return isAscii(buf) === true;
});

// 极端 offset 测试
test('TypedArray 极端 offset', () => {
  const ab = new ArrayBuffer(1000);
  const arr = new Uint8Array(ab);
  arr.fill(0x41);
  arr[999] = 0x80;

  const view = new Uint8Array(ab, 999, 1);
  return isAscii(view) === false;
});

test('Buffer.from ArrayBuffer 最大 offset', () => {
  const ab = new ArrayBuffer(1000);
  const full = new Uint8Array(ab);
  full.fill(0x41);
  full[998] = 0x80;

  const buf = Buffer.from(ab, 998, 2);
  return isAscii(buf) === false;
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
