// buf.equals() - Additional Edge Cases and Type Validation
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

// 更多类型错误测试
test('TypeError - Function 参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(function() {});
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer');
  }
});

test('TypeError - RegExp 参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(/test/);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer');
  }
});

test('TypeError - Date 参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(new Date());
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer');
  }
});

test('TypeError - Map 参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(new Map());
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer');
  }
});

test('TypeError - Set 参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(new Set());
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer');
  }
});

test('TypeError - WeakMap 参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(new WeakMap());
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer');
  }
});

test('TypeError - WeakSet 参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(new WeakSet());
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer');
  }
});

test('TypeError - Promise 参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(Promise.resolve());
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer');
  }
});

// TypedArray 类型错误消息测试
test('错误消息 - Uint16Array', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const arr = new Uint16Array([1, 2, 3]);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer') &&
           e.message.includes('Uint16Array');
  }
});

test('错误消息 - Int16Array', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const arr = new Int16Array([1, 2, 3]);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer') &&
           e.message.includes('Int16Array');
  }
});

test('错误消息 - Uint32Array', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const arr = new Uint32Array([1, 2, 3]);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer') &&
           e.message.includes('Uint32Array');
  }
});

test('错误消息 - Int32Array', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const arr = new Int32Array([1, 2, 3]);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer') &&
           e.message.includes('Int32Array');
  }
});

test('错误消息 - Float32Array', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const arr = new Float32Array([1, 2, 3]);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer') &&
           e.message.includes('Float32Array');
  }
});

test('错误消息 - Float64Array', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const arr = new Float64Array([1, 2, 3]);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer') &&
           e.message.includes('Float64Array');
  }
});

test('错误消息 - Uint8ClampedArray', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const arr = new Uint8ClampedArray([1, 2, 3]);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer') &&
           e.message.includes('Uint8ClampedArray');
  }
});

test('错误消息 - BigInt64Array', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const arr = new BigInt64Array([1n, 2n, 3n]);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer') &&
           e.message.includes('BigInt64Array');
  }
});

test('错误消息 - BigUint64Array', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const arr = new BigUint64Array([1n, 2n, 3n]);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer') &&
           e.message.includes('BigUint64Array');
  }
});

test('错误消息 - DataView', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const ab = new ArrayBuffer(3);
    const view = new DataView(ab);
    view.setUint8(0, 1);
    view.setUint8(1, 2);
    view.setUint8(2, 3);
    buf.equals(view);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer') &&
           e.message.includes('DataView');
  }
});

// 链式调用和多次调用
test('链式比较 - A.equals(B) && B.equals(C) && A.equals(C)', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const buf3 = Buffer.from([1, 2, 3]);
  return buf1.equals(buf2) && buf2.equals(buf3) && buf1.equals(buf3);
});

test('链式比较 - 不同内容', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const buf3 = Buffer.from([7, 8, 9]);
  return buf1.equals(buf2) === false && 
         buf2.equals(buf3) === false && 
         buf1.equals(buf3) === false;
});

test('多次调用同一比较 - 一致性', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(buf1.equals(buf2));
  }
  return results.every(r => r === true);
});

test('多次调用不同比较 - 一致性', () => {
  const buf1 = Buffer.from('test1');
  const buf2 = Buffer.from('test2');
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(buf1.equals(buf2));
  }
  return results.every(r => r === false);
});

// 修改后比较的一致性
test('修改 Buffer 后比较 - 立即生效', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result1 = buf1.equals(buf2);
  buf1[0] = 99;
  const result2 = buf1.equals(buf2);
  return result1 === true && result2 === false;
});

test('修改 Uint8Array 后比较 - 立即生效', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  const result1 = buf.equals(arr);
  arr[0] = 99;
  const result2 = buf.equals(arr);
  return result1 === true && result2 === false;
});

// 空值和特殊值
test('空字符串 Buffer', () => {
  const buf1 = Buffer.from('');
  const buf2 = Buffer.from('');
  return buf1.equals(buf2) === true;
});

test('空字符串 Buffer vs 空数组 Buffer', () => {
  const buf1 = Buffer.from('');
  const buf2 = Buffer.from([]);
  return buf1.equals(buf2) === true;
});

test('空字符串 Buffer vs alloc(0)', () => {
  const buf1 = Buffer.from('');
  const buf2 = Buffer.alloc(0);
  return buf1.equals(buf2) === true;
});

// 字节序相关
test('字节序 - writeUInt16LE 相同值', () => {
  const buf1 = Buffer.alloc(2);
  const buf2 = Buffer.alloc(2);
  buf1.writeUInt16LE(0x1234);
  buf2.writeUInt16LE(0x1234);
  return buf1.equals(buf2) === true;
});

test('字节序 - writeUInt16BE 相同值', () => {
  const buf1 = Buffer.alloc(2);
  const buf2 = Buffer.alloc(2);
  buf1.writeUInt16BE(0x1234);
  buf2.writeUInt16BE(0x1234);
  return buf1.equals(buf2) === true;
});

test('字节序 - writeUInt32LE 相同值', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeUInt32LE(0x12345678);
  buf2.writeUInt32LE(0x12345678);
  return buf1.equals(buf2) === true;
});

test('字节序 - writeUInt32BE 相同值', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeUInt32BE(0x12345678);
  buf2.writeUInt32BE(0x12345678);
  return buf1.equals(buf2) === true;
});

// 特殊数值
test('特殊数值 - Infinity', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeDoubleLE(Infinity);
  buf2.writeDoubleLE(Infinity);
  return buf1.equals(buf2) === true;
});

test('特殊数值 - -Infinity', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeDoubleLE(-Infinity);
  buf2.writeDoubleLE(-Infinity);
  return buf1.equals(buf2) === true;
});

test('特殊数值 - NaN', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeDoubleLE(NaN);
  buf2.writeDoubleLE(NaN);
  return buf1.equals(buf2) === true;
});

test('特殊数值 - 0.0 和 -0.0', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeDoubleLE(0.0);
  buf2.writeDoubleLE(-0.0);
  return buf1.equals(buf2) === false;
});

// 边界长度
test('边界长度 - 最大安全整数附近', () => {
  try {
    const size = Number.MAX_SAFE_INTEGER;
    if (size > 1000000) {
      const buf1 = Buffer.alloc(1000);
      const buf2 = Buffer.alloc(1000);
      return buf1.equals(buf2) === true;
    }
    return true;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
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

