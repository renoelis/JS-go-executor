// buf.toJSON() - DataView, BigInt, and Advanced TypedArray Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌', passed: pass });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// DataView 测试
test('从 DataView 的 buffer 创建的 Buffer', () => {
  const ab = new ArrayBuffer(16);
  const dv = new DataView(ab);
  dv.setUint8(0, 50);
  dv.setUint8(1, 60);
  dv.setUint16(2, 1000, true); // little-endian

  const buf = Buffer.from(ab);
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 16) return false;
  if (json.data[0] !== 50 || json.data[1] !== 60) return false;

  return true;
});

test('DataView 的部分区域', () => {
  const ab = new ArrayBuffer(20);
  const dv = new DataView(ab, 5, 10);
  dv.setUint8(0, 77);
  dv.setUint8(1, 88);

  const buf = Buffer.from(ab, 5, 10);
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 10) return false;
  if (json.data[0] !== 77 || json.data[1] !== 88) return false;

  return true;
});

// BigInt TypedArray 测试
test('从 BigInt64Array buffer 创建的 Buffer', () => {
  const big64 = new BigInt64Array([1n, 2n, 3n]);
  const buf = Buffer.from(big64.buffer);
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  // 每个 BigInt64 占 8 字节
  if (json.data.length !== 24) return false;

  return true;
});

test('从 BigUint64Array buffer 创建的 Buffer', () => {
  const bigU64 = new BigUint64Array([100n, 200n]);
  const buf = Buffer.from(bigU64.buffer);
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 16) return false;

  return true;
});

test('BigInt64Array 的小端序表示', () => {
  const big64 = new BigInt64Array([256n]);
  const buf = Buffer.from(big64.buffer);
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 8) return false;

  // 256n 在小端序下应该是 [0, 1, 0, 0, 0, 0, 0, 0]
  if (json.data[0] !== 0 || json.data[1] !== 1) return false;

  return true;
});

// 极端 offset/length 的 subarray
test('subarray 结束位置超出范围', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2, 100);
  const json = sub.toJSON();

  if (json.type !== 'Buffer') return false;
  // 应该自动截断到实际长度
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 3 || json.data[2] !== 5) return false;

  return true;
});

test('subarray 起始位置为负数超出范围', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sub = buf.subarray(-100, 2);
  const json = sub.toJSON();

  if (json.type !== 'Buffer') return false;
  // 应该从索引 0 开始
  if (json.data.length !== 2) return false;
  if (json.data[0] !== 1 || json.data[1] !== 2) return false;

  return true;
});

test('subarray 起始大于结束', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(3, 1);
  const json = sub.toJSON();

  if (json.type !== 'Buffer') return false;
  // 应该返回空 Buffer
  if (json.data.length !== 0) return false;

  return true;
});

test('subarray 负数范围完全超出', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sub = buf.subarray(-10, -9);
  const json = sub.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

test('subarray 只有一个参数(起始)', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sub = buf.subarray(2);
  const json = sub.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 30 || json.data[2] !== 50) return false;

  return true;
});

test('subarray 无参数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sub = buf.subarray();
  const json = sub.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 1 || json.data[2] !== 3) return false;

  return true;
});

// 空字符串各种编码
test('空字符串 utf8 编码', () => {
  const buf = Buffer.from('', 'utf8');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

test('空字符串 hex 编码', () => {
  const buf = Buffer.from('', 'hex');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

test('空字符串 base64 编码', () => {
  const buf = Buffer.from('', 'base64');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

test('空字符串 latin1 编码', () => {
  const buf = Buffer.from('', 'latin1');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

test('空字符串 ascii 编码', () => {
  const buf = Buffer.from('', 'ascii');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

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
  console.log('\n' + JSON.stringify(result, null, 2));
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
