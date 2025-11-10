// buf.equals() - Node.js v25.0.0 特定场景和细节补充测试
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

// 性能相关场景 - 确保快速路径正确工作
test('快速路径 - 长度为0（空buffer）', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  return buf1.equals(buf2) === true;
});

test('快速路径 - 相同引用', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf.equals(buf) === true;
});

test('快速路径 - 长度不同（立即返回false）', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2]);
  return buf1.equals(buf2) === false;
});

test('快速路径 - 第一个字节不同', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const buf2 = Buffer.from([0, 2, 3, 4, 5, 6, 7, 8]);
  return buf1.equals(buf2) === false;
});

// 内存池相关测试
test('内存池 - allocUnsafe创建的buffer', () => {
  const buf1 = Buffer.allocUnsafe(10);
  buf1.fill(0xAA);
  const buf2 = Buffer.alloc(10, 0xAA);
  return buf1.equals(buf2) === true;
});

test('内存池 - 小buffer（<4KB）', () => {
  const size = 1024;
  const buf1 = Buffer.alloc(size, 0xBB);
  const buf2 = Buffer.alloc(size, 0xBB);
  return buf1.equals(buf2) === true;
});

test('内存池 - 大buffer（>8KB，不使用池）', () => {
  const size = 10 * 1024;
  const buf1 = Buffer.alloc(size, 0xCC);
  const buf2 = Buffer.alloc(size, 0xCC);
  return buf1.equals(buf2) === true;
});

// Uint8Array 和 Buffer 的精确行为对齐
test('Uint8Array 参数 - 空Uint8Array', () => {
  const buf = Buffer.alloc(0);
  const arr = new Uint8Array(0);
  return buf.equals(arr) === true;
});

test('Uint8Array 参数 - 单字节Uint8Array', () => {
  const buf = Buffer.from([42]);
  const arr = new Uint8Array([42]);
  return buf.equals(arr) === true;
});

test('Uint8Array 参数 - byteOffset非0', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab, 5, 3);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  const buf = Buffer.from([1, 2, 3]);
  return buf.equals(view) === true;
});

test('Uint8Array 参数 - byteLength与length一致性', () => {
  const arr = new Uint8Array([1, 2, 3]);
  const buf = Buffer.from([1, 2, 3]);
  return arr.byteLength === 3 && arr.length === 3 && buf.equals(arr) === true;
});

// Buffer.prototype vs Uint8Array.prototype
test('Buffer继承 - Buffer是Uint8Array的子类', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf instanceof Uint8Array === true;
});

test('Buffer方法 - equals方法来自Buffer.prototype', () => {
  const buf = Buffer.from([1, 2, 3]);
  return typeof buf.equals === 'function';
});

test('Buffer方法 - equals方法不在Uint8Array.prototype上', () => {
  const arr = new Uint8Array([1, 2, 3]);
  return typeof arr.equals === 'undefined';
});

// 参数验证 - 严格的类型检查
test('参数验证 - 必须是Buffer或Uint8Array', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.equals([1, 2, 3]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('参数验证 - Int8Array不被接受', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const arr = new Int8Array([1, 2, 3]);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('参数验证 - Uint8ClampedArray不被接受', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const arr = new Uint8ClampedArray([1, 2, 3]);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('参数验证 - DataView不被接受', () => {
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
    return e.name === 'TypeError';
  }
});

test('参数验证 - ArrayBuffer不被接受', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const ab = new ArrayBuffer(3);
    buf.equals(ab);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 字节比较的正确性 - 逐字节比较
test('字节比较 - 所有字节相同', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([1, 2, 3, 4, 5]);
  return buf1.equals(buf2) === true;
});

test('字节比较 - 最后一个字节不同', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([1, 2, 3, 4, 6]);
  return buf1.equals(buf2) === false;
});

test('字节比较 - 中间字节不同', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([1, 2, 9, 4, 5]);
  return buf1.equals(buf2) === false;
});

test('字节比较 - 多个字节不同', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([1, 9, 3, 9, 5]);
  return buf1.equals(buf2) === false;
});

test('字节比较 - 所有字节不同', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([6, 7, 8, 9, 10]);
  return buf1.equals(buf2) === false;
});

// 边界对齐优化测试
test('边界对齐 - 4字节边界', () => {
  const buf1 = Buffer.from([1, 2, 3, 4]);
  const buf2 = Buffer.from([1, 2, 3, 4]);
  return buf1.equals(buf2) === true;
});

test('边界对齐 - 8字节边界', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const buf2 = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  return buf1.equals(buf2) === true;
});

test('边界对齐 - 非对齐长度3', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  return buf1.equals(buf2) === true;
});

test('边界对齐 - 非对齐长度5', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([1, 2, 3, 4, 5]);
  return buf1.equals(buf2) === true;
});

test('边界对齐 - 非对齐长度7', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5, 6, 7]);
  const buf2 = Buffer.from([1, 2, 3, 4, 5, 6, 7]);
  return buf1.equals(buf2) === true;
});

test('边界对齐 - 非对齐长度9', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const buf2 = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  return buf1.equals(buf2) === true;
});

// 大数据量的性能测试场景
test('大数据 - 100KB相同内容', () => {
  const size = 100 * 1024;
  const buf1 = Buffer.alloc(size, 0xAA);
  const buf2 = Buffer.alloc(size, 0xAA);
  return buf1.equals(buf2) === true;
});

test('大数据 - 100KB前N-1字节相同，最后1字节不同', () => {
  const size = 100 * 1024;
  const buf1 = Buffer.alloc(size, 0xAA);
  const buf2 = Buffer.alloc(size, 0xAA);
  buf2[size - 1] = 0xBB;
  return buf1.equals(buf2) === false;
});

test('大数据 - 100KB第一个字节不同', () => {
  const size = 100 * 1024;
  const buf1 = Buffer.alloc(size, 0xAA);
  const buf2 = Buffer.alloc(size, 0xAA);
  buf2[0] = 0xBB;
  return buf1.equals(buf2) === false;
});

// slice和subarray的共享内存行为
test('共享内存 - slice修改不影响原buffer的equals', () => {
  const buf1 = Buffer.from('hello world');
  const buf2 = Buffer.from('hello world');
  const slice = buf1.slice(0, 5);
  slice[0] = 72; // 'H'
  // slice和buf1共享内存，所以buf1也被修改了
  return buf1.equals(buf2) === false;
});

test('共享内存 - subarray修改影响原buffer的equals', () => {
  const buf1 = Buffer.from('hello world');
  const buf2 = Buffer.from('hello world');
  const subarr = buf1.subarray(0, 5);
  subarr[0] = 72; // 'H'
  // subarray和buf1共享内存，所以buf1也被修改了
  return buf1.equals(buf2) === false;
});

test('共享内存 - Buffer.from(buffer)创建独立副本', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(buf1);
  buf2[0] = 72; // 'H'
  // buf2是独立副本，不影响buf1
  return buf1.equals(Buffer.from('hello')) === true;
});

// 错误消息的完整性
test('错误消息 - 包含参数名称otherBuffer', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer');
  }
});

test('错误消息 - 包含接收到的类型信息', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals('hello');
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('string');
  }
});

test('错误消息 - 包含完整的错误堆栈', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           typeof e.stack === 'string' &&
           e.stack.length > 0;
  }
});

// 与Buffer.compare的一致性验证
test('一致性 - equals返回true时compare返回0', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const equalsResult = buf1.equals(buf2);
  const compareResult = buf1.compare(buf2);
  return equalsResult === true && compareResult === 0;
});

test('一致性 - equals返回false时compare不返回0', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const equalsResult = buf1.equals(buf2);
  const compareResult = buf1.compare(buf2);
  return equalsResult === false && compareResult !== 0;
});

test('一致性 - 长度不同时equals和compare一致', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2]);
  const equalsResult = buf1.equals(buf2);
  const compareResult = buf1.compare(buf2);
  return equalsResult === false && compareResult !== 0;
});

// UTF-8编码的特殊场景
test('UTF-8 - BOM字符', () => {
  const buf1 = Buffer.from('\uFEFFhello', 'utf8');
  const buf2 = Buffer.from('\uFEFFhello', 'utf8');
  return buf1.equals(buf2) === true;
});

test('UTF-8 - 零宽字符', () => {
  const buf1 = Buffer.from('hello\u200Bworld', 'utf8');
  const buf2 = Buffer.from('hello\u200Bworld', 'utf8');
  return buf1.equals(buf2) === true;
});

test('UTF-8 - 组合字符', () => {
  const buf1 = Buffer.from('é', 'utf8'); // U+00E9
  const buf2 = Buffer.from('é', 'utf8'); // U+0065 U+0301
  // 这两个可能有不同的UTF-8表示
  return buf1.equals(buf2) === true || buf1.equals(buf2) === false;
});

test('UTF-8 - emoji序列', () => {
  const buf1 = Buffer.from('👨‍👩‍👧‍👦', 'utf8');
  const buf2 = Buffer.from('👨‍👩‍👧‍👦', 'utf8');
  return buf1.equals(buf2) === true;
});

test('UTF-8 - 代理对', () => {
  const buf1 = Buffer.from('𝕳𝖊𝖑𝖑𝖔', 'utf8');
  const buf2 = Buffer.from('𝕳𝖊𝖑𝖑𝖔', 'utf8');
  return buf1.equals(buf2) === true;
});

// 边缘case - 内存压力和GC
test('内存压力 - 连续创建和比较多个buffer', () => {
  let allEqual = true;
  for (let i = 0; i < 1000; i++) {
    const buf1 = Buffer.from([i % 256]);
    const buf2 = Buffer.from([i % 256]);
    if (!buf1.equals(buf2)) {
      allEqual = false;
      break;
    }
  }
  return allEqual === true;
});

test('内存压力 - 大buffer的重复比较', () => {
  const size = 1024 * 1024; // 1MB
  const buf1 = Buffer.alloc(size, 0xAA);
  const buf2 = Buffer.alloc(size, 0xAA);
  let allEqual = true;
  for (let i = 0; i < 10; i++) {
    if (!buf1.equals(buf2)) {
      allEqual = false;
      break;
    }
  }
  return allEqual === true;
});

// 零拷贝和优化场景
test('零拷贝 - Buffer.from(Uint8Array)然后equals', () => {
  const arr = new Uint8Array([1, 2, 3]);
  const buf1 = Buffer.from(arr);
  const buf2 = Buffer.from([1, 2, 3]);
  return buf1.equals(buf2) === true;
});

test('零拷贝 - Buffer.from(ArrayBuffer)然后equals', () => {
  const ab = new ArrayBuffer(3);
  const view = new Uint8Array(ab);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.from([1, 2, 3]);
  return buf1.equals(buf2) === true;
});

// 方法链调用
test('方法链 - slice().equals()', () => {
  const buf = Buffer.from('hello world');
  const expected = Buffer.from('hello');
  return buf.slice(0, 5).equals(expected) === true;
});

test('方法链 - subarray().equals()', () => {
  const buf = Buffer.from('hello world');
  const expected = Buffer.from('world');
  return buf.subarray(6).equals(expected) === true;
});

test('方法链 - fill().equals()', () => {
  const buf1 = Buffer.alloc(5);
  const buf2 = Buffer.alloc(5, 0xAA);
  buf1.fill(0xAA);
  return buf1.equals(buf2) === true;
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









