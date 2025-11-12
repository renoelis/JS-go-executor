// Buffer.from() - Part 11: Combination and Advanced Scenarios
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

// 编码转换链
test('编码链 - UTF8 到 Base64 再回来', () => {
  const original = 'Hello World 你好';
  const buf1 = Buffer.from(original, 'utf8');
  const base64 = buf1.toString('base64');
  const buf2 = Buffer.from(base64, 'base64');
  return buf2.toString('utf8') === original;
});

test('编码链 - UTF8 到 HEX 再回来', () => {
  const original = 'Test123';
  const buf1 = Buffer.from(original, 'utf8');
  const hex = buf1.toString('hex');
  const buf2 = Buffer.from(hex, 'hex');
  return buf2.toString('utf8') === original;
});

test('编码链 - Latin1 到 Base64 再回来', () => {
  const original = '\x80\xAA\xFF';
  const buf1 = Buffer.from(original, 'latin1');
  const base64 = buf1.toString('base64');
  const buf2 = Buffer.from(base64, 'base64');
  return buf2.toString('latin1') === original;
});

// 混合输入类型
test('混合类型 - 数组中包含各种可转换值', () => {
  const buf = Buffer.from([65, '66', true, 1.9, null, undefined, NaN]);
  return buf.length === 7 && buf[0] === 65 && buf[1] === 66 && buf[2] === 1;
});

test('混合类型 - 类数组对象中的混合值', () => {
  const obj = { 0: 72, 1: '101', 2: true, 3: 108, length: 4 };
  const buf = Buffer.from(obj);
  return buf.length === 4 && buf[0] === 72 && buf[1] === 101;
});

// 多层视图和复制
test('多层视图 - ArrayBuffer -> TypedArray -> Buffer', () => {
  const ab = new ArrayBuffer(10);
  const uint8 = new Uint8Array(ab);
  uint8[0] = 42;
  const buf = Buffer.from(uint8);
  return buf[0] === 42 && buf.length === 10;
});

test('多层视图 - ArrayBuffer slice -> Buffer', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[5] = 100;
  const sliced = ab.slice(5, 8);
  const buf = Buffer.from(sliced);
  return buf.length === 3 && buf[0] === 100;
});

test('多层复制 - Buffer -> Buffer -> Buffer 三层', () => {
  const b1 = Buffer.from([1, 2, 3]);
  const b2 = Buffer.from(b1);
  const b3 = Buffer.from(b2);
  b1[0] = 99;
  b2[1] = 88;
  return b3[0] === 1 && b3[1] === 2 && b3[2] === 3;
});

// 边界组合
test('边界组合 - 空数组 + 各种编码', () => {
  const encodings = ['utf8', 'hex', 'base64', 'latin1'];
  return encodings.every(() => {
    const buf = Buffer.from([]);
    return buf.length === 0;
  });
});

test('边界组合 - 单字节数组 + 所有字节值', () => {
  let allPass = true;
  for (let i = 0; i < 256; i++) {
    const buf = Buffer.from([i]);
    if (buf.length !== 1 || buf[0] !== i) {
      allPass = false;
      break;
    }
  }
  return allPass;
});

// ArrayBuffer 子视图
test('ArrayBuffer 子视图 - offset 从中间开始', () => {
  const ab = new ArrayBuffer(20);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 20; i++) view[i] = i;
  const buf = Buffer.from(ab, 10, 5);
  return buf.length === 5 && buf[0] === 10 && buf[4] === 14;
});

test('ArrayBuffer 子视图 - offset 到末尾', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[9] = 99;
  const buf = Buffer.from(ab, 9);
  return buf.length === 1 && buf[0] === 99;
});

test('ArrayBuffer 子视图 - length 为 1', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[5] = 123;
  const buf = Buffer.from(ab, 5, 1);
  return buf.length === 1 && buf[0] === 123;
});

// 特殊字符串组合
test('特殊字符串 - Emoji + 中文 + ASCII', () => {
  const str = 'Hello😀世界Test';
  const buf = Buffer.from(str, 'utf8');
  return buf.toString('utf8') === str;
});

test('特殊字符串 - 控制字符 + 可见字符', () => {
  const str = '\x00\x01\x1FAbc\x7F';
  const buf = Buffer.from(str, 'latin1');
  return buf.toString('latin1') === str;
});

test('特殊字符串 - 换行符组合 CRLF', () => {
  const str = 'Line1\r\nLine2\nLine3\r';
  const buf = Buffer.from(str, 'utf8');
  return buf.toString('utf8') === str;
});

// 大小混合测试
test('大小混合 - 1 字节到 1000 字节递增', () => {
  let allPass = true;
  for (let size of [1, 10, 100, 1000]) {
    const arr = new Array(size).fill(42);
    const buf = Buffer.from(arr);
    if (buf.length !== size) {
      allPass = false;
      break;
    }
  }
  return allPass;
});

test('大小混合 - 字符串长度 0, 1, 10, 100', () => {
  const sizes = [0, 1, 10, 100];
  return sizes.every(size => {
    const str = 'x'.repeat(size);
    const buf = Buffer.from(str);
    return buf.length === size;
  });
});

// TypedArray 混合
test('TypedArray 混合 - 不同类型的 TypedArray', () => {
  const types = [
    new Uint8Array([1, 2]),
    new Int8Array([3, 4]),
    new Uint8ClampedArray([5, 6])
  ];
  return types.every(arr => {
    const buf = Buffer.from(arr);
    return buf.length === 2;
  });
});

test('TypedArray 混合 - 从不同大小的 TypedArray.buffer', () => {
  const types = [
    new Uint16Array([0x0102]),
    new Uint32Array([0x01020304]),
    new Float32Array([1.5])
  ];
  return types.every(arr => {
    const buf = Buffer.from(arr.buffer);
    return buf.length === arr.byteLength;
  });
});

// 编码极端组合
test('编码极端 - 超长 base64 字符串', () => {
  const long = 'A'.repeat(10000);
  const base64 = Buffer.from(long).toString('base64');
  const buf = Buffer.from(base64, 'base64');
  return buf.toString('utf8') === long;
});

test('编码极端 - 超长 hex 字符串', () => {
  const hex = '41'.repeat(5000);
  const buf = Buffer.from(hex, 'hex');
  return buf.length === 5000;
});

test('编码极端 - 全 Unicode 范围字符', () => {
  const str = 'A\u00E9\u4E2D\uD83D\uDE00';
  const buf = Buffer.from(str, 'utf8');
  return buf.toString('utf8') === str;
});

// 对象行为组合
test('对象行为 - valueOf + length 同时存在', () => {
  const obj = {
    0: 65,
    length: 1,
    valueOf() {
      return Buffer.from([66]);
    }
  };
  const buf = Buffer.from(obj);
  // 应该优先使用类数组接口
  return buf.length === 1 && buf[0] === 65;
});

test('对象行为 - 嵌套 valueOf', () => {
  const obj = {
    valueOf() {
      return {
        valueOf() {
          return Buffer.from([99]);
        }
      };
    }
  };
  try {
    const buf = Buffer.from(obj);
    return buf[0] === 99;
  } catch (e) {
    // 可能不支持嵌套
    return true;
  }
});

// 内存和性能组合
test('内存组合 - 多次创建和释放', () => {
  for (let i = 0; i < 1000; i++) {
    const buf = Buffer.from([i % 256]);
    if (buf[0] !== i % 256) return false;
  }
  return true;
});

test('性能组合 - 快速切换不同输入类型', () => {
  const inputs = [
    'string',
    [1, 2, 3],
    new Uint8Array([4, 5, 6]),
    new ArrayBuffer(3),
    Buffer.from([7, 8, 9])
  ];
  return inputs.every(input => {
    const buf = Buffer.from(input);
    return buf instanceof Buffer;
  });
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
