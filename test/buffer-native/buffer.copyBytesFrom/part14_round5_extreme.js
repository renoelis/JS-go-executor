// Buffer.copyBytesFrom() - Part 14: Round 5 - Extreme Scenarios and Final Edge Cases
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

// 极大 TypedArray
test('复制 100KB Uint8Array', () => {
  const size = 100 * 1024;
  const view = new Uint8Array(size);
  for (let i = 0; i < size; i++) view[i] = i % 256;
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === size && buf[1000] === (1000 % 256);
});

test('复制部分极大 TypedArray', () => {
  const size = 50 * 1024;
  const view = new Uint8Array(size);
  for (let i = 0; i < size; i++) view[i] = i % 256;
  const buf = Buffer.copyBytesFrom(view, 1000, 1000);
  return buf.length === 1000 && buf[0] === (1000 % 256);
});

// 边界临界值
test('offset = length - 1', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const buf = Buffer.copyBytesFrom(view, 4);
  return buf.length === 1 && buf[0] === 50;
});

test('length = 剩余长度', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 1, 3);
  return buf.length === 3 && buf[2] === 40;
});

test('length = 剩余长度 + 1(自动截断)', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 1, 3);
  return buf.length === 2;
});

// 多重嵌套场景
test('ArrayBuffer -> TypedArray -> subarray -> copyBytesFrom', () => {
  const ab = new ArrayBuffer(100);
  const full = new Uint8Array(ab);
  for (let i = 0; i < 100; i++) full[i] = i;
  const view = new Uint8Array(ab, 20, 30);
  const sub = view.subarray(5, 15);
  const buf = Buffer.copyBytesFrom(sub, 2, 5);
  return buf.length === 5 && buf[0] === 27;
});

// 类型转换极端情况
test('Int8Array 最大负数', () => {
  const view = new Int8Array([-128, -127, -1]);
  const buf = Buffer.copyBytesFrom(view);
  return buf[0] === 128 && buf[1] === 129 && buf[2] === 255;
});

test('Uint8ClampedArray 夹紧行为', () => {
  const view = new Uint8ClampedArray([0, 127.5, 255]);
  const buf = Buffer.copyBytesFrom(view);
  return buf[0] === 0 && buf[1] === 128 && buf[2] === 255;
});

test('Float32Array 特殊浮点值组合', () => {
  const view = new Float32Array([0, -0, Infinity, -Infinity, NaN]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 20;
});

test('Float64Array 极值组合', () => {
  const view = new Float64Array([Number.MIN_VALUE, Number.MAX_VALUE, Number.EPSILON]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 24;
});

test('BigInt64Array 极值', () => {
  const view = new BigInt64Array([
    -9223372036854775808n,
    0n,
    9223372036854775807n
  ]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 24;
});

test('BigUint64Array 最大值', () => {
  const view = new BigUint64Array([
    0n,
    18446744073709551615n
  ]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 16;
});

// 性能压力测试
test('连续创建 1000 个小 Buffer', () => {
  const view = new Uint8Array([1, 2, 3]);
  let success = true;
  for (let i = 0; i < 1000; i++) {
    const buf = Buffer.copyBytesFrom(view);
    if (buf.length !== 3 || buf[0] !== 1) {
      success = false;
      break;
    }
  }
  return success;
});

test('创建 100 个大 Buffer', () => {
  const view = new Uint8Array(1000);
  let success = true;
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.copyBytesFrom(view);
    if (buf.length !== 1000) {
      success = false;
      break;
    }
  }
  return success;
});

// 特殊字节模式
test('全 0x00 模式', () => {
  const view = new Uint8Array(100);
  const buf = Buffer.copyBytesFrom(view);
  let allZero = true;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0) allZero = false;
  }
  return allZero && buf.length === 100;
});

test('全 0xFF 模式', () => {
  const view = new Uint8Array(100);
  view.fill(255);
  const buf = Buffer.copyBytesFrom(view);
  let allFF = true;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 255) allFF = false;
  }
  return allFF;
});

test('0xAA 0x55 交替模式', () => {
  const view = new Uint8Array(100);
  for (let i = 0; i < 100; i++) {
    view[i] = (i % 2 === 0) ? 0xAA : 0x55;
  }
  const buf = Buffer.copyBytesFrom(view);
  return buf[0] === 0xAA && buf[1] === 0x55 && buf[98] === 0xAA;
});

test('递增字节模式', () => {
  const view = new Uint8Array(256);
  for (let i = 0; i < 256; i++) view[i] = i;
  const buf = Buffer.copyBytesFrom(view);
  let correct = true;
  for (let i = 0; i < 256; i++) {
    if (buf[i] !== i) correct = false;
  }
  return correct;
});

test('递减字节模式', () => {
  const view = new Uint8Array(256);
  for (let i = 0; i < 256; i++) view[i] = 255 - i;
  const buf = Buffer.copyBytesFrom(view);
  return buf[0] === 255 && buf[255] === 0;
});

// 实际应用场景模拟
test('音频处理: Int16Array 音频样本', () => {
  const samples = new Int16Array(1024);
  for (let i = 0; i < 1024; i++) {
    samples[i] = Math.floor(Math.sin(i / 10) * 32767);
  }
  const buf = Buffer.copyBytesFrom(samples, 512, 256);
  return buf.length === 512;
});

test('图像处理: Uint8ClampedArray RGBA 像素', () => {
  const pixels = new Uint8ClampedArray(400);
  for (let i = 0; i < 100; i++) {
    pixels[i * 4] = i;
    pixels[i * 4 + 1] = i;
    pixels[i * 4 + 2] = i;
    pixels[i * 4 + 3] = 255;
  }
  const buf = Buffer.copyBytesFrom(pixels, 40, 40);
  return buf.length === 40;
});

test('科学计算: Float64Array 高精度数据', () => {
  const data = new Float64Array(100);
  for (let i = 0; i < 100; i++) {
    data[i] = Math.PI * i;
  }
  const buf = Buffer.copyBytesFrom(data, 50, 25);
  return buf.length === 200;
});

test('加密应用: 随机字节序列', () => {
  const random = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    random[i] = Math.floor(Math.random() * 256);
  }
  const buf = Buffer.copyBytesFrom(random);
  return buf.length === 256;
});

test('网络协议: 数据包头和负载分离', () => {
  const packet = new Uint8Array([0x01, 0x02, 0x03, 0x04, 100, 101, 102, 103, 104]);
  const header = Buffer.copyBytesFrom(packet, 0, 4);
  const payload = Buffer.copyBytesFrom(packet, 4);
  return header.length === 4 && payload.length === 5 &&
         header[0] === 1 && payload[0] === 100;
});

// 兼容性测试
test('与 Buffer.from(TypedArray) 结果对比', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const buf1 = Buffer.from(view);
  const buf2 = Buffer.copyBytesFrom(view);
  return buf1.equals(buf2);
});

test('与 Buffer.from(TypedArray.buffer) 结果对比', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf1 = Buffer.from(view.buffer);
  const buf2 = Buffer.copyBytesFrom(view);
  return buf1.equals(buf2);
});

// 错误恢复
test('错误后可以继续正常调用', () => {
  try {
    Buffer.copyBytesFrom(null);
  } catch (e) {}

  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 3 && buf[0] === 10;
});

test('多次错误后仍可正常调用', () => {
  try { Buffer.copyBytesFrom(null); } catch (e) {}
  try { Buffer.copyBytesFrom([1, 2, 3]); } catch (e) {}
  try { Buffer.copyBytesFrom(new Uint8Array([1]), -1); } catch (e) {}

  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 1, 1);
  return buf.length === 1 && buf[0] === 20;
});

// 最终验证
test('所有 TypedArray 类型都支持 offset 和 length', () => {
  const types = [
    new Int8Array([1, 2, 3]),
    new Uint8Array([1, 2, 3]),
    new Uint8ClampedArray([1, 2, 3]),
    new Int16Array([1, 2, 3]),
    new Uint16Array([1, 2, 3]),
    new Int32Array([1, 2, 3]),
    new Uint32Array([1, 2, 3]),
    new Float32Array([1, 2, 3]),
    new Float64Array([1, 2, 3]),
    new BigInt64Array([1n, 2n, 3n]),
    new BigUint64Array([1n, 2n, 3n])
  ];

  let allSuccess = true;
  for (const view of types) {
    const buf = Buffer.copyBytesFrom(view, 1, 1);
    if (buf.length !== view.BYTES_PER_ELEMENT) {
      allSuccess = false;
    }
  }
  return allSuccess;
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
