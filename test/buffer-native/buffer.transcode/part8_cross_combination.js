// buffer.transcode() - Part 8: Cross-combination and Chain Tests
const { Buffer, transcode } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 链式转码测试
test('三次链式转码 - UTF-8 -> UTF-16LE -> Latin1 -> UTF-8', () => {
  const original = Buffer.from('Hello', 'utf8');
  const step1 = transcode(original, 'utf8', 'utf16le');
  const step2 = transcode(step1, 'utf16le', 'latin1');
  const step3 = transcode(step2, 'latin1', 'utf8');
  return step3.toString() === 'Hello';
});

test('四次链式转码 - UTF-8 -> ASCII -> Latin1 -> UTF-16LE -> UTF-8', () => {
  const original = Buffer.from('Test', 'utf8');
  const step1 = transcode(original, 'utf8', 'ascii');
  const step2 = transcode(step1, 'ascii', 'latin1');
  const step3 = transcode(step2, 'latin1', 'utf16le');
  const step4 = transcode(step3, 'utf16le', 'utf8');
  return step4.toString() === 'Test';
});

test('五次链式转码 - UTF-8 -> UCS2 -> UTF-8 -> UTF-16LE -> UTF-8', () => {
  const original = Buffer.from('Chain', 'utf8');
  let current = original;
  current = transcode(current, 'utf8', 'ucs2');
  current = transcode(current, 'ucs2', 'utf8');
  current = transcode(current, 'utf8', 'utf16le');
  current = transcode(current, 'utf16le', 'utf8');
  return current.toString() === 'Chain';
});

// 不同大小组合
test('小到大 - 1 字节到多字节编码', () => {
  const source = Buffer.from('A', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2 && source.length === 1;
});

test('大到小 - 多字节到单字节编码', () => {
  const source = Buffer.from('A', 'utf16le');
  const result = transcode(source, 'utf16le', 'utf8');
  return result.length === 1 && source.length === 2;
});

test('等大小 - Latin1 到 ASCII', () => {
  const source = Buffer.from('Hello', 'latin1');
  const result = transcode(source, 'latin1', 'ascii');
  return result.length === source.length;
});

// 各编码间的全排列转换（部分组合）
test('ASCII -> Latin1 -> UTF-8', () => {
  const original = Buffer.from('ABC', 'ascii');
  const step1 = transcode(original, 'ascii', 'latin1');
  const step2 = transcode(step1, 'latin1', 'utf8');
  return step2.toString() === 'ABC';
});

test('Latin1 -> UTF-16LE -> UCS2 -> UTF-8', () => {
  const original = Buffer.from('Test', 'latin1');
  const step1 = transcode(original, 'latin1', 'utf16le');
  const step2 = transcode(step1, 'utf16le', 'ucs2');
  const step3 = transcode(step2, 'ucs2', 'utf8');
  return step3.toString() === 'Test';
});

test('UCS2 -> Latin1 (ASCII 范围)', () => {
  const source = Buffer.from('Hello', 'ucs2');
  const result = transcode(source, 'ucs2', 'latin1');
  return result.toString('latin1') === 'Hello';
});

test('UTF-16LE -> ASCII (ASCII 范围)', () => {
  const source = Buffer.from('World', 'utf16le');
  const result = transcode(source, 'utf16le', 'ascii');
  return result.toString('ascii') === 'World';
});

// 混合长度和编码
test('短文本多次往返', () => {
  const original = Buffer.from('Hi', 'utf8');
  let current = original;

  for (let i = 0; i < 10; i++) {
    current = transcode(current, 'utf8', 'utf16le');
    current = transcode(current, 'utf16le', 'utf8');
  }

  return current.equals(original);
});

test('长文本多次往返', () => {
  const original = Buffer.from('X'.repeat(1000), 'utf8');
  let current = original;

  for (let i = 0; i < 5; i++) {
    current = transcode(current, 'utf8', 'utf16le');
    current = transcode(current, 'utf16le', 'utf8');
  }

  return current.equals(original);
});

// 多种输入类型组合
test('Buffer -> transcode -> Uint8Array 视图验证', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const view = new Uint8Array(result);
  return view.length === 8;
});

test('Uint8Array -> transcode -> Buffer 操作', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  const result = transcode(arr, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 10;
});

test('Buffer.slice -> transcode -> 再次 slice', () => {
  const original = Buffer.from('Hello World', 'utf8');
  const sliced = original.slice(0, 5);
  const transcoded = transcode(sliced, 'utf8', 'utf16le');
  const finalSlice = transcoded.slice(0, 4);
  return finalSlice.length === 4;
});

// 特殊字符链式转换
test('Emoji 链式转换', () => {
  const original = Buffer.from('😀', 'utf8');
  const step1 = transcode(original, 'utf8', 'utf16le');
  const step2 = transcode(step1, 'utf16le', 'utf8');
  return step2.equals(original);
});

test('中文链式转换', () => {
  const original = Buffer.from('你好', 'utf8');
  const step1 = transcode(original, 'utf8', 'utf16le');
  const step2 = transcode(step1, 'utf16le', 'ucs2');
  const step3 = transcode(step2, 'ucs2', 'utf8');
  return step3.equals(original);
});

test('混合字符链式转换', () => {
  const original = Buffer.from('Hi你好😀', 'utf8');
  const step1 = transcode(original, 'utf8', 'utf16le');
  const step2 = transcode(step1, 'utf16le', 'utf8');
  return step2.equals(original);
});

// 边界和长度组合
test('长度为 1 的各种编码转换', () => {
  const tests = [
    { from: 'utf8', to: 'utf16le' },
    { from: 'utf8', to: 'latin1' },
    { from: 'utf8', to: 'ascii' },
    { from: 'latin1', to: 'utf8' },
    { from: 'ascii', to: 'utf8' }
  ];

  return tests.every(t => {
    const source = Buffer.from('A', t.from);
    const result = transcode(source, t.from, t.to);
    return result instanceof Buffer;
  });
});

test('长度为 255 的转码', () => {
  const source = Buffer.from('B'.repeat(255), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 510;
});

test('长度为 256 的转码', () => {
  const source = Buffer.from('C'.repeat(256), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 512;
});

test('长度为 257 的转码', () => {
  const source = Buffer.from('D'.repeat(257), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 514;
});

// 重复模式测试
test('重复 AA 模式', () => {
  const source = Buffer.from('AA'.repeat(100), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 400;
});

test('重复 ABC 模式', () => {
  const source = Buffer.from('ABC'.repeat(100), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 600;
});

test('重复中文模式', () => {
  const source = Buffer.from('你好'.repeat(50), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.equals(source);
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
