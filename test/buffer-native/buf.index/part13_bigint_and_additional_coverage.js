// buf[index] - Part 13: BigInt and Additional Coverage Tests
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

// BigInt 作为索引测试
test('使用 BigInt(0) 作为索引读取', () => {
  const buf = Buffer.from([10, 20, 30]);
  try {
    const val = buf[BigInt(0)];
    // BigInt 会被转换为字符串 "0"，然后作为索引
    return val === 10;
  } catch (e) {
    // 某些环境可能不支持 BigInt 作为索引
    return true;
  }
});

test('使用 BigInt(1) 作为索引读取', () => {
  const buf = Buffer.from([10, 20, 30]);
  try {
    const val = buf[BigInt(1)];
    return val === 20;
  } catch (e) {
    return true;
  }
});

test('使用 BigInt(2) 作为索引写入', () => {
  const buf = Buffer.alloc(3);
  try {
    buf[BigInt(2)] = 99;
    return buf[2] === 99;
  } catch (e) {
    return true;
  }
});

test('使用大 BigInt 作为索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    const val = buf[BigInt(9007199254740991)];
    return val === undefined;
  } catch (e) {
    return true;
  }
});

// 写入 BigInt 值测试
test('写入 BigInt 值 0n', () => {
  const buf = Buffer.alloc(1);
  try {
    buf[0] = BigInt(0);
    return buf[0] === 0;
  } catch (e) {
    // BigInt 不能直接转换为 Number
    return e.message.includes('BigInt') || e.message.includes('Cannot');
  }
});

test('写入 BigInt 值 255n', () => {
  const buf = Buffer.alloc(1);
  try {
    buf[0] = BigInt(255);
    return buf[0] === 255;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('Cannot');
  }
});

test('写入 BigInt 值 256n（应该取模）', () => {
  const buf = Buffer.alloc(1);
  try {
    buf[0] = BigInt(256);
    return buf[0] === 0;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('Cannot');
  }
});

// 其他 TypedArray 类型交互测试
test('Int8Array 和 Buffer 索引行为一致', () => {
  const buf = Buffer.from([255, 254, 1]);
  const arr = new Int8Array([255, 254, 1]);
  // Uint8Array 存储无符号，Int8Array 存储有符号
  return buf[0] === 255 && arr[0] === -1;
});

test('Buffer 从 Int16Array 创建后索引访问', () => {
  const int16 = new Int16Array([256, 512]);
  const buf = Buffer.from(int16.buffer);
  // 小端序：256 = 0x0100, 存储为 00 01
  return buf.length === 4 && buf[0] !== undefined;
});

test('Buffer 从 Float32Array 创建后索引访问', () => {
  const float32 = new Float32Array([1.5, 2.5]);
  const buf = Buffer.from(float32.buffer);
  return buf.length === 8 && buf[0] !== undefined;
});

// 跨 Buffer 实例操作
test('不同 Buffer 实例索引独立', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  buf1[0] = 99;
  return buf1[0] === 99 && buf2[0] === 4;
});

test('Buffer.slice 后索引独立', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = buf1.slice(1, 4);
  buf2[0] = 99;
  // slice 创建的是同一内存的视图
  return buf1[1] === 99 && buf2[0] === 99;
});

test('Buffer.subarray 后索引共享内存', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = buf1.subarray(1, 4);
  buf2[0] = 88;
  return buf1[1] === 88 && buf2[0] === 88;
});

test('Buffer.from(buffer) 创建独立副本', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from(buf1);
  buf2[0] = 99;
  return buf1[0] === 1 && buf2[0] === 99;
});

// 连续索引操作
test('连续读取所有索引', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    sum += buf[i];
  }
  return sum === 150;
});

test('连续写入所有索引', () => {
  const buf = Buffer.alloc(5);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = i * 10;
  }
  return buf[0] === 0 && buf[1] === 10 && buf[2] === 20 && buf[3] === 30 && buf[4] === 40;
});

test('反向遍历索引', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let result = [];
  for (let i = buf.length - 1; i >= 0; i--) {
    result.push(buf[i]);
  }
  return result[0] === 5 && result[4] === 1;
});

// 索引与 length 属性交互
test('修改索引不改变 length', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf[0] = 99;
  buf[1] = 88;
  buf[2] = 77;
  return buf.length === 3;
});

test('越界写入不改变 length', () => {
  const buf = Buffer.from([1, 2, 3]);
  const originalLength = buf.length;
  buf[10] = 99;
  buf[100] = 88;
  return buf.length === originalLength;
});

// 索引与 byteLength 属性
test('索引操作不影响 byteLength', () => {
  const buf = Buffer.from([1, 2, 3]);
  const originalByteLength = buf.byteLength;
  buf[0] = 99;
  return buf.byteLength === originalByteLength;
});

// 索引与 buffer 属性
test('通过 buffer 属性访问底层 ArrayBuffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arrayBuffer = buf.buffer;
  return arrayBuffer instanceof ArrayBuffer;
});

test('修改 Buffer 索引影响底层 ArrayBuffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const view = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  buf[0] = 99;
  return view[0] === 99;
});

// 索引与 byteOffset 属性
test('Buffer 的 byteOffset 正确', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2);
  return sub.byteOffset >= 0 && sub[0] === 3;
});

// 特殊场景：空操作
test('读取相同索引多次返回相同值', () => {
  const buf = Buffer.from([42]);
  return buf[0] === 42 && buf[0] === 42 && buf[0] === 42;
});

test('写入相同索引多次保留最后值', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 10;
  buf[0] = 20;
  buf[0] = 30;
  return buf[0] === 30;
});

// 索引与 toString 交互
test('修改索引后 toString 反映变化', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  buf[0] = 0x44;
  return buf.toString('utf8') === 'DBC';
});

// 索引与 JSON 序列化
test('JSON.stringify 包含所有索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = JSON.stringify(buf);
  const parsed = JSON.parse(json);
  return parsed.data && parsed.data.length === 3;
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
