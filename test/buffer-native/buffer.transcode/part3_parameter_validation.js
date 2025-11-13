// buffer.transcode() - Part 3: Parameter Validation Tests
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

// 参数缺失测试
test('缺少第一个参数', () => {
  try {
    transcode();
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('缺少第二个参数（源编码）', () => {
  try {
    const source = Buffer.from('Hello', 'utf8');
    transcode(source);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('缺少第三个参数（目标编码）', () => {
  try {
    const source = Buffer.from('Hello', 'utf8');
    transcode(source, 'utf8');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('空字符串作为源编码', () => {
  try {
    const source = Buffer.from('Hello', 'utf8');
    transcode(source, '', 'utf16le');
    return false;
  } catch (e) {
    return true;
  }
});

test('空字符串作为目标编码', () => {
  try {
    const source = Buffer.from('Hello', 'utf8');
    transcode(source, 'utf8', '');
    return false;
  } catch (e) {
    return true;
  }
});

// 编码名称别名测试
test('utf-8 带连字符（别名）', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'utf-8', 'utf-16le');
  return result instanceof Buffer && result.length === 10;
});

test('ucs-2 带连字符（别名）', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'utf8', 'ucs-2');
  return result instanceof Buffer && result.length === 10;
});

test('BINARY 编码别名', () => {
  try {
    const source = Buffer.from('Hello', 'utf8');
    const result = transcode(source, 'utf8', 'binary');
    return result instanceof Buffer;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

// TypedArray 变种测试
test('Uint8ClampedArray 作为输入', () => {
  const source = new Uint8ClampedArray([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  try {
    const result = transcode(source, 'utf8', 'utf16le');
    return result instanceof Buffer && result.length === 10;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('DataView 作为输入（不支持）', () => {
  const ab = new ArrayBuffer(5);
  const view = new DataView(ab);
  view.setUint8(0, 0x48);
  view.setUint8(1, 0x65);
  try {
    transcode(view, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Uint8Array 带 byteOffset', () => {
  const ab = new ArrayBuffer(10);
  const full = new Uint8Array(ab);
  full[5] = 0x48;
  full[6] = 0x65;
  full[7] = 0x6C;
  const slice = new Uint8Array(ab, 5, 3);
  const result = transcode(slice, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 6;
});

test('Uint8Array 带 byteLength', () => {
  const ab = new ArrayBuffer(10);
  const partial = new Uint8Array(ab, 0, 5);
  partial[0] = 0x48;
  partial[1] = 0x65;
  const result = transcode(partial, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 4;
});

// Buffer 子视图
test('Buffer.slice 作为输入', () => {
  const original = Buffer.from('Hello World', 'utf8');
  const slice = original.slice(0, 5);
  const result = transcode(slice, 'utf8', 'utf16le');
  return result.length === 10;
});

test('Buffer.subarray 作为输入', () => {
  const original = Buffer.from('Hello World', 'utf8');
  const sub = original.subarray(6, 11);
  const result = transcode(sub, 'utf8', 'utf16le');
  return result.length === 10;
});

// 编码名称各种格式
test('混合大小写编码名称', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'UtF8', 'Utf16LE');
  return result instanceof Buffer;
});

test('编码名称带空格（应失败）', () => {
  try {
    const source = Buffer.from('Hello', 'utf8');
    transcode(source, ' utf8 ', 'utf16le');
    return false;
  } catch (e) {
    return true;
  }
});

// 特殊 Buffer 对象
test('Buffer.alloc 创建的 Buffer', () => {
  const source = Buffer.alloc(5);
  source.write('Hello', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 10;
});

test('Buffer.allocUnsafe 创建的 Buffer', () => {
  const source = Buffer.allocUnsafe(5);
  source.write('Hello', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 10;
});

// 参数类型细节
test('编码参数为数字（应失败）', () => {
  try {
    const source = Buffer.from('Hello', 'utf8');
    transcode(source, 123, 456);
    return false;
  } catch (e) {
    return true;
  }
});

test('编码参数为对象（应失败）', () => {
  try {
    const source = Buffer.from('Hello', 'utf8');
    transcode(source, {}, {});
    return false;
  } catch (e) {
    return true;
  }
});

test('传入额外参数（应被忽略）', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le', 'extra', 'params');
  return result instanceof Buffer && result.length === 10;
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
