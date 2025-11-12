// Buffer.concat() - TypedArray and Different Input Types
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

// Uint8Array 测试
test('连接Uint8Array', () => {
  const arr1 = new Uint8Array([1, 2, 3]);
  const arr2 = new Uint8Array([4, 5, 6]);
  const result = Buffer.concat([arr1, arr2]);
  return result.length === 6 &&
         result[0] === 1 && result[5] === 6;
});

test('连接Buffer和Uint8Array混合', () => {
  const buf = Buffer.from([1, 2]);
  const arr = new Uint8Array([3, 4]);
  const result = Buffer.concat([buf, arr]);
  return result.length === 4 &&
         result[0] === 1 && result[3] === 4;
});

test('连接Uint8Array和Buffer混合（顺序相反）', () => {
  const arr = new Uint8Array([1, 2]);
  const buf = Buffer.from([3, 4]);
  const result = Buffer.concat([arr, buf]);
  return result.length === 4 &&
         result[0] === 1 && result[3] === 4;
});

// 其他 TypedArray 类型（应该拒绝）
test('连接Uint16Array应抛出错误', () => {
  const arr = new Uint16Array([256, 512]);
  try {
    Buffer.concat([arr]);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('连接Int8Array应抛出错误', () => {
  const arr = new Int8Array([-1, 0, 1]);
  try {
    Buffer.concat([arr]);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('连接Uint32Array应抛出错误', () => {
  const arr = new Uint32Array([1, 2]);
  try {
    Buffer.concat([arr]);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('连接Float32Array应抛出错误', () => {
  const arr = new Float32Array([1.5, 2.5]);
  try {
    Buffer.concat([arr]);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('连接Float64Array应抛出错误', () => {
  const arr = new Float64Array([1.5]);
  try {
    Buffer.concat([arr]);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('连接混合TypedArray（非Uint8Array）应抛出错误', () => {
  const arr1 = new Uint8Array([1, 2]);
  const arr2 = new Uint16Array([3]);
  const arr3 = new Uint8Array([4, 5]);
  try {
    Buffer.concat([arr1, arr2, arr3]);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

// ArrayBuffer 视图
test('连接基于同一ArrayBuffer的不同视图', () => {
  const ab = new ArrayBuffer(8);
  const view1 = new Uint8Array(ab, 0, 4);
  const view2 = new Uint8Array(ab, 4, 4);
  view1[0] = 1;
  view2[0] = 2;
  const result = Buffer.concat([view1, view2]);
  return result.length === 8 && result[0] === 1 && result[4] === 2;
});

test('连接DataView应抛出错误', () => {
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  dv.setUint8(0, 100);
  dv.setUint8(1, 200);
  try {
    Buffer.concat([dv]);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('连接空的Uint8Array', () => {
  const arr = new Uint8Array(0);
  const buf = Buffer.from('test');
  const result = Buffer.concat([arr, buf]);
  return result.toString() === 'test';
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
