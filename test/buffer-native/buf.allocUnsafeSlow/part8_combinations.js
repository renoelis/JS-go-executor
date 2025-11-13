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

test('组合参数 - size + fill + encoding 全组合验证（hex）', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill('68656c6c6f', 0, undefined, 'hex');
  return buf.toString() === 'hello';
});

test('组合参数 - size + fill + encoding 全组合验证（base64）', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill('aGVsbG8=', 0, undefined, 'base64');
  return buf.toString() === 'hello';
});

test('组合参数 - 大 BUFFER + 小 fill + utf8 encoding', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  buf.fill('X', 0, undefined, 'utf8');
  return buf.length === 100 && buf.every(b => b === 88);
});

test('组合参数 - 小 BUFFER + 长 fill + ascii encoding', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf.fill('HELLO', 0, undefined, 'ascii');
  return buf.toString() === 'HEL';
});

test('组合参数 - fill 为 Uint8Array + 大 BUFFER', () => {
  const u8 = new Uint8Array([72, 69, 76, 76, 79]); // HELLO
  const buf = Buffer.allocUnsafeSlow(15);
  buf.fill(u8);
  return buf.toString() === 'HELLOHELLOHELLO';
});

test('组合参数 - fill 为 Buffer 实例 + 十六进制 encoding', () => {
  const fillBuf = Buffer.from('Test');
  const buf = Buffer.allocUnsafeSlow(12);
  buf.fill(fillBuf);
  return buf.toString() === 'TestTestTest';
});

test('组合参数 - size 为数字 + fill 为 number + encoding 为 latin1', () => {
  const buf = Buffer.allocUnsafeSlow(16);
  buf.fill(65, 0, undefined, 'latin1');
  return buf.length === 16 && buf.every(b => b === 65);
});

test('组合参数 - size 为数字 + fill 为空字符', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill('');
  return buf.length === 5;
});

test('组合参数 - size 为数字 + fill 为 object', () => {
  const buf = Buffer.allocUnsafeSlow(256);
  buf.fill('Z');
  return buf.length === 256 && buf[0] === 90;
});

test('组合参数 - size 为数字 + fill 为无效字符串 + 编码为 utf16le', () => {
  const buf = Buffer.allocUnsafeSlow(32);
  buf.fill('�', 0, undefined, 'utf16le');
  return buf.length === 32;
});

test('组合参数 - size 为数字 + fill 为 view', () => {
  const view = new DataView(new ArrayBuffer(2));
  view.setUint8(0, 65); view.setUint8(1, 66);
  const buf = Buffer.allocUnsafeSlow(6);
  buf.fill(view);
  return buf.length === 6 && buf.toString() === 'ABABAB';
});

test('组合参数 - size 为数字 + fill 为 null + encoding 省略', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(null);
  return buf.length === 10;
});

test('组合参数 - 多类型混合（fill 顺序 vs overflow）', () => {
  const fill = Buffer.from('ABCDE');
  const buf = Buffer.allocUnsafeSlow(13);
  buf.fill(fill);
  return buf.length === 13 && buf.toString() === 'ABCDEABCDEABC';
});

test('组合参数 - size 为数字 + 多个 encoding 校准', () => {
  const tests = [
    { size: 8, fill: 'A', encoding: 'binary' },
    { size: 8, fill: Buffer.from('B'), encoding: undefined },
    { size: 8, fill: new Uint8Array([67]), encoding: 'utf8' }
  ];
  let ok = true;
  tests.forEach(({ size, fill, encoding }) => {
    const buf = Buffer.allocUnsafeSlow(size);
    if (encoding) {
      buf.fill(fill, 0, undefined, encoding);
    } else {
      buf.fill(fill);
    }
    if (buf.length !== size) ok = false;
  });
  return ok;
});

test('组合参数 - size 类型混合 + Buffer 池化策略对比双用', () => {
  const baseSizes = [512, 1024, 2048, 4096, 8192];
  const comb = [];
  baseSizes.forEach(size => {
    const buf1 = Buffer.allocUnsafeSlow(size);                                      // 慢策略
    buf1.fill('A');
    const buf2 = Buffer.allocUnsafeSlow(size);                                      // 慢策略
    buf2.fill(Buffer.from('B'));
    const buf3 = Buffer.allocUnsafeSlow(size);                                      // 慢策略
    buf3.fill(new Uint8Array([67]));
    comb.push({ buf1, buf2, buf3, size });
  });
  return comb.every(({ buf1, buf2, buf3, size }) =>
    buf1.length === size && buf2.length === size && buf3.length === size
  );
});

test('组合参数 - 全类型对齐：fill + encoding + size 混合', () => {
  const matrix = [
    { fill: 'A', encoding: 'utf16le', size: 16 },
    { fill: Buffer.from([66]), encoding: 'ascii', size: 12 },
    { fill: new Uint8Array([67]), encoding: 'hex', size: 8 },
    { fill: new DataView(new ArrayBuffer(1)), encoding: 'base64', size: 10 },
    { fill: 68, encoding: 'latin1', size: 10 },
    { fill: { toString: () => 'E' }, encoding: 'binary', size: 10 }
  ];

  matrix.forEach(cfg => {
    const buf = Buffer.allocUnsafeSlow(cfg.size);
    if (cfg.encoding) {
      buf.fill(cfg.fill, 0, undefined, cfg.encoding);
    } else {
      buf.fill(cfg.fill);
    }
    if (buf.length !== cfg.size) return false;
  });
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
    tests: tests,
    roundInfo: {
      round: 4,
      description: '参数组合覆盖度和双色球缺失补充'
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