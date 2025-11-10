// buf.toJSON() - TypedArray and View Tests
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

// TypedArray 相关测试
test('从 Uint8Array 创建的 Buffer', () => {
  const uint8 = new Uint8Array([10, 20, 30]);
  const buf = Buffer.from(uint8);
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 10 || json.data[1] !== 20 || json.data[2] !== 30) return false;
  return true;
});

test('从 Uint16Array 创建的 Buffer', () => {
  const uint16 = new Uint16Array([256, 512]);
  const buf = Buffer.from(uint16.buffer);
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  // Uint16Array [256, 512] 在小端序下应该是 [0, 1, 0, 2]
  if (json.data.length !== 4) return false;
  return true;
});

test('从 ArrayBuffer 创建的 Buffer', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  view[3] = 4;
  const buf = Buffer.from(ab);
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 4) return false;
  if (json.data[0] !== 1 || json.data[1] !== 2 || json.data[2] !== 3 || json.data[3] !== 4) return false;
  return true;
});

test('Buffer 视图的 toJSON', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const view = buf.subarray(1, 4);
  const json = view.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 2 || json.data[1] !== 3 || json.data[2] !== 4) return false;
  return true;
});

test('slice 创建的 Buffer 视图', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sliced = buf.slice(2, 4);
  const json = sliced.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 2) return false;
  if (json.data[0] !== 30 || json.data[1] !== 40) return false;
  return true;
});

test('修改原 Buffer 后视图的 toJSON', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const view = buf.subarray(1, 4);

  // 修改原 Buffer
  buf[2] = 99;

  const json = view.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  // 视图应该反映修改后的值
  if (json.data[0] !== 2 || json.data[1] !== 99 || json.data[2] !== 4) return false;
  return true;
});

test('空视图的 toJSON', () => {
  const buf = Buffer.from([1, 2, 3]);
  const emptyView = buf.subarray(1, 1);
  const json = emptyView.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;
  return true;
});

test('从 Int8Array 创建的 Buffer', () => {
  const int8 = new Int8Array([-1, 0, 127, -128]);
  const buf = Buffer.from(int8.buffer);
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 4) return false;
  // Int8Array 的字节表示
  if (json.data[0] !== 255) return false; // -1 -> 255
  if (json.data[1] !== 0) return false;   // 0 -> 0
  if (json.data[2] !== 127) return false; // 127 -> 127
  if (json.data[3] !== 128) return false; // -128 -> 128
  return true;
});

test('从 Float32Array 创建的 Buffer', () => {
  const float32 = new Float32Array([1.0, 2.5]);
  const buf = Buffer.from(float32.buffer);
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  // Float32Array 占用 8 字节 (2 * 4)
  if (json.data.length !== 8) return false;
  return true;
});

test('Buffer 是 Uint8Array 的实例', () => {
  const buf = Buffer.from([1, 2, 3]);
  // Buffer 继承自 Uint8Array,但 toJSON 应该使用 Buffer 的实现
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
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
