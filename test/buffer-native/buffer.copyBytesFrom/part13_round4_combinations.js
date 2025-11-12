// Buffer.copyBytesFrom() - Part 13: Round 4 - Combination Scenarios
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

// 多种TypedArray组合
test('同一 ArrayBuffer 不同类型视图组合', () => {
  const ab = new ArrayBuffer(16);
  const u8 = new Uint8Array(ab);
  const u16 = new Uint16Array(ab);
  const u32 = new Uint32Array(ab);
  u8[0] = 0x12;
  u8[1] = 0x34;
  const buf8 = Buffer.copyBytesFrom(u8);
  const buf16 = Buffer.copyBytesFrom(u16);
  const buf32 = Buffer.copyBytesFrom(u32);
  return buf8.length === 16 && buf16.length === 16 && buf32.length === 16;
});

// Buffer 方法链式调用
test('复制后链式调用 slice + toString', () => {
  const view = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]);
  const buf = Buffer.copyBytesFrom(view);
  const result = buf.slice(0, 5).toString('utf8');
  return result === 'Hello';
});

test('复制后 subarray 再复制', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const buf1 = Buffer.copyBytesFrom(view);
  const sub = buf1.subarray(1, 4);
  const buf2 = Buffer.copyBytesFrom(sub);
  return buf2.length === 3 && buf2[0] === 20;
});

test('复制后 fill 再 slice', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view);
  buf.fill(0, 1, 3);
  const sliced = buf.slice(0, 4);
  return sliced[0] === 10 && sliced[1] === 0 && sliced[2] === 0 && sliced[3] === 40;
});

// 多维度组合
test('offset + length 所有组合: (0,0)', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 0, 0);
  return buf.length === 0;
});

test('offset + length 所有组合: (0,1)', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 0, 1);
  return buf.length === 1 && buf[0] === 10;
});

test('offset + length 所有组合: (0,N)', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 0, 3);
  return buf.length === 3 && buf[0] === 10 && buf[2] === 30;
});

test('offset + length 所有组合: (1,0)', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 1, 0);
  return buf.length === 0;
});

test('offset + length 所有组合: (1,1)', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 1, 1);
  return buf.length === 1 && buf[0] === 20;
});

test('offset + length 所有组合: (1,N-1)', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 1, 2);
  return buf.length === 2 && buf[0] === 20 && buf[1] === 30;
});

test('offset + length 所有组合: (N,0)', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 3, 0);
  return buf.length === 0;
});

test('offset + length 所有组合: (N-1,1)', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 2, 1);
  return buf.length === 1 && buf[0] === 30;
});

// 不同 TypedArray + 不同参数组合
test('Int8Array + offset + length', () => {
  const view = new Int8Array([-10, -20, -30, -40]);
  const buf = Buffer.copyBytesFrom(view, 1, 2);
  return buf.length === 2 && buf[0] === 236 && buf[1] === 226;
});

test('Uint16Array + offset + length', () => {
  const view = new Uint16Array([0x1111, 0x2222, 0x3333]);
  const buf = Buffer.copyBytesFrom(view, 1, 1);
  return buf.length === 2;
});

test('Float32Array + offset + length', () => {
  const view = new Float32Array([1.1, 2.2, 3.3, 4.4]);
  const buf = Buffer.copyBytesFrom(view, 1, 2);
  return buf.length === 8;
});

test('BigUint64Array + offset + length', () => {
  const view = new BigUint64Array([100n, 200n, 300n]);
  const buf = Buffer.copyBytesFrom(view, 1, 1);
  return buf.length === 8;
});

// TypedArray 视图 + offset 组合
test('Subarray + offset 参数', () => {
  const original = new Uint8Array([10, 20, 30, 40, 50]);
  const sub = original.subarray(1, 4);
  const buf = Buffer.copyBytesFrom(sub, 1);
  return buf.length === 2 && buf[0] === 30 && buf[1] === 40;
});

test('Subarray + offset + length 参数', () => {
  const original = new Uint8Array([10, 20, 30, 40, 50, 60]);
  const sub = original.subarray(1, 5);
  const buf = Buffer.copyBytesFrom(sub, 1, 2);
  return buf.length === 2 && buf[0] === 30 && buf[1] === 40;
});

test('嵌套 subarray + 参数', () => {
  const original = new Uint8Array([10, 20, 30, 40, 50, 60, 70]);
  const sub1 = original.subarray(1, 6);
  const sub2 = sub1.subarray(1, 4);
  const buf = Buffer.copyBytesFrom(sub2, 1);
  return buf.length === 2 && buf[0] === 40;
});

// 与 Buffer 其他方法组合
test('copyBytesFrom + compare', () => {
  const view1 = new Uint8Array([1, 2, 3]);
  const view2 = new Uint8Array([1, 2, 4]);
  const buf1 = Buffer.copyBytesFrom(view1);
  const buf2 = Buffer.copyBytesFrom(view2);
  return Buffer.compare(buf1, buf2) < 0;
});

test('copyBytesFrom + equals', () => {
  const view1 = new Uint8Array([1, 2, 3]);
  const view2 = new Uint8Array([1, 2, 3]);
  const buf1 = Buffer.copyBytesFrom(view1);
  const buf2 = Buffer.copyBytesFrom(view2);
  return buf1.equals(buf2);
});

test('copyBytesFrom + indexOf', () => {
  const view = new Uint8Array([10, 20, 30, 20, 40]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.indexOf(20) === 1;
});

test('copyBytesFrom + includes', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.includes(20);
});

test('copyBytesFrom + reverse', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view);
  buf.reverse();
  return buf[0] === 30 && buf[2] === 10;
});

test('copyBytesFrom + swap16', () => {
  const view = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
  const buf = Buffer.copyBytesFrom(view);
  buf.swap16();
  return buf[0] === 0x34 && buf[1] === 0x12;
});

test('copyBytesFrom + swap32', () => {
  const view = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
  const buf = Buffer.copyBytesFrom(view);
  buf.swap32();
  return buf[0] === 0x78 && buf[3] === 0x12;
});

test('copyBytesFrom + toJSON', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view);
  const json = buf.toJSON();
  return json.type === 'Buffer' && json.data[0] === 1;
});

// 不同大小 TypedArray 组合
test('小 Uint8Array 到大 Uint32Array', () => {
  const u8 = new Uint8Array([1, 2, 3, 4]);
  const buf = Buffer.copyBytesFrom(u8);
  const u32 = new Uint32Array(buf.buffer, buf.byteOffset, 1);
  return u32.length === 1;
});

test('大 Uint32Array 到小 Uint8Array 视图', () => {
  const u32 = new Uint32Array([0x12345678]);
  const buf = Buffer.copyBytesFrom(u32);
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, 4);
  return u8.length === 4;
});

// 特殊值组合
test('全 0 + offset', () => {
  const view = new Uint8Array([0, 0, 0, 0, 0]);
  const buf = Buffer.copyBytesFrom(view, 2);
  return buf.length === 3 && buf[0] === 0;
});

test('全 255 + length', () => {
  const view = new Uint8Array([255, 255, 255, 255]);
  const buf = Buffer.copyBytesFrom(view, 0, 2);
  return buf.length === 2 && buf[0] === 255 && buf[1] === 255;
});

test('混合值 + 中间范围', () => {
  const view = new Uint8Array([0, 1, 127, 128, 254, 255]);
  const buf = Buffer.copyBytesFrom(view, 1, 4);
  return buf.length === 4 && buf[0] === 1 && buf[3] === 254;
});

// 循环和批量操作
test('循环复制不同 offset', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  let success = true;
  for (let i = 0; i < 5; i++) {
    const buf = Buffer.copyBytesFrom(view, i);
    if (buf.length !== (5 - i)) success = false;
  }
  return success;
});

test('批量复制不同 TypedArray', () => {
  const arrays = [
    new Uint8Array([1]),
    new Uint16Array([2]),
    new Uint32Array([3]),
    new Float32Array([4.0])
  ];
  const bufs = arrays.map(arr => Buffer.copyBytesFrom(arr));
  return bufs[0].length === 1 && bufs[1].length === 2 &&
         bufs[2].length === 4 && bufs[3].length === 4;
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
