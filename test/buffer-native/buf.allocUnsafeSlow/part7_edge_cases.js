const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    tests.push({ name, passed: result, details: result ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, error: e.message, stack: e.stack });
  }
}

test('边缘行为 - Object 上带有小整数的 toString 行为', () => {
  const obj = { toString: () => '123' };
  const buf = Buffer.allocUnsafeSlow(obj);
  return buf.length === 123;
});

test('边缘行为 - Object 上带有浮点数的 toString 行为', () => {
  const obj = { toString: () => '999.0' };
  const buf = Buffer.allocUnsafeSlow(obj);
  return buf.length === 999;
});

test('边缘行为 - toString 返回非数字的情况', () => {
  const obj = { toString: () => 'abc' };
  try {
    Buffer.allocUnsafeSlow(obj);
    return false;
  } catch (e) {
    return e.message && e.message.includes('Invalid');
  }
});

test('边缘行为 - fill 为带 toString 转换的对象', () => {
  const fillObject = { toString: () => 'X' };
  const buf = Buffer.allocUnsafeSlow(5, fillObject);
  return buf.toString() === 'XXXXX';
});

test('边缘行为 - fill 为复杂嵌套 ArrayBuffer', () => {
  const ab = new ArrayBuffer(4);
  const view = new DataView(ab);
  view.setUint8(0, 72); // 'H'
  view.setUint8(1, 101); // 'e'
  view.setUint8(2, 108); // 'l'
  view.setUint8(3, 108); // 'l'
  const buf = Buffer.allocUnsafeSlow(8, view);
  return buf.toString() === 'HellHell';
});

test('边缘行为 - fill 长度大于 size 时严格截断', () => {
  const buf = Buffer.allocUnsafeSlow(3, 'ABCDEF');
  return buf.toString() === 'ABC';
});

test('边缘行为 - 验证不同浮点值对大小的转换（Float）', () => {
  const tests = [
    { input: 3.14159, expect: 3 },
    { input: 0.999, expect: 0 },
    { input: 1.0001, expect: 1 },
    { input: 255.9, expect: 255 }
  ];

  return tests.every(({ input, expect }) => {
    try {
      const buf = Buffer.allocUnsafeSlow(input);
      return buf.length === expect;
    } catch (e) {
      return expect === undefined && e.message && e.message.includes('integer');
    }
  });
});

test('边缘行为 - 字符串数字 extra 空格情况', () => {
  const tests = [
    { input: '  100  ', expect: 100 },
    { input: '100\n', expect: 100 },
    { input: '\t100\t', expect: 100 },
    { input: '   ', expect: false }  // 全空格不可行
  ];

  let ok = true;
  tests.forEach(({ input, expect }) => {
    try {
      const buf = Buffer.allocUnsafeSlow(input);
      if (buf.length !== expect) ok = false;
    } catch (e) {
      if (expect !== false) ok = false;
    }
  });
  return ok;
});

test('边缘行为 - 继承调用链特殊处理（带 parent prototype）', () => {
  function CustomBuffer(size, fill, encoding) {
    return Buffer.allocUnsafeSlow(size, fill, encoding);
  }

  try {
    const buf = CustomBuffer(10, 'A');
    return buf.length === 10 && buf instanceof Buffer;
  } catch (e) {
    return false;
  }
});

test('边缘行为 - 填充为函数的情况（函数 toString 不返回数据本身）', () => {
  function fillFunc() { return 'X'; }
  const buf = Buffer.allocUnsafeSlow(5, fillFunc);
  return buf.toString() === String(fillFunc).repeat(5).slice(0, 5);
});

test('边缘行为 - undefined vs 未传参 aligns fully', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.allocUnsafeSlow(10, undefined);
  const buf3 = Buffer.allocUnsafeSlow(10, undefined, undefined);

  return buf1.length === buf2.length && buf2.length === buf3.length;
});

test('边缘行为 - 非常大的 Buffer 逐步测试数值稳定性', () => {
  const targetSizes = [1, 1023, 1024, 2047, 2048, 4095, 4096, 8191, 8192];
  let ok = true;
  targetSizes.forEach(size => {
    try {
      const buf = Buffer.allocUnsafeSlow(size);
      buf.fill(Math.floor(Math.random() * 256));
      if (buf.length !== size || !Buffer.isBuffer(buf)) ok = false;
    } catch (e) {
      ok = false;
    }
  });
  return ok;
});

test('边缘行为 - fill 重复使用同一缓读器的循环性', () => {
  const pattern = new Uint8Array(2);
  pattern[0] = 97; // 'a'
  pattern[1] = 98; // 'b'
  const result = Buffer.allocUnsafeSlow(8, pattern);
  return result.toString() === 'abababab';
});

test('边缘行为 - ArrayBuffer memory 连续性测试', () => {
  const ab = new ArrayBuffer(8);
  const ua = new Uint8Array(ab);
  ua.set([65, 66, 67, 68, 69, 70, 71, 72]); // ABCDEFGH
  const buf = Buffer.allocUnsafeSlow(16, ua);
  return buf.toString() === 'ABCDEFGHABCDEFGH';
});

test('边缘行为 - 多个异步 Buffer.allocUnsafeSlow 结果独立性', () => {
  // 模拟高并发环境
  const bufs = Array.from({ length: 50 }, (_, i) => {
    return Buffer.allocUnsafeSlow(50, String.fromCharCode(65 + (i % 26)));
  });

  const expected = bufs.map((buf, i) => String.fromCharCode(65 + (i % 26)));
  return bufs.every((buf, i) => buf.toString() === expected[i].repeat(buf.length));
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
    tests: tests,
    roundInfo: {
      round: 3,
      description: '边缘行为和细节场景补充测试'
    }
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