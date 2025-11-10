const crypto = require('crypto');

// 测试结果收集
const testResults = {
  success: true,
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  details: []
};

// 测试辅助函数
function test(name, fn) {
  testResults.totalTests++;
  try {
    fn();
    testResults.passedTests++;
    testResults.details.push({
      name,
      status: '✅',
      message: 'Passed'
    });
  } catch (error) {
    testResults.failedTests++;
    testResults.success = false;
    testResults.details.push({
      name,
      status: '❌',
      message: error.message,
      stack: error.stack
    });
  }
}

// 辅助函数：检查是否为有效的随机数据（非全零）
function isValidRandomData(buffer) {
  return !buffer.every(byte => byte === 0);
}

// 辅助函数：检查两个缓冲区是否不同
function areBuffersDifferent(buf1, buf2) {
  if (buf1.length !== buf2.length) return true;
  for (let i = 0; i < buf1.length; i++) {
    if (buf1[i] !== buf2[i]) return true;
  }
  return false;
}

console.log('=== crypto.randomFillSync 综合测试 ===\n');

// ============================================
// 1. 基础功能测试
// ============================================
console.log('1. 基础功能测试');

test('1.1 填充 Buffer - 无偏移和大小参数', () => {
  const buf = Buffer.alloc(16);
  const result = crypto.randomFillSync(buf);
  
  if (result !== buf) {
    throw new Error('返回值应该是同一个 buffer 对象');
  }
  if (buf.length !== 16) {
    throw new Error(`长度应该为 16，实际为 ${buf.length}`);
  }
  if (!isValidRandomData(buf)) {
    throw new Error('Buffer 应该被填充随机数据');
  }
});

test('1.2 填充 Buffer - 指定偏移量', () => {
  const buf = Buffer.alloc(20);
  buf.fill(0);
  const result = crypto.randomFillSync(buf, 10);
  
  // 前10个字节应该保持为0
  for (let i = 0; i < 10; i++) {
    if (buf[i] !== 0) {
      throw new Error(`前10个字节应该保持为0，但 buf[${i}] = ${buf[i]}`);
    }
  }
  
  // 后10个字节应该被填充随机数据
  const filledPart = buf.slice(10);
  if (!isValidRandomData(filledPart)) {
    throw new Error('从偏移量10开始的部分应该被填充随机数据');
  }
});

test('1.3 填充 Buffer - 指定偏移量和大小', () => {
  const buf = Buffer.alloc(30);
  buf.fill(0);
  crypto.randomFillSync(buf, 10, 10);
  
  // 前10个字节应该保持为0
  for (let i = 0; i < 10; i++) {
    if (buf[i] !== 0) {
      throw new Error(`前10个字节应该保持为0，但 buf[${i}] = ${buf[i]}`);
    }
  }
  
  // 中间10个字节应该被填充随机数据
  const filledPart = buf.slice(10, 20);
  if (!isValidRandomData(filledPart)) {
    throw new Error('从偏移量10到20的部分应该被填充随机数据');
  }
  
  // 后10个字节应该保持为0
  for (let i = 20; i < 30; i++) {
    if (buf[i] !== 0) {
      throw new Error(`后10个字节应该保持为0，但 buf[${i}] = ${buf[i]}`);
    }
  }
});

// ============================================
// 2. TypedArray 支持测试
// ============================================
console.log('\n2. TypedArray 支持测试');

test('2.1 填充 Uint8Array', () => {
  const arr = new Uint8Array(16);
  const result = crypto.randomFillSync(arr);
  
  if (result !== arr) {
    throw new Error('返回值应该是同一个 Uint8Array 对象');
  }
  if (!isValidRandomData(Buffer.from(arr))) {
    throw new Error('Uint8Array 应该被填充随机数据');
  }
});

test('2.2 填充 Uint16Array', () => {
  const arr = new Uint16Array(8);
  const result = crypto.randomFillSync(arr);
  
  if (result !== arr) {
    throw new Error('返回值应该是同一个 Uint16Array 对象');
  }
  // 检查是否有非零值
  let hasNonZero = false;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  if (!hasNonZero) {
    throw new Error('Uint16Array 应该被填充随机数据');
  }
});

test('2.3 填充 Uint32Array', () => {
  const arr = new Uint32Array(4);
  const result = crypto.randomFillSync(arr);
  
  if (result !== arr) {
    throw new Error('返回值应该是同一个 Uint32Array 对象');
  }
  let hasNonZero = false;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  if (!hasNonZero) {
    throw new Error('Uint32Array 应该被填充随机数据');
  }
});

test('2.4 填充 Int8Array', () => {
  const arr = new Int8Array(16);
  crypto.randomFillSync(arr);
  
  let hasNonZero = false;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  if (!hasNonZero) {
    throw new Error('Int8Array 应该被填充随机数据');
  }
});

test('2.5 填充 Float32Array', () => {
  const arr = new Float32Array(4);
  crypto.randomFillSync(arr);
  
  // Float32Array 会被填充字节，但解释为浮点数
  let hasNonZero = false;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  if (!hasNonZero) {
    throw new Error('Float32Array 应该被填充随机数据');
  }
});

test('2.6 填充 BigInt64Array', () => {
  const arr = new BigInt64Array(2);
  crypto.randomFillSync(arr);
  
  let hasNonZero = false;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0n) {
      hasNonZero = true;
      break;
    }
  }
  if (!hasNonZero) {
    throw new Error('BigInt64Array 应该被填充随机数据');
  }
});

test('2.7 填充 BigUint64Array', () => {
  const arr = new BigUint64Array(2);
  crypto.randomFillSync(arr);
  
  let hasNonZero = false;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0n) {
      hasNonZero = true;
      break;
    }
  }
  if (!hasNonZero) {
    throw new Error('BigUint64Array 应该被填充随机数据');
  }
});

test('2.8 填充 Int16Array', () => {
  const arr = new Int16Array(8);
  const result = crypto.randomFillSync(arr);
  
  if (result !== arr) {
    throw new Error('返回值应该是同一个 Int16Array 对象');
  }
  let hasNonZero = false;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  if (!hasNonZero) {
    throw new Error('Int16Array 应该被填充随机数据');
  }
});

test('2.9 填充 Int32Array', () => {
  const arr = new Int32Array(4);
  const result = crypto.randomFillSync(arr);
  
  if (result !== arr) {
    throw new Error('返回值应该是同一个 Int32Array 对象');
  }
  let hasNonZero = false;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  if (!hasNonZero) {
    throw new Error('Int32Array 应该被填充随机数据');
  }
});

test('2.10 填充 Uint8ClampedArray', () => {
  const arr = new Uint8ClampedArray(16);
  const result = crypto.randomFillSync(arr);
  
  if (result !== arr) {
    throw new Error('返回值应该是同一个 Uint8ClampedArray 对象');
  }
  if (!isValidRandomData(Buffer.from(arr))) {
    throw new Error('Uint8ClampedArray 应该被填充随机数据');
  }
});

test('2.11 填充 Float64Array', () => {
  const arr = new Float64Array(4);
  crypto.randomFillSync(arr);
  
  // Float64Array 会被填充字节，但解释为浮点数
  let hasNonZero = false;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  if (!hasNonZero) {
    throw new Error('Float64Array 应该被填充随机数据');
  }
});

test('2.12 TypedArray 有 byteOffset 时填充整个数组', () => {
  const buffer = new ArrayBuffer(32);
  const fullView = new Uint8Array(buffer);
  const subView = new Uint8Array(buffer, 8, 16); // byteOffset=8, length=16
  
  // 填充 subView (不指定 offset 和 size)
  crypto.randomFillSync(subView);
  
  // 前8个字节应该保持为0
  for (let i = 0; i < 8; i++) {
    if (fullView[i] !== 0) {
      throw new Error(`前8个字节应该保持为0，但 fullView[${i}] = ${fullView[i]}`);
    }
  }
  
  // 中间16个字节应该被填充
  if (!isValidRandomData(Buffer.from(subView))) {
    throw new Error('subView 应该被填充随机数据');
  }
  
  // 后8个字节应该保持为0
  for (let i = 24; i < 32; i++) {
    if (fullView[i] !== 0) {
      throw new Error(`后8个字节应该保持为0，但 fullView[${i}] = ${fullView[i]}`);
    }
  }
});

test('2.13 TypedArray 有 byteOffset 时指定 offset 参数', () => {
  const buffer = new ArrayBuffer(32);
  const fullView = new Uint8Array(buffer);
  const subView = new Uint8Array(buffer, 8, 16); // byteOffset=8, length=16
  
  // 填充 subView 从 offset=4 开始 (相对于 subView，绝对位置是 8+4=12)
  crypto.randomFillSync(subView, 4);
  
  // buffer[0-11] 应该保持为0
  for (let i = 0; i < 12; i++) {
    if (fullView[i] !== 0) {
      throw new Error(`buffer[0-11] 应该保持为0，但 fullView[${i}] = ${fullView[i]}`);
    }
  }
  
  // buffer[12-23] 应该被填充 (subView[4-15])
  const filledPart = fullView.slice(12, 24);
  if (!isValidRandomData(Buffer.from(filledPart))) {
    throw new Error('buffer[12-23] 应该被填充随机数据');
  }
  
  // buffer[24-31] 应该保持为0
  for (let i = 24; i < 32; i++) {
    if (fullView[i] !== 0) {
      throw new Error(`buffer[24-31] 应该保持为0，但 fullView[${i}] = ${fullView[i]}`);
    }
  }
});

test('2.14 TypedArray 有 byteOffset 时指定 offset 和 size 参数', () => {
  const buffer = new ArrayBuffer(32);
  const fullView = new Uint8Array(buffer);
  const subView = new Uint8Array(buffer, 8, 16); // byteOffset=8, length=16
  
  // 填充 subView 从 offset=4 开始，长度为 8 (绝对位置 12-19)
  crypto.randomFillSync(subView, 4, 8);
  
  // buffer[0-11] 应该保持为0
  for (let i = 0; i < 12; i++) {
    if (fullView[i] !== 0) {
      throw new Error(`buffer[0-11] 应该保持为0，但 fullView[${i}] = ${fullView[i]}`);
    }
  }
  
  // buffer[12-19] 应该被填充
  const filledPart = fullView.slice(12, 20);
  if (!isValidRandomData(Buffer.from(filledPart))) {
    throw new Error('buffer[12-19] 应该被填充随机数据');
  }
  
  // buffer[20-31] 应该保持为0
  for (let i = 20; i < 32; i++) {
    if (fullView[i] !== 0) {
      throw new Error(`buffer[20-31] 应该保持为0，但 fullView[${i}] = ${fullView[i]}`);
    }
  }
});

// ============================================
// 3. DataView 支持测试
// ============================================
console.log('\n3. DataView 支持测试');

test('3.1 填充 DataView', () => {
  const buffer = new ArrayBuffer(16);
  const view = new DataView(buffer);
  const result = crypto.randomFillSync(view);
  
  if (result !== view) {
    throw new Error('返回值应该是同一个 DataView 对象');
  }
  
  const buf = Buffer.from(buffer);
  if (!isValidRandomData(buf)) {
    throw new Error('DataView 应该被填充随机数据');
  }
});

test('3.2 填充 DataView - 指定偏移量', () => {
  const buffer = new ArrayBuffer(20);
  const view = new DataView(buffer);
  const buf = Buffer.from(buffer);
  buf.fill(0);
  
  crypto.randomFillSync(view, 10);
  
  // 前10个字节应该保持为0
  for (let i = 0; i < 10; i++) {
    if (buf[i] !== 0) {
      throw new Error(`前10个字节应该保持为0，但 buf[${i}] = ${buf[i]}`);
    }
  }
  
  // 后10个字节应该被填充随机数据
  const filledPart = buf.slice(10);
  if (!isValidRandomData(filledPart)) {
    throw new Error('从偏移量10开始的部分应该被填充随机数据');
  }
});

test('3.3 填充 DataView - 指定偏移量和大小', () => {
  const buffer = new ArrayBuffer(30);
  const view = new DataView(buffer);
  const buf = Buffer.from(buffer);
  buf.fill(0);
  
  crypto.randomFillSync(view, 10, 10);
  
  // 前10个字节应该保持为0
  for (let i = 0; i < 10; i++) {
    if (buf[i] !== 0) {
      throw new Error(`前10个字节应该保持为0，但 buf[${i}] = ${buf[i]}`);
    }
  }
  
  // 中间10个字节应该被填充随机数据
  const filledPart = buf.slice(10, 20);
  if (!isValidRandomData(filledPart)) {
    throw new Error('从偏移量10到20的部分应该被填充随机数据');
  }
  
  // 后10个字节应该保持为0
  for (let i = 20; i < 30; i++) {
    if (buf[i] !== 0) {
      throw new Error(`后10个字节应该保持为0，但 buf[${i}] = ${buf[i]}`);
    }
  }
});

test('3.4 DataView 有 byteOffset 时的行为', () => {
  const buffer = new ArrayBuffer(32);
  const view = new DataView(buffer, 8, 16); // byteOffset=8, byteLength=16
  const fullBuf = Buffer.from(buffer);
  
  crypto.randomFillSync(view);
  
  // 前8个字节应该保持为0
  for (let i = 0; i < 8; i++) {
    if (fullBuf[i] !== 0) {
      throw new Error(`前8个字节应该保持为0，但 fullBuf[${i}] = ${fullBuf[i]}`);
    }
  }
  
  // 中间16个字节应该被填充
  const filledPart = fullBuf.slice(8, 24);
  if (!isValidRandomData(filledPart)) {
    throw new Error('中间16个字节应该被填充随机数据');
  }
  
  // 后8个字节应该保持为0
  for (let i = 24; i < 32; i++) {
    if (fullBuf[i] !== 0) {
      throw new Error(`后8个字节应该保持为0，但 fullBuf[${i}] = ${fullBuf[i]}`);
    }
  }
});

test('3.5 DataView 有 byteOffset 时指定 offset 和 size', () => {
  const buffer = new ArrayBuffer(32);
  const view = new DataView(buffer, 8, 16); // byteOffset=8, byteLength=16
  const fullBuf = Buffer.from(buffer);
  
  crypto.randomFillSync(view, 4, 8);
  
  // buffer[0-11] 应该保持为0
  for (let i = 0; i < 12; i++) {
    if (fullBuf[i] !== 0) {
      throw new Error(`buffer[0-11] 应该保持为0，但 fullBuf[${i}] = ${fullBuf[i]}`);
    }
  }
  
  // buffer[12-19] 应该被填充
  const filledPart = fullBuf.slice(12, 20);
  if (!isValidRandomData(filledPart)) {
    throw new Error('buffer[12-19] 应该被填充随机数据');
  }
  
  // buffer[20-31] 应该保持为0
  for (let i = 20; i < 32; i++) {
    if (fullBuf[i] !== 0) {
      throw new Error(`buffer[20-31] 应该保持为0，但 fullBuf[${i}] = ${fullBuf[i]}`);
    }
  }
});

// ============================================
// 4. 边界条件测试
// ============================================
console.log('\n4. 边界条件测试');

test('4.1 大小为 1 的 Buffer', () => {
  const buf = Buffer.alloc(1);
  crypto.randomFillSync(buf);
  
  if (buf.length !== 1) {
    throw new Error('Buffer 长度应该为 1');
  }
});

test('4.2 大小为 0 的 Buffer', () => {
  const buf = Buffer.alloc(0);
  const result = crypto.randomFillSync(buf);
  
  if (result !== buf) {
    throw new Error('返回值应该是同一个 buffer 对象');
  }
  if (buf.length !== 0) {
    throw new Error('Buffer 长度应该为 0');
  }
});

test('4.3 偏移量为 0', () => {
  const buf = Buffer.alloc(10);
  crypto.randomFillSync(buf, 0);
  
  if (!isValidRandomData(buf)) {
    throw new Error('Buffer 应该被填充随机数据');
  }
});

test('4.4 大小为 0 (offset + size = buffer.length)', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0);
  crypto.randomFillSync(buf, 10, 0);
  
  // 整个 buffer 应该保持为 0
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0) {
      throw new Error(`所有字节应该保持为0，但 buf[${i}] = ${buf[i]}`);
    }
  }
});

test('4.5 offset + size = buffer.length', () => {
  const buf = Buffer.alloc(20);
  buf.fill(0);
  crypto.randomFillSync(buf, 10, 10);
  
  // 前10个字节应该保持为0
  for (let i = 0; i < 10; i++) {
    if (buf[i] !== 0) {
      throw new Error(`前10个字节应该保持为0，但 buf[${i}] = ${buf[i]}`);
    }
  }
  
  // 后10个字节应该被填充随机数据
  const filledPart = buf.slice(10);
  if (!isValidRandomData(filledPart)) {
    throw new Error('从偏移量10开始的部分应该被填充随机数据');
  }
});

test('4.6 较大的 Buffer (64KB)', () => {
  const buf = Buffer.alloc(65536);
  crypto.randomFillSync(buf);
  
  if (buf.length !== 65536) {
    throw new Error('Buffer 长度应该为 65536');
  }
  if (!isValidRandomData(buf)) {
    throw new Error('Buffer 应该被填充随机数据');
  }
});

test('4.7 非常大的 Buffer (1MB)', () => {
  const buf = Buffer.alloc(1048576);
  crypto.randomFillSync(buf);
  
  if (buf.length !== 1048576) {
    throw new Error('Buffer 长度应该为 1048576');
  }
  if (!isValidRandomData(buf)) {
    throw new Error('Buffer 应该被填充随机数据');
  }
});

test('4.8 buffer 长度为 1 时的 offset=0 测试', () => {
  const buf = Buffer.alloc(1);
  buf.fill(0);
  crypto.randomFillSync(buf, 0);
  
  if (buf.length !== 1) {
    throw new Error('Buffer 长度应该为 1');
  }
  // 可能被填充或保持为0都是合理的
});

test('4.9 buffer 长度为 1 时的 offset=1 测试', () => {
  const buf = Buffer.alloc(1);
  // offset=1 意味着从位置1开始，但 buffer 长度为1，所以没有空间可填充
  const result = crypto.randomFillSync(buf, 1);
  
  if (result !== buf) {
    throw new Error('返回值应该是同一个 buffer 对象');
  }
  // buf[0] 应该保持为0（没有被填充）
  if (buf[0] !== 0) {
    throw new Error(`buf[0] 应该保持为0，但得到 ${buf[0]}`);
  }
});

test('4.10 undefined 作为 offset (应填充整个 buffer)', () => {
  const buf = Buffer.alloc(10);
  const result = crypto.randomFillSync(buf, undefined);
  
  if (result !== buf) {
    throw new Error('返回值应该是同一个 buffer 对象');
  }
  if (!isValidRandomData(buf)) {
    throw new Error('Buffer 应该被填充随机数据');
  }
});

test('4.11 undefined 作为 size (应填充到 buffer 末尾)', () => {
  const buf = Buffer.alloc(20);
  buf.fill(0);
  const result = crypto.randomFillSync(buf, 10, undefined);
  
  if (result !== buf) {
    throw new Error('返回值应该是同一个 buffer 对象');
  }
  
  // 前10个字节应该保持为0
  for (let i = 0; i < 10; i++) {
    if (buf[i] !== 0) {
      throw new Error(`前10个字节应该保持为0，但 buf[${i}] = ${buf[i]}`);
    }
  }
  
  // 后10个字节应该被填充随机数据
  const filledPart = buf.slice(10);
  if (!isValidRandomData(filledPart)) {
    throw new Error('从偏移量10开始的部分应该被填充随机数据');
  }
});

test('4.12 null 作为 offset 的行为 (应抛出错误)', () => {
  const buf = Buffer.alloc(10);
  let errorThrown = false;
  try {
    crypto.randomFillSync(buf, null);
  } catch (err) {
    errorThrown = true;
    // Node.js 会抛出类型错误
    if (err.code && err.code !== 'ERR_INVALID_ARG_TYPE') {
      throw new Error(`期望错误代码为 ERR_INVALID_ARG_TYPE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出 ERR_INVALID_ARG_TYPE 错误');
  }
});

test('4.13 null 作为 size 的行为 (应抛出错误)', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0);
  let errorThrown = false;
  try {
    crypto.randomFillSync(buf, 0, null);
  } catch (err) {
    errorThrown = true;
    // Node.js 会抛出类型错误
    if (err.code && err.code !== 'ERR_INVALID_ARG_TYPE') {
      throw new Error(`期望错误代码为 ERR_INVALID_ARG_TYPE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出 ERR_INVALID_ARG_TYPE 错误');
  }
});

test('4.14 多余参数的处理 (4个参数)', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0);
  // randomFillSync 只接受 3 个参数，第 4 个应该被忽略
  const result = crypto.randomFillSync(buf, 0, 5, 'ignored');
  
  if (result !== buf) {
    throw new Error('返回值应该是同一个 buffer 对象');
  }
  
  // 前5个字节应该被填充随机数据
  const filledPart = buf.slice(0, 5);
  if (!isValidRandomData(filledPart)) {
    throw new Error('前5个字节应该被填充随机数据');
  }
  
  // 后5个字节应该保持为0
  for (let i = 5; i < 10; i++) {
    if (buf[i] !== 0) {
      throw new Error(`后5个字节应该保持为0，但 buf[${i}] = ${buf[i]}`);
    }
  }
});

test('4.15 多余参数的处理 (5个参数)', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0);
  // 所有多余参数都应该被忽略
  const result = crypto.randomFillSync(buf, 2, 6, 'ignored', 'also_ignored');
  
  if (result !== buf) {
    throw new Error('返回值应该是同一个 buffer 对象');
  }
  
  // 前2个字节应该保持为0
  for (let i = 0; i < 2; i++) {
    if (buf[i] !== 0) {
      throw new Error(`前2个字节应该保持为0，但 buf[${i}] = ${buf[i]}`);
    }
  }
  
  // 中间6个字节应该被填充随机数据
  const filledPart = buf.slice(2, 8);
  if (!isValidRandomData(filledPart)) {
    throw new Error('中间6个字节应该被填充随机数据');
  }
  
  // 后2个字节应该保持为0
  for (let i = 8; i < 10; i++) {
    if (buf[i] !== 0) {
      throw new Error(`后2个字节应该保持为0，但 buf[${i}] = ${buf[i]}`);
    }
  }
});

// ============================================
// 5. 错误处理测试
// ============================================
console.log('\n5. 错误处理测试');

test('5.1 无效的 buffer 参数 - null', () => {
  let errorThrown = false;
  try {
    crypto.randomFillSync(null);
  } catch (err) {
    errorThrown = true;
    // 检查错误代码（如果存在）
    if (err.code && err.code !== 'ERR_INVALID_ARG_TYPE') {
      throw new Error(`期望错误代码为 ERR_INVALID_ARG_TYPE，但得到 ${err.code}`);
    }
    // 检查错误消息包含相关内容
    if (!err.message || (!err.message.includes('buffer') && !err.message.includes('Buffer') && !err.message.includes('TypedArray'))) {
      throw new Error(`错误消息应该提到 buffer 或 TypedArray，但得到: ${err.message}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('5.2 无效的 buffer 参数 - undefined', () => {
  let errorThrown = false;
  try {
    crypto.randomFillSync(undefined);
  } catch (err) {
    errorThrown = true;
    if (err.code && err.code !== 'ERR_INVALID_ARG_TYPE') {
      throw new Error(`期望错误代码为 ERR_INVALID_ARG_TYPE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('5.3 无效的 buffer 参数 - 字符串', () => {
  let errorThrown = false;
  try {
    crypto.randomFillSync('invalid');
  } catch (err) {
    errorThrown = true;
    if (err.code && err.code !== 'ERR_INVALID_ARG_TYPE') {
      throw new Error(`期望错误代码为 ERR_INVALID_ARG_TYPE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('5.4 无效的 buffer 参数 - 数字', () => {
  let errorThrown = false;
  try {
    crypto.randomFillSync(123);
  } catch (err) {
    errorThrown = true;
    if (err.code && err.code !== 'ERR_INVALID_ARG_TYPE') {
      throw new Error(`期望错误代码为 ERR_INVALID_ARG_TYPE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('5.5 无效的 buffer 参数 - 对象', () => {
  let errorThrown = false;
  try {
    crypto.randomFillSync({});
  } catch (err) {
    errorThrown = true;
    if (err.code && err.code !== 'ERR_INVALID_ARG_TYPE') {
      throw new Error(`期望错误代码为 ERR_INVALID_ARG_TYPE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('5.6 偏移量为负数', () => {
  const buf = Buffer.alloc(10);
  let errorThrown = false;
  try {
    crypto.randomFillSync(buf, -1);
  } catch (err) {
    errorThrown = true;
    if (err.code && err.code !== 'ERR_OUT_OF_RANGE') {
      throw new Error(`期望错误代码为 ERR_OUT_OF_RANGE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('5.7 偏移量超出 buffer 长度', () => {
  const buf = Buffer.alloc(10);
  let errorThrown = false;
  try {
    crypto.randomFillSync(buf, 11);
  } catch (err) {
    errorThrown = true;
    if (err.code && err.code !== 'ERR_OUT_OF_RANGE') {
      throw new Error(`期望错误代码为 ERR_OUT_OF_RANGE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('5.8 偏移量等于 buffer 长度（非零 buffer）', () => {
  const buf = Buffer.alloc(10);
  // 当 offset === buffer.length 时，Node.js 实际上不抛出错误，而是直接返回（因为要填充的大小为0）
  const result = crypto.randomFillSync(buf, 10);
  
  if (result !== buf) {
    throw new Error('返回值应该是同一个 buffer 对象');
  }
  
  // 整个 buffer 应该保持为 0（没有被填充）
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0) {
      throw new Error(`所有字节应该保持为0，但 buf[${i}] = ${buf[i]}`);
    }
  }
});

test('5.9 大小为负数', () => {
  const buf = Buffer.alloc(10);
  let errorThrown = false;
  try {
    crypto.randomFillSync(buf, 0, -1);
  } catch (err) {
    errorThrown = true;
    if (err.code && err.code !== 'ERR_OUT_OF_RANGE') {
      throw new Error(`期望错误代码为 ERR_OUT_OF_RANGE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('5.10 大小超出 buffer 长度', () => {
  const buf = Buffer.alloc(10);
  let errorThrown = false;
  try {
    crypto.randomFillSync(buf, 0, 11);
  } catch (err) {
    errorThrown = true;
    if (err.code && err.code !== 'ERR_OUT_OF_RANGE') {
      throw new Error(`期望错误代码为 ERR_OUT_OF_RANGE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('5.11 offset + size 超出 buffer 长度', () => {
  const buf = Buffer.alloc(10);
  let errorThrown = false;
  try {
    crypto.randomFillSync(buf, 5, 6);
  } catch (err) {
    errorThrown = true;
    if (err.code && err.code !== 'ERR_OUT_OF_RANGE') {
      throw new Error(`期望错误代码为 ERR_OUT_OF_RANGE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('5.12 无效的 offset 类型 - 字符串', () => {
  const buf = Buffer.alloc(10);
  let errorThrown = false;
  try {
    crypto.randomFillSync(buf, 'invalid');
  } catch (err) {
    errorThrown = true;
    if (err.code && err.code !== 'ERR_INVALID_ARG_TYPE') {
      throw new Error(`期望错误代码为 ERR_INVALID_ARG_TYPE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('5.13 无效的 size 类型 - 字符串', () => {
  const buf = Buffer.alloc(10);
  let errorThrown = false;
  try {
    crypto.randomFillSync(buf, 0, 'invalid');
  } catch (err) {
    errorThrown = true;
    if (err.code && err.code !== 'ERR_INVALID_ARG_TYPE') {
      throw new Error(`期望错误代码为 ERR_INVALID_ARG_TYPE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('5.14 offset 为浮点数', () => {
  const buf = Buffer.alloc(10);
  // Node.js 会自动将浮点数转换为整数（截断小数部分）
  const result = crypto.randomFillSync(buf, 1.5);
  
  if (result !== buf) {
    throw new Error('返回值应该是同一个 buffer 对象');
  }
  
  // 前1个字节应该保持为0（1.5被截断为1）
  if (buf[0] !== 0) {
    throw new Error(`buf[0] 应该保持为0，但得到 ${buf[0]}`);
  }
  
  // 后面的字节应该被填充随机数据
  const filledPart = buf.slice(1);
  if (!isValidRandomData(filledPart)) {
    throw new Error('从偏移量1开始的部分应该被填充随机数据');
  }
});

test('5.15 size 为浮点数', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0);
  // Node.js 会自动将浮点数转换为整数（截断小数部分）
  const result = crypto.randomFillSync(buf, 0, 5.5);
  
  if (result !== buf) {
    throw new Error('返回值应该是同一个 buffer 对象');
  }
  
  // 前5个字节应该被填充随机数据（5.5被截断为5）
  const filledPart = buf.slice(0, 5);
  if (!isValidRandomData(filledPart)) {
    throw new Error('前5个字节应该被填充随机数据');
  }
  
  // 后5个字节应该保持为0
  for (let i = 5; i < 10; i++) {
    if (buf[i] !== 0) {
      throw new Error(`后5个字节应该保持为0，但 buf[${i}] = ${buf[i]}`);
    }
  }
});

test('5.16 offset 为 NaN', () => {
  const buf = Buffer.alloc(10);
  let errorThrown = false;
  try {
    crypto.randomFillSync(buf, NaN);
  } catch (err) {
    errorThrown = true;
    if (err.code && err.code !== 'ERR_OUT_OF_RANGE') {
      throw new Error(`期望错误代码为 ERR_OUT_OF_RANGE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('5.17 size 为 NaN', () => {
  const buf = Buffer.alloc(10);
  let errorThrown = false;
  try {
    crypto.randomFillSync(buf, 0, NaN);
  } catch (err) {
    errorThrown = true;
    if (err.code && err.code !== 'ERR_OUT_OF_RANGE') {
      throw new Error(`期望错误代码为 ERR_OUT_OF_RANGE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('5.18 offset 为 Infinity', () => {
  const buf = Buffer.alloc(10);
  let errorThrown = false;
  try {
    crypto.randomFillSync(buf, Infinity);
  } catch (err) {
    errorThrown = true;
    if (err.code && err.code !== 'ERR_OUT_OF_RANGE') {
      throw new Error(`期望错误代码为 ERR_OUT_OF_RANGE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('5.19 size 为 Infinity', () => {
  const buf = Buffer.alloc(10);
  let errorThrown = false;
  try {
    crypto.randomFillSync(buf, 0, Infinity);
  } catch (err) {
    errorThrown = true;
    if (err.code && err.code !== 'ERR_OUT_OF_RANGE') {
      throw new Error(`期望错误代码为 ERR_OUT_OF_RANGE，但得到 ${err.code}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

// ============================================
// 6. 安全特性测试
// ============================================
console.log('\n6. 安全特性测试');

test('6.1 随机性检验 - 连续生成的数据不相同', () => {
  const buf1 = Buffer.alloc(32);
  const buf2 = Buffer.alloc(32);
  
  crypto.randomFillSync(buf1);
  crypto.randomFillSync(buf2);
  
  if (!areBuffersDifferent(buf1, buf2)) {
    throw new Error('连续生成的随机数据应该不同');
  }
});

test('6.2 随机性检验 - 多次生成都不相同', () => {
  const buffers = [];
  for (let i = 0; i < 10; i++) {
    const buf = Buffer.alloc(16);
    crypto.randomFillSync(buf);
    buffers.push(buf);
  }
  
  // 检查所有 buffer 都不相同
  for (let i = 0; i < buffers.length; i++) {
    for (let j = i + 1; j < buffers.length; j++) {
      if (!areBuffersDifferent(buffers[i], buffers[j])) {
        throw new Error(`第 ${i} 和第 ${j} 个 buffer 不应该相同`);
      }
    }
  }
});

test('6.3 随机性检验 - 字节分布不均匀（避免全0或全255）', () => {
  const buf = Buffer.alloc(256);
  crypto.randomFillSync(buf);
  
  // 检查是否所有字节都相同
  const firstByte = buf[0];
  let allSame = true;
  for (let i = 1; i < buf.length; i++) {
    if (buf[i] !== firstByte) {
      allSame = false;
      break;
    }
  }
  
  if (allSame) {
    throw new Error('随机数据不应该所有字节都相同');
  }
});

test('6.4 随机性检验 - 大量数据的熵检查', () => {
  const buf = Buffer.alloc(1024);
  crypto.randomFillSync(buf);
  
  // 统计每个字节值出现的次数
  const counts = new Array(256).fill(0);
  for (let i = 0; i < buf.length; i++) {
    counts[buf[i]]++;
  }
  
  // 检查是否有足够多的不同字节值（至少50%的可能值）
  let uniqueValues = 0;
  for (let i = 0; i < 256; i++) {
    if (counts[i] > 0) uniqueValues++;
  }
  
  if (uniqueValues < 128) {
    throw new Error(`随机数据应该有更多不同的字节值，当前只有 ${uniqueValues} 种`);
  }
});

test('6.5 部分填充不影响其他区域', () => {
  const buf = Buffer.alloc(30);
  
  // 填充特定模式
  for (let i = 0; i < 30; i++) {
    buf[i] = i;
  }
  
  // 只填充中间部分
  crypto.randomFillSync(buf, 10, 10);
  
  // 检查前10个字节保持不变
  for (let i = 0; i < 10; i++) {
    if (buf[i] !== i) {
      throw new Error(`前10个字节应该保持不变，但 buf[${i}] = ${buf[i]}，期望 ${i}`);
    }
  }
  
  // 检查后10个字节保持不变
  for (let i = 20; i < 30; i++) {
    if (buf[i] !== i) {
      throw new Error(`后10个字节应该保持不变，但 buf[${i}] = ${buf[i]}，期望 ${i}`);
    }
  }
  
  // 检查中间10个字节被修改
  let modified = false;
  for (let i = 10; i < 20; i++) {
    if (buf[i] !== i) {
      modified = true;
      break;
    }
  }
  if (!modified) {
    throw new Error('中间10个字节应该被修改');
  }
});

test('6.6 多次填充同一 buffer 产生不同结果', () => {
  const buf = Buffer.alloc(16);
  
  crypto.randomFillSync(buf);
  const copy1 = Buffer.from(buf);
  
  crypto.randomFillSync(buf);
  const copy2 = Buffer.from(buf);
  
  crypto.randomFillSync(buf);
  const copy3 = Buffer.from(buf);
  
  if (!areBuffersDifferent(copy1, copy2)) {
    throw new Error('第一次和第二次填充的结果应该不同');
  }
  if (!areBuffersDifferent(copy2, copy3)) {
    throw new Error('第二次和第三次填充的结果应该不同');
  }
  if (!areBuffersDifferent(copy1, copy3)) {
    throw new Error('第一次和第三次填充的结果应该不同');
  }
});

// ============================================
// 7. SharedArrayBuffer 测试（如果支持）
// ============================================
console.log('\n7. SharedArrayBuffer 测试');

test('7.1 填充 SharedArrayBuffer 支持的 Uint8Array', () => {
  if (typeof SharedArrayBuffer === 'undefined') {
    console.log('  跳过：当前环境不支持 SharedArrayBuffer');
    return;
  }
  
  const sab = new SharedArrayBuffer(16);
  const arr = new Uint8Array(sab);
  
  crypto.randomFillSync(arr);
  
  if (!isValidRandomData(Buffer.from(arr))) {
    throw new Error('SharedArrayBuffer 支持的 Uint8Array 应该被填充随机数据');
  }
});

// ============================================
// 8. 性能测试
// ============================================
console.log('\n8. 性能测试');

test('8.1 小 buffer 性能 (16 bytes)', () => {
  const buf = Buffer.alloc(16);
  const iterations = 10000;
  
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    crypto.randomFillSync(buf);
  }
  const end = Date.now();
  
  const timePerOp = (end - start) / iterations;
  console.log(`  每次操作耗时: ${timePerOp.toFixed(4)} ms`);
  
  // 确保性能合理（每次操作不超过 1ms）
  if (timePerOp > 1) {
    throw new Error(`性能不佳：每次操作耗时 ${timePerOp.toFixed(4)} ms`);
  }
});

test('8.2 中等 buffer 性能 (1KB)', () => {
  const buf = Buffer.alloc(1024);
  const iterations = 1000;
  
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    crypto.randomFillSync(buf);
  }
  const end = Date.now();
  
  const timePerOp = (end - start) / iterations;
  console.log(`  每次操作耗时: ${timePerOp.toFixed(4)} ms`);
  
  // 确保性能合理（每次操作不超过 5ms）
  if (timePerOp > 5) {
    throw new Error(`性能不佳：每次操作耗时 ${timePerOp.toFixed(4)} ms`);
  }
});

test('8.3 大 buffer 性能 (64KB)', () => {
  const buf = Buffer.alloc(65536);
  const iterations = 100;
  
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    crypto.randomFillSync(buf);
  }
  const end = Date.now();
  
  const timePerOp = (end - start) / iterations;
  console.log(`  每次操作耗时: ${timePerOp.toFixed(4)} ms`);
  
  // 确保性能合理（每次操作不超过 50ms）
  if (timePerOp > 50) {
    throw new Error(`性能不佳：每次操作耗时 ${timePerOp.toFixed(4)} ms`);
  }
});

// ============================================
// 9. 特殊场景测试
// ============================================
console.log('\n9. 特殊场景测试');

test('9.1 Buffer.from() 创建的 buffer', () => {
  const original = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  crypto.randomFillSync(original);
  
  if (!isValidRandomData(original)) {
    throw new Error('Buffer.from() 创建的 buffer 应该被填充随机数据');
  }
});

test('9.2 Buffer.allocUnsafe() 创建的 buffer', () => {
  const buf = Buffer.allocUnsafe(16);
  crypto.randomFillSync(buf);
  
  if (buf.length !== 16) {
    throw new Error('Buffer 长度应该为 16');
  }
  // allocUnsafe 的 buffer 会被随机数据覆盖
});

test('9.3 通过 slice 创建的 buffer 视图', () => {
  const parent = Buffer.alloc(30);
  const slice = parent.slice(10, 20);
  
  crypto.randomFillSync(slice);
  
  // slice 被填充
  if (!isValidRandomData(slice)) {
    throw new Error('slice 应该被填充随机数据');
  }
  
  // 父 buffer 的对应部分也被修改
  if (!isValidRandomData(parent.slice(10, 20))) {
    throw new Error('父 buffer 的对应部分也应该被修改');
  }
  
  // 父 buffer 的其他部分保持为 0
  for (let i = 0; i < 10; i++) {
    if (parent[i] !== 0) {
      throw new Error(`父 buffer 的前10个字节应该保持为0，但 parent[${i}] = ${parent[i]}`);
    }
  }
  for (let i = 20; i < 30; i++) {
    if (parent[i] !== 0) {
      throw new Error(`父 buffer 的后10个字节应该保持为0，但 parent[${i}] = ${parent[i]}`);
    }
  }
});

test('9.4 TypedArray 视图与底层 ArrayBuffer', () => {
  const buffer = new ArrayBuffer(16);
  const view1 = new Uint8Array(buffer);
  
  crypto.randomFillSync(view1);
  
  // 创建另一个视图查看同一个 buffer
  const view2 = new Uint16Array(buffer);
  
  // view2 应该也能看到随机数据
  let hasNonZero = false;
  for (let i = 0; i < view2.length; i++) {
    if (view2[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  if (!hasNonZero) {
    throw new Error('底层 ArrayBuffer 的数据应该被修改，view2 应该能看到');
  }
});

test('9.5 填充 TypedArray 的子数组视图', () => {
  const buffer = new ArrayBuffer(32);
  const fullView = new Uint8Array(buffer);
  const subView = new Uint8Array(buffer, 8, 16); // 偏移8，长度16
  
  crypto.randomFillSync(subView);
  
  // 前8个字节应该保持为0
  for (let i = 0; i < 8; i++) {
    if (fullView[i] !== 0) {
      throw new Error(`前8个字节应该保持为0，但 fullView[${i}] = ${fullView[i]}`);
    }
  }
  
  // 中间16个字节应该被填充
  if (!isValidRandomData(Buffer.from(subView))) {
    throw new Error('subView 应该被填充随机数据');
  }
  
  // 后8个字节应该保持为0
  for (let i = 24; i < 32; i++) {
    if (fullView[i] !== 0) {
      throw new Error(`后8个字节应该保持为0，但 fullView[${i}] = ${fullView[i]}`);
    }
  }
});

test('9.6 连续的部分填充', () => {
  const buf = Buffer.alloc(30);
  buf.fill(0);
  
  // 第一次填充
  crypto.randomFillSync(buf, 0, 10);
  const part1 = Buffer.from(buf.slice(0, 10));
  
  // 第二次填充
  crypto.randomFillSync(buf, 10, 10);
  const part2 = Buffer.from(buf.slice(10, 20));
  
  // 第三次填充
  crypto.randomFillSync(buf, 20, 10);
  const part3 = Buffer.from(buf.slice(20, 30));
  
  // 所有部分都应该被填充随机数据
  if (!isValidRandomData(part1)) {
    throw new Error('第一部分应该被填充随机数据');
  }
  if (!isValidRandomData(part2)) {
    throw new Error('第二部分应该被填充随机数据');
  }
  if (!isValidRandomData(part3)) {
    throw new Error('第三部分应该被填充随机数据');
  }
  
  // 所有部分应该不同
  if (!areBuffersDifferent(part1, part2)) {
    throw new Error('第一部分和第二部分应该不同');
  }
  if (!areBuffersDifferent(part2, part3)) {
    throw new Error('第二部分和第三部分应该不同');
  }
});

// ============================================
// 输出测试结果
// ============================================
console.log('\n' + '='.repeat(50));
console.log('测试总结');
console.log('='.repeat(50));
console.log(`总测试数: ${testResults.totalTests}`);
console.log(`通过: ${testResults.passedTests} ✅`);
console.log(`失败: ${testResults.failedTests} ❌`);
console.log(`成功率: ${((testResults.passedTests / testResults.totalTests) * 100).toFixed(2)}%`);

if (testResults.failedTests > 0) {
  console.log('\n失败的测试:');
  testResults.details
    .filter(t => t.status === '❌')
    .forEach(t => {
      console.log(`\n${t.status} ${t.name}`);
      console.log(`  错误: ${t.message}`);
    });
}

console.log('\n' + JSON.stringify(testResults, null, 2));

return testResults;

