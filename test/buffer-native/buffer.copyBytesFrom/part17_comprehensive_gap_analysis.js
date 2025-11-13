// Buffer.copyBytesFrom() - Part 17: 全面查缺补漏测试
// 基于其他 Buffer API 的经验，测试可能遗漏的边界情况
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

// 1. Symbol 相关测试 (基于 btoa/atob 经验)
test('Symbol 作为第一个参数应该抛出 TypeError', () => {
  try {
    Buffer.copyBytesFrom(Symbol('test'));
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Symbol.iterator 参数应该抛出错误', () => {
  try {
    Buffer.copyBytesFrom(Symbol.iterator);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('带有 Symbol 属性的对象应该抛出错误', () => {
  try {
    const obj = {};
    obj[Symbol.toStringTag] = 'ArrayBuffer';
    Buffer.copyBytesFrom(obj);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 2. 函数自身属性测试 - 修正为实际的 Node.js 行为
test('Buffer.copyBytesFrom.length 应该为 3 (最大参数个数)', () => {
  return Buffer.copyBytesFrom.length === 3;
});

test('Buffer.copyBytesFrom.name 应该为 "copyBytesFrom"', () => {
  return Buffer.copyBytesFrom.name === 'copyBytesFrom';
});

test('Buffer.copyBytesFrom 应该可枚举 (Node.js 默认行为)', () => {
  const desc = Object.getOwnPropertyDescriptor(Buffer, 'copyBytesFrom');
  return desc && desc.enumerable === true;
});

test('Buffer.copyBytesFrom 应该可写', () => {
  const desc = Object.getOwnPropertyDescriptor(Buffer, 'copyBytesFrom');
  return desc && desc.writable === true;
});

test('Buffer.copyBytesFrom 应该可配置', () => {
  const desc = Object.getOwnPropertyDescriptor(Buffer, 'copyBytesFrom');
  return desc && desc.configurable === true;
});

// 3. 特殊数值测试
test('offset 为 Number.MAX_VALUE 应该抛出 RangeError', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('length 为 Number.MAX_VALUE 应该抛出 RangeError', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, 0, Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('offset 为 -Number.MAX_VALUE 应该抛出 RangeError', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, -Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('length 为 -Number.MAX_VALUE 应该抛出 RangeError', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, 0, -Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

// 4. 错误消息精确性测试 (基于其他API经验)
test('无参数时错误消息应该提及 "view"', () => {
  try {
    Buffer.copyBytesFrom();
    return false;
  } catch (e) {
    return e.message.toLowerCase().includes('view');
  }
});

test('非 TypedArray 参数错误消息应该提及 "TypedArray"', () => {
  try {
    Buffer.copyBytesFrom('not-typedarray');
    return false;
  } catch (e) {
    return e.message.includes('TypedArray');
  }
});

test('DataView 参数错误消息应该明确提及不支持', () => {
  try {
    const ab = new ArrayBuffer(4);
    const dv = new DataView(ab);
    Buffer.copyBytesFrom(dv);
    return false;
  } catch (e) {
    return e.message.includes('TypedArray') && e.message.includes('DataView');
  }
});

// 5. 特殊 TypedArray 子类测试
test('子类化的 Uint8Array 应该正常工作', () => {
  class MyUint8Array extends Uint8Array {}
  const view = new MyUint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 3 && buf[0] === 1 && buf[2] === 3;
});

test('修改过 constructor 的 TypedArray', () => {
  const view = new Uint8Array([10, 20, 30]);
  view.constructor = null;
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 3 && buf[0] === 10;
});

test('删除了 BYTES_PER_ELEMENT 的 TypedArray', () => {
  const view = new Uint16Array([0x0102, 0x0304]);
  delete view.BYTES_PER_ELEMENT;
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4; // 应该默认使用字节大小
});

// 6. 内存安全测试
test('非常大的 TypedArray（模拟内存压力）', () => {
  // 创建一个相对较大但不会导致内存溢出的 TypedArray
  const size = 100000; // 100KB
  const view = new Uint8Array(size);
  for (let i = 0; i < Math.min(100, size); i++) {
    view[i] = i % 256;
  }
  const buf = Buffer.copyBytesFrom(view, 0, 100);
  return buf.length === 100 && buf[50] === 50;
});

test('零长度复制但有 offset', () => {
  const view = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.copyBytesFrom(view, 2, 0);
  return buf.length === 0;
});

test('offset 等于 length 的边界情况', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view, 3);
  return buf.length === 0; // 应该返回空 buffer
});

test('offset + length 刚好等于 view.length', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 1, 3);
  return buf.length === 3 && buf[0] === 20 && buf[2] === 40;
});

// 7. 字节序和数据完整性测试
test('Float32Array 复制后的字节完整性', () => {
  const view = new Float32Array([1.5]);
  const buf = Buffer.copyBytesFrom(view);
  
  // 验证长度正确
  if (buf.length !== 4) return false;
  
  // 重新构造 Float32Array 验证数据一致性
  const newAB = new ArrayBuffer(4);
  const newView = new Uint8Array(newAB);
  for (let i = 0; i < 4; i++) {
    newView[i] = buf[i];
  }
  const floatView = new Float32Array(newAB);
  return Math.abs(floatView[0] - 1.5) < 0.0001;
});

test('Float64Array 复制后的字节完整性', () => {
  const view = new Float64Array([3.14159]);
  const buf = Buffer.copyBytesFrom(view);
  
  if (buf.length !== 8) return false;
  
  const newAB = new ArrayBuffer(8);
  const newView = new Uint8Array(newAB);
  for (let i = 0; i < 8; i++) {
    newView[i] = buf[i];
  }
  const floatView = new Float64Array(newAB);
  return Math.abs(floatView[0] - 3.14159) < 0.00001;
});

// 8. 边界值的精确测试
test('Uint16Array 最大值边界', () => {
  const view = new Uint16Array([0xFFFF, 0x0000]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

test('Int32Array 负数边界', () => {
  const view = new Int32Array([-1, -2147483648, 2147483647]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 12;
});

// 9. 平台字节序测试
test('多字节类型的字节序一致性 - Uint16Array', () => {
  const view = new Uint16Array([0x1234]);
  const buf = Buffer.copyBytesFrom(view);
  
  // 重新构造验证字节序
  const newAB = new ArrayBuffer(2);
  const newU8 = new Uint8Array(newAB);
  newU8[0] = buf[0];
  newU8[1] = buf[1];
  const newU16 = new Uint16Array(newAB);
  
  return newU16[0] === 0x1234;
});

test('多字节类型的字节序一致性 - Uint32Array', () => {
  const view = new Uint32Array([0x12345678]);
  const buf = Buffer.copyBytesFrom(view);
  
  const newAB = new ArrayBuffer(4);
  const newU8 = new Uint8Array(newAB);
  for (let i = 0; i < 4; i++) {
    newU8[i] = buf[i];
  }
  const newU32 = new Uint32Array(newAB);
  
  return newU32[0] === 0x12345678;
});

// 10. 特殊参数组合测试
test('undefined offset 和 undefined length', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view, undefined, undefined);
  return buf.length === 3 && buf[0] === 1 && buf[2] === 3;
});

test('0 offset 和 undefined length', () => {
  const view = new Uint8Array([5, 6, 7, 8]);
  const buf = Buffer.copyBytesFrom(view, 0, undefined);
  return buf.length === 4 && buf[0] === 5 && buf[3] === 8;
});

test('undefined offset 和有效 length', () => {
  const view = new Uint8Array([9, 10, 11, 12]);
  const buf = Buffer.copyBytesFrom(view, undefined, 2);
  return buf.length === 2 && buf[0] === 9 && buf[1] === 10;
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
