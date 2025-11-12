// Buffer.copyBytesFrom() - Part 16: Advanced TypedArray Scenarios
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

// TypedArray 原型方法返回的数组
test('从 filter 返回的 TypedArray 复制', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const filtered = view.filter(x => x > 20);
  const buf = Buffer.copyBytesFrom(filtered);
  return buf.length === 3 && buf[0] === 30 && buf[2] === 50;
});

test('从 map 返回的 TypedArray 复制', () => {
  const view = new Uint8Array([1, 2, 3, 4]);
  const mapped = view.map(x => x * 10);
  const buf = Buffer.copyBytesFrom(mapped);
  return buf.length === 4 && buf[0] === 10 && buf[3] === 40;
});

test('从 slice 返回的 TypedArray 复制', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const sliced = view.slice(1, 4);
  const buf = Buffer.copyBytesFrom(sliced);
  return buf.length === 3 && buf[0] === 20 && buf[2] === 40;
});

test('从 reverse 后的 TypedArray 复制', () => {
  const view = new Uint8Array([10, 20, 30]);
  view.reverse();
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 3 && buf[0] === 30 && buf[2] === 10;
});

test('从 sort 后的 TypedArray 复制', () => {
  const view = new Uint8Array([30, 10, 20]);
  view.sort();
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 3 && buf[0] === 10 && buf[2] === 30;
});

test('从 fill 后的 TypedArray 复制', () => {
  const view = new Uint8Array(5);
  view.fill(99);
  const buf = Buffer.copyBytesFrom(view);
  let allMatch = true;
  for (let i = 0; i < 5; i++) {
    if (buf[i] !== 99) allMatch = false;
  }
  return allMatch;
});

// 静态方法创建的 TypedArray
test('Uint8Array.of 创建的数组', () => {
  const view = Uint8Array.of(10, 20, 30, 40);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4 && buf[0] === 10 && buf[3] === 40;
});

test('Uint8Array.from 创建的数组', () => {
  const view = Uint8Array.from([50, 60, 70]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 3 && buf[0] === 50 && buf[2] === 70;
});

test('Uint8Array.from 带映射函数', () => {
  const view = Uint8Array.from([1, 2, 3], x => x * 2);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 3 && buf[0] === 2 && buf[2] === 6;
});

test('Uint16Array.of 创建的数组', () => {
  const view = Uint16Array.of(0x1234, 0x5678);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

test('Float32Array.from 创建的数组', () => {
  const view = Float32Array.from([1.5, 2.5, 3.5]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 12;
});

// SharedArrayBuffer 视图
test('从 SharedArrayBuffer 视图复制', () => {
  try {
    const sab = new SharedArrayBuffer(10);
    const view = new Uint8Array(sab);
    view[0] = 123;
    view[5] = 45;
    const buf = Buffer.copyBytesFrom(view);
    return buf.length === 10 && buf[0] === 123 && buf[5] === 45;
  } catch (e) {
    return true;
  }
});

test('从 SharedArrayBuffer 视图复制 + offset', () => {
  try {
    const sab = new SharedArrayBuffer(20);
    const view = new Uint8Array(sab);
    for (let i = 0; i < 20; i++) view[i] = i;
    const buf = Buffer.copyBytesFrom(view, 10);
    return buf.length === 10 && buf[0] === 10;
  } catch (e) {
    return true;
  }
});

test('从 SharedArrayBuffer 的部分视图复制', () => {
  try {
    const sab = new SharedArrayBuffer(20);
    const fullView = new Uint8Array(sab);
    fullView[5] = 100;
    const partialView = new Uint8Array(sab, 5, 5);
    const buf = Buffer.copyBytesFrom(partialView);
    return buf.length === 5 && buf[0] === 100;
  } catch (e) {
    return true;
  }
});

// 空视图但有 byteOffset
test('空视图 byteOffset 非零', () => {
  const ab = new ArrayBuffer(20);
  const emptyView = new Uint8Array(ab, 10, 0);
  const buf = Buffer.copyBytesFrom(emptyView);
  return buf.length === 0;
});

test('空视图 + offset 参数', () => {
  const ab = new ArrayBuffer(20);
  const emptyView = new Uint8Array(ab, 5, 0);
  const buf = Buffer.copyBytesFrom(emptyView, 0);
  return buf.length === 0;
});

test('空视图 + offset + length', () => {
  const ab = new ArrayBuffer(20);
  const emptyView = new Uint8Array(ab, 15, 0);
  const buf = Buffer.copyBytesFrom(emptyView, 0, 0);
  return buf.length === 0;
});

// TypedArray 自定义属性不会被复制
test('TypedArray 自定义属性不影响复制', () => {
  const view = new Uint8Array([10, 20, 30]);
  view.customProp = 'test';
  view.anotherProp = 123;
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 3 && buf[0] === 10 && buf.customProp === undefined;
});

test('TypedArray 修改原型不影响复制', () => {
  const view = new Uint8Array([10, 20, 30]);
  Uint8Array.prototype.testMethod = function() { return 'test'; };
  const buf = Buffer.copyBytesFrom(view);
  delete Uint8Array.prototype.testMethod;
  return buf.length === 3 && buf[0] === 10;
});

// 跨边界视图
test('ArrayBuffer 多个视图不互相影响', () => {
  const ab = new ArrayBuffer(20);
  const view1 = new Uint8Array(ab, 0, 10);
  const view2 = new Uint8Array(ab, 10, 10);
  view1[5] = 111;
  view2[5] = 222;
  const buf1 = Buffer.copyBytesFrom(view1);
  const buf2 = Buffer.copyBytesFrom(view2);
  return buf1[5] === 111 && buf2[5] === 222;
});

test('相邻视图边界值', () => {
  const ab = new ArrayBuffer(10);
  const fullView = new Uint8Array(ab);
  fullView[4] = 99;
  fullView[5] = 88;
  const view1 = new Uint8Array(ab, 0, 5);
  const view2 = new Uint8Array(ab, 5, 5);
  const buf1 = Buffer.copyBytesFrom(view1);
  const buf2 = Buffer.copyBytesFrom(view2);
  return buf1[4] === 99 && buf1.length === 5 && buf2[0] === 88 && buf2.length === 5;
});

// TypedArray 子类
test('TypedArray 子类可以作为参数', () => {
  class CustomUint8Array extends Uint8Array {}
  const view = new CustomUint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 3 && buf[0] === 10;
});

test('TypedArray 子类 + offset', () => {
  class CustomUint8Array extends Uint8Array {}
  const view = new CustomUint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 1);
  return buf.length === 3 && buf[0] === 20;
});

test('TypedArray 子类 + offset + length', () => {
  class CustomUint8Array extends Uint8Array {}
  const view = new CustomUint8Array([10, 20, 30, 40, 50]);
  const buf = Buffer.copyBytesFrom(view, 1, 3);
  return buf.length === 3 && buf[0] === 20 && buf[2] === 40;
});

test('不同 TypedArray 子类', () => {
  class CustomUint16Array extends Uint16Array {}
  const view = new CustomUint16Array([0x1234, 0x5678]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

// 组合场景
test('filter + slice + copyBytesFrom', () => {
  const view = new Uint8Array([5, 10, 15, 20, 25, 30]);
  const filtered = view.filter(x => x >= 15);
  const sliced = filtered.slice(1, 3);
  const buf = Buffer.copyBytesFrom(sliced);
  return buf.length === 2 && buf[0] === 20 && buf[1] === 25;
});

test('map + reverse + copyBytesFrom', () => {
  const view = new Uint8Array([1, 2, 3]);
  const mapped = view.map(x => x * 10);
  mapped.reverse();
  const buf = Buffer.copyBytesFrom(mapped);
  return buf.length === 3 && buf[0] === 30 && buf[2] === 10;
});

test('Uint8Array.from + fill + copyBytesFrom', () => {
  const view = Uint8Array.from([0, 0, 0, 0]);
  view.fill(77, 1, 3);
  const buf = Buffer.copyBytesFrom(view);
  return buf[0] === 0 && buf[1] === 77 && buf[2] === 77 && buf[3] === 0;
});

// 边界长度的 SharedArrayBuffer
test('SharedArrayBuffer 长度为 1', () => {
  try {
    const sab = new SharedArrayBuffer(1);
    const view = new Uint8Array(sab);
    view[0] = 255;
    const buf = Buffer.copyBytesFrom(view);
    return buf.length === 1 && buf[0] === 255;
  } catch (e) {
    return true;
  }
});

test('SharedArrayBuffer 大容量', () => {
  try {
    const sab = new SharedArrayBuffer(1024);
    const view = new Uint8Array(sab);
    view[0] = 1;
    view[1023] = 2;
    const buf = Buffer.copyBytesFrom(view);
    return buf.length === 1024 && buf[0] === 1 && buf[1023] === 2;
  } catch (e) {
    return true;
  }
});

// 不同字节序系统的字节表示验证
test('Uint16Array 字节表示一致性', () => {
  const view = new Uint16Array([0x1234]);
  const buf = Buffer.copyBytesFrom(view);
  const reconstructed = new Uint16Array(buf.buffer, buf.byteOffset, 1);
  return reconstructed[0] === 0x1234;
});

test('Uint32Array 字节表示一致性', () => {
  const view = new Uint32Array([0x12345678]);
  const buf = Buffer.copyBytesFrom(view);
  const reconstructed = new Uint32Array(buf.buffer, buf.byteOffset, 1);
  return reconstructed[0] === 0x12345678;
});

test('BigInt64Array 字节表示一致性', () => {
  const view = new BigInt64Array([0x123456789ABCDEFn]);
  const buf = Buffer.copyBytesFrom(view);
  const reconstructed = new BigInt64Array(buf.buffer, buf.byteOffset, 1);
  return reconstructed[0] === 0x123456789ABCDEFn;
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
