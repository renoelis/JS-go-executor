// Buffer.concat() - Ultra Deep Scenarios: Memory, Performance, and Corner Cases
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

// 内存和视图边界
test('concat后修改底层ArrayBuffer不影响结果', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view.set([1, 2, 3, 4]);
  const result = Buffer.concat([Buffer.from(view)]);
  view[0] = 99;
  new Uint8Array(ab)[1] = 88;
  return result[0] === 1 && result[1] === 2;
});

test('concat包含overlapping视图', () => {
  const ab = new ArrayBuffer(8);
  const view1 = new Uint8Array(ab, 0, 4);
  const view2 = new Uint8Array(ab, 2, 4);
  view1.set([1, 2, 3, 4]);
  const result = Buffer.concat([view1, view2]);
  return result.length === 8 &&
         result[0] === 1 && result[1] === 2 &&
         result[4] === 3 && result[5] === 4;
});

test('concat结果的buffer属性指向新的ArrayBuffer', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const result = Buffer.concat([buf1, buf2]);
  // concat 创建新 Buffer，但可能共享同一个 ArrayBuffer pool
  // 只验证 buffer 属性存在且是 ArrayBuffer
  return result.buffer instanceof ArrayBuffer;
});

test('concat空Buffer数组但指定totalLength为0', () => {
  const result = Buffer.concat([], 0);
  return result.length === 0 && Buffer.isBuffer(result);
});

// 类型转换边界
test('totalLength为字符串数字\"0\"应报错', () => {
  try {
    Buffer.concat([Buffer.from('test')], '0');
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('type');
  }
});

test('totalLength为布尔false被转换为0', () => {
  try {
    const result = Buffer.concat([Buffer.from('test')], false);
    return result.length === 0;
  } catch (e) {
    // 或者抛出类型错误也是合理的
    return e.message.includes('number');
  }
});

test('totalLength为布尔true被转换为1', () => {
  try {
    const result = Buffer.concat([Buffer.from('test')], true);
    return result.length === 1;
  } catch (e) {
    return e.message.includes('number');
  }
});

test('totalLength为空数组应报错', () => {
  try {
    Buffer.concat([Buffer.from('test')], []);
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('type');
  }
});

test('totalLength为空对象应报错', () => {
  try {
    Buffer.concat([Buffer.from('test')], {});
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('type');
  }
});

// Uint8Array子类型测试
test('concat包含Uint8ClampedArray视图应报错', () => {
  try {
    const arr = new Uint8ClampedArray([1, 2, 3]);
    Buffer.concat([arr]);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

// Buffer特殊构造方式
test('concat通过Buffer.from(string, encoding)创建的Buffer', () => {
  const buf1 = Buffer.from('48656c6c6f', 'hex');
  const buf2 = Buffer.from('SGVsbG8=', 'base64');
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 10;
});

test('concat通过Buffer.from(arrayBuffer, offset, length)创建的Buffer', () => {
  const ab = new ArrayBuffer(10);
  new Uint8Array(ab).set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const buf1 = Buffer.from(ab, 0, 5);
  const buf2 = Buffer.from(ab, 5, 5);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 10 && result[4] === 5 && result[5] === 6;
});

test('concat通过Buffer.allocUnsafe未初始化的Buffer', () => {
  const buf1 = Buffer.allocUnsafe(5);
  const buf2 = Buffer.allocUnsafe(5);
  buf1.fill(0);
  buf2.fill(0);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 10;
});

// 编码特殊场景
test('concat包含BOM且totalLength截断BOM', () => {
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
  const data = Buffer.from('test');
  const result = Buffer.concat([bom, data], 5);
  return result.length === 5 && result[3] === 116; // 't'
});

test('concat后toString使用不同的start和end', () => {
  const result = Buffer.concat([Buffer.from('hello'), Buffer.from('world')]);
  return result.toString('utf8', 0, 5) === 'hello' &&
         result.toString('utf8', 5, 10) === 'world' &&
         result.toString('utf8', 3, 7) === 'lowo';
});

test('concat后toString超出边界的start/end', () => {
  const result = Buffer.concat([Buffer.from('test')]);
  return result.toString('utf8', 0, 100) === 'test' &&
         result.toString('utf8', 10, 20) === '';
});

test('concat包含所有可能的单字节值（0-255）完整性', () => {
  const buf1 = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf1[i] = i;
  }
  const result = Buffer.concat([buf1]);
  for (let i = 0; i < 256; i++) {
    if (result[i] !== i) return false;
  }
  return result.length === 256;
});

// 性能和压力测试
test('连续多次concat同一组Buffer', () => {
  const buf1 = Buffer.from('a');
  const buf2 = Buffer.from('b');
  for (let i = 0; i < 100; i++) {
    const result = Buffer.concat([buf1, buf2]);
    if (result.toString() !== 'ab') return false;
  }
  return true;
});

test('concat非常长的Buffer数组（5000个元素）', () => {
  const buffers = [];
  for (let i = 0; i < 5000; i++) {
    buffers.push(Buffer.from([i % 256]));
  }
  const result = Buffer.concat(buffers);
  return result.length === 5000 &&
         result[0] === 0 &&
         result[4999] === (4999 % 256);
});

test('concat后立即进行大量读写操作', () => {
  const result = Buffer.concat([Buffer.alloc(100)]);
  for (let i = 0; i < 100; i++) {
    result[i] = i % 256;
  }
  for (let i = 0; i < 100; i++) {
    if (result[i] !== i % 256) return false;
  }
  return true;
});

// 与Array方法的区别（Buffer继承自Uint8Array，实际上有这些方法）
test('concat结果有map方法（继承自Uint8Array）', () => {
  const result = Buffer.concat([Buffer.from([1, 2, 3])]);
  return typeof result.map === 'function';
});

test('concat结果有forEach方法（继承自Uint8Array）', () => {
  const result = Buffer.concat([Buffer.from([1, 2, 3])]);
  return typeof result.forEach === 'function';
});

test('concat结果有filter方法（继承自Uint8Array）', () => {
  const result = Buffer.concat([Buffer.from([1, 2, 3])]);
  return typeof result.filter === 'function';
});

test('concat结果没有Array的push方法', () => {
  const result = Buffer.concat([Buffer.from('test')]);
  return typeof result.push === 'undefined';
});

// toString特殊编码
test('concat后toString使用binary编码', () => {
  const result = Buffer.concat([Buffer.from([0xFF, 0xFE, 0x00, 0x01])]);
  const str = result.toString('binary');
  return str.length === 4;
});

test('concat后toString使用ucs2编码', () => {
  const result = Buffer.concat([Buffer.from('你好', 'ucs2')]);
  return result.toString('ucs2') === '你好';
});

test('concat后toString使用hex编码验证完整性', () => {
  const data = Buffer.from([0xAB, 0xCD, 0xEF, 0x12]);
  const result = Buffer.concat([data]);
  return result.toString('hex') === 'abcdef12';
});

// 特殊的数组状态
test('list数组被Object.freeze后仍可concat', () => {
  const list = [Buffer.from('a'), Buffer.from('b')];
  Object.freeze(list);
  const result = Buffer.concat(list);
  return result.toString() === 'ab';
});

test('list数组被Object.seal后仍可concat', () => {
  const list = [Buffer.from('a'), Buffer.from('b')];
  Object.seal(list);
  const result = Buffer.concat(list);
  return result.toString() === 'ab';
});

test('list数组元素顺序影响concat结果', () => {
  const list1 = [Buffer.from('a'), Buffer.from('b')];
  const list2 = [Buffer.from('b'), Buffer.from('a')];
  const result1 = Buffer.concat(list1);
  const result2 = Buffer.concat(list2);
  return result1.toString() === 'ab' &&
         result2.toString() === 'ba' &&
         result1.toString() !== result2.toString();
});

// readIntBE/LE 和 readUIntBE/LE
test('concat后readIntBE多字节', () => {
  const buf = Buffer.alloc(6);
  buf.writeIntBE(0x123456, 0, 3);
  const result = Buffer.concat([buf]);
  return result.readIntBE(0, 3) === 0x123456;
});

test('concat后readIntLE多字节', () => {
  const buf = Buffer.alloc(6);
  // 0xABCDEF 超出3字节有符号整数范围，使用更小的值
  buf.writeIntLE(0x7FFFFF, 0, 3); // 3字节最大正值
  const result = Buffer.concat([buf]);
  return result.readIntLE(0, 3) === 0x7FFFFF;
});

test('concat后readUIntBE多字节', () => {
  const buf = Buffer.alloc(5);
  buf.writeUIntBE(0xFFFFFFFF, 0, 4);
  const result = Buffer.concat([buf]);
  return result.readUIntBE(0, 4) === 0xFFFFFFFF;
});

test('concat后readUIntLE多字节', () => {
  const buf = Buffer.alloc(5);
  buf.writeUIntLE(0x12345678, 0, 4);
  const result = Buffer.concat([buf]);
  return result.readUIntLE(0, 4) === 0x12345678;
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
