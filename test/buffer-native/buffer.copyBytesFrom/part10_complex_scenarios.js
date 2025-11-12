// Buffer.copyBytesFrom() - Part 10: Complex Scenarios and Compatibility Tests
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

// 连续复制测试
test('连续多次复制同一 TypedArray', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf1 = Buffer.copyBytesFrom(view);
  const buf2 = Buffer.copyBytesFrom(view);
  const buf3 = Buffer.copyBytesFrom(view);
  return buf1[0] === 10 && buf2[0] === 10 && buf3[0] === 10 &&
         buf1.buffer !== buf2.buffer && buf2.buffer !== buf3.buffer;
});

test('复制后修改再复制', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf1 = Buffer.copyBytesFrom(view);
  view[0] = 99;
  const buf2 = Buffer.copyBytesFrom(view);
  return buf1[0] === 10 && buf2[0] === 99;
});

test('循环复制多个 offset', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const bufs = [];
  for (let i = 0; i < 5; i++) {
    bufs.push(Buffer.copyBytesFrom(view, i));
  }
  return bufs[0].length === 5 && bufs[4].length === 1 && bufs[4][0] === 50;
});

// 与其他 Buffer 方法组合
test('copyBytesFrom 后使用 Buffer.concat', () => {
  const view1 = new Uint8Array([10, 20]);
  const view2 = new Uint8Array([30, 40]);
  const buf1 = Buffer.copyBytesFrom(view1);
  const buf2 = Buffer.copyBytesFrom(view2);
  const combined = Buffer.concat([buf1, buf2]);
  return combined.length === 4 && combined[0] === 10 && combined[3] === 40;
});

test('copyBytesFrom 后使用 Buffer.compare', () => {
  const view1 = new Uint8Array([10, 20, 30]);
  const view2 = new Uint8Array([10, 20, 30]);
  const buf1 = Buffer.copyBytesFrom(view1);
  const buf2 = Buffer.copyBytesFrom(view2);
  return Buffer.compare(buf1, buf2) === 0;
});

test('copyBytesFrom 后使用 buf.slice', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const buf = Buffer.copyBytesFrom(view);
  const sliced = buf.slice(1, 4);
  return sliced.length === 3 && sliced[0] === 20 && sliced[2] === 40;
});

test('copyBytesFrom 后使用 buf.toString', () => {
  const view = new Uint8Array([72, 101, 108, 108, 111]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.toString('utf8') === 'Hello';
});

test('copyBytesFrom 后使用 buf.write', () => {
  const view = new Uint8Array([0, 0, 0, 0, 0]);
  const buf = Buffer.copyBytesFrom(view);
  buf.write('Hi', 0, 'utf8');
  return buf[0] === 72 && buf[1] === 105;
});

test('copyBytesFrom 后使用 buf.fill', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view);
  buf.fill(99);
  return buf[0] === 99 && buf[3] === 99 && view[0] === 10;
});

test('copyBytesFrom 后使用 buf.copy', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf1 = Buffer.copyBytesFrom(view);
  const buf2 = Buffer.alloc(5);
  buf1.copy(buf2, 1);
  return buf2[0] === 0 && buf2[1] === 10 && buf2[3] === 30 && buf2[4] === 0;
});

test('copyBytesFrom 后读取数值', () => {
  const view = new Uint32Array([0x12345678]);
  const buf = Buffer.copyBytesFrom(view);
  const value = buf.readUInt32LE(0);
  return value === 0x12345678;
});

test('copyBytesFrom 后写入数值', () => {
  const view = new Uint8Array([0, 0, 0, 0]);
  const buf = Buffer.copyBytesFrom(view);
  buf.writeUInt32LE(0xABCD1234, 0);
  return buf[0] === 0x34 && view[0] === 0;
});

// 性能相关测试
test('大量小 Buffer 复制', () => {
  const view = new Uint8Array([1, 2, 3]);
  let success = true;
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.copyBytesFrom(view);
    if (buf.length !== 3 || buf[0] !== 1) {
      success = false;
      break;
    }
  }
  return success;
});

test('少量大 Buffer 复制', () => {
  const view = new Uint8Array(10000);
  for (let i = 0; i < 10000; i++) view[i] = i % 256;
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 10000 && buf[5000] === (5000 % 256);
});

// 边界组合测试
test('最大 offset 加零 length', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 3, 0);
  return buf.length === 0;
});

test('零 offset 加最大 length', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 0, Number.MAX_SAFE_INTEGER);
  return buf.length === 3 && buf[0] === 10;
});

test('中间 offset 加超大 length', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const buf = Buffer.copyBytesFrom(view, 2, 1000);
  return buf.length === 3 && buf[0] === 30 && buf[2] === 50;
});

// 类型转换场景
test('Uint8ClampedArray 边界值', () => {
  const view = new Uint8ClampedArray([0, 127, 128, 255]);
  const buf = Buffer.copyBytesFrom(view);
  return buf[0] === 0 && buf[1] === 127 && buf[2] === 128 && buf[3] === 255;
});

test('Int8Array 到 Buffer 到 Uint8Array', () => {
  const i8 = new Int8Array([-1, -2, -3]);
  const buf = Buffer.copyBytesFrom(i8);
  return buf[0] === 255 && buf[1] === 254 && buf[2] === 253;
});

// 内存和引用测试
test('原始 TypedArray 可以被回收', () => {
  let view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view);
  view = null;
  return buf[0] === 10 && buf.length === 3;
});

test('Buffer 可以独立存活', () => {
  function createBuffer() {
    const view = new Uint8Array([10, 20, 30]);
    return Buffer.copyBytesFrom(view);
  }
  const buf = createBuffer();
  return buf[0] === 10 && buf.length === 3;
});

// 特殊输入组合
test('所有参数都是最小值', () => {
  const view = new Uint8Array([10]);
  const buf = Buffer.copyBytesFrom(view, 0, 0);
  return buf.length === 0;
});

test('所有参数都是边界值', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 0, 3);
  return buf.length === 3 && buf[0] === 10 && buf[2] === 30;
});

test('只有第一个参数', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 3 && buf[0] === 10;
});

test('两个参数(省略 length)', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 1);
  return buf.length === 3 && buf[0] === 20;
});

// TypedArray 元素类型混合
test('不同字节长度 TypedArray 正确计算', () => {
  const u8 = new Uint8Array([1, 2, 3, 4]);
  const u16 = new Uint16Array([1, 2]);
  const u32 = new Uint32Array([1]);
  const buf8 = Buffer.copyBytesFrom(u8);
  const buf16 = Buffer.copyBytesFrom(u16);
  const buf32 = Buffer.copyBytesFrom(u32);
  return buf8.length === 4 && buf16.length === 4 && buf32.length === 4;
});

// 实际使用场景模拟
test('从网络数据包复制', () => {
  const packet = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0xFF, 0xFE]);
  const header = Buffer.copyBytesFrom(packet, 0, 4);
  const payload = Buffer.copyBytesFrom(packet, 4);
  return header.length === 4 && payload.length === 2 && header[0] === 1 && payload[1] === 254;
});

test('从图像数据复制', () => {
  const imageData = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
  const buf = Buffer.copyBytesFrom(imageData);
  return buf.length === 8 && buf[0] === 255 && buf[4] === 0;
});

test('从音频采样复制', () => {
  const samples = new Float32Array([0.0, 0.5, 1.0, -0.5, -1.0]);
  const buf = Buffer.copyBytesFrom(samples);
  return buf.length === 20;
});

test('从加密数据复制', () => {
  const encrypted = new Uint8Array(32);
  for (let i = 0; i < 32; i++) encrypted[i] = i;
  const buf = Buffer.copyBytesFrom(encrypted);
  return buf.length === 32 && buf[0] === 0 && buf[31] === 31;
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
