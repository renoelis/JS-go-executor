// Buffer.allocUnsafeSlow - buffer 模块函数和 Buffer.poolSize 测试
const { Buffer, transcode, isUtf8, isAscii } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Buffer.poolSize
test('Buffer.poolSize 默认为 8192', () => {
  return Buffer.poolSize === 8192;
});

test('Buffer.poolSize 是可写的', () => {
  const original = Buffer.poolSize;
  Buffer.poolSize = 4096;
  const changed = Buffer.poolSize === 4096;
  Buffer.poolSize = original;
  return changed;
});

test('Buffer.poolSize 影响 allocUnsafe 行为', () => {
  const original = Buffer.poolSize;
  Buffer.poolSize = 128;
  const buf = Buffer.allocUnsafe(100);
  Buffer.poolSize = original;
  return buf.length === 100;
});

test('allocUnsafeSlow 不受 poolSize 影响', () => {
  const original = Buffer.poolSize;
  Buffer.poolSize = 64;
  const buf = Buffer.allocUnsafeSlow(50);
  Buffer.poolSize = original;
  return buf.length === 50;
});

// transcode 函数
test('transcode 存在于 buffer 模块', () => {
  return typeof transcode === 'function';
});

test('transcode 从 latin1 到 utf8', () => {
  const source = Buffer.from('café', 'latin1');
  const result = transcode(source, 'latin1', 'utf8');
  return result.toString('utf8') === 'café';
});

test('transcode 从 utf8 到 latin1', () => {
  const source = Buffer.from('hello', 'utf8');
  const result = transcode(source, 'utf8', 'latin1');
  return result.toString('latin1') === 'hello';
});

test('transcode 从 utf8 到 ucs2', () => {
  const source = Buffer.from('AB', 'utf8');
  const result = transcode(source, 'utf8', 'ucs2');
  return result.length === 4;
});

test('transcode 从 ucs2 到 utf8', () => {
  const source = Buffer.from('test', 'ucs2');
  const result = transcode(source, 'ucs2', 'utf8');
  return result.toString('utf8') === 'test';
});

test('transcode 无效编码抛出错误', () => {
  try {
    const source = Buffer.from('test');
    transcode(source, 'utf8', 'invalid');
    return false;
  } catch (e) {
    return e.code === 'U_ILLEGAL_ARGUMENT_ERROR' || e.message.includes('encoding');
  }
});

test('transcode 空 Buffer', () => {
  const source = Buffer.from('');
  const result = transcode(source, 'utf8', 'latin1');
  return result.length === 0;
});

// isUtf8 函数
test('isUtf8 存在于 buffer 模块', () => {
  return typeof isUtf8 === 'function';
});

test('isUtf8 识别有效 UTF-8', () => {
  const buf = Buffer.from('Hello World', 'utf8');
  return isUtf8(buf) === true;
});

test('isUtf8 识别有效多字节 UTF-8', () => {
  const buf = Buffer.from('你好世界', 'utf8');
  return isUtf8(buf) === true;
});

test('isUtf8 识别 emoji', () => {
  const buf = Buffer.from('😀🎉', 'utf8');
  return isUtf8(buf) === true;
});

test('isUtf8 拒绝无效 UTF-8 序列', () => {
  const buf = Buffer.from([0xFF, 0xFE, 0xFD]);
  return isUtf8(buf) === false;
});

test('isUtf8 空 Buffer 返回 true', () => {
  const buf = Buffer.from('');
  return isUtf8(buf) === true;
});

test('isUtf8 截断的多字节序列', () => {
  const buf = Buffer.from([0xE4, 0xB8]);
  return isUtf8(buf) === false;
});

test('isUtf8 接受 Uint8Array', () => {
  const uint8 = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  return isUtf8(uint8) === true;
});

// isAscii 函数
test('isAscii 存在于 buffer 模块', () => {
  return typeof isAscii === 'function';
});

test('isAscii 识别纯 ASCII', () => {
  const buf = Buffer.from('Hello World', 'ascii');
  return isAscii(buf) === true;
});

test('isAscii 拒绝非 ASCII 字符', () => {
  const buf = Buffer.from('你好', 'utf8');
  return isAscii(buf) === false;
});

test('isAscii 拒绝扩展 ASCII（128-255）', () => {
  const buf = Buffer.from([0x80]);
  return isAscii(buf) === false;
});

test('isAscii 接受所有 0-127', () => {
  const buf = Buffer.from(Array.from({length: 128}, (_, i) => i));
  return isAscii(buf) === true;
});

test('isAscii 空 Buffer 返回 true', () => {
  const buf = Buffer.from('');
  return isAscii(buf) === true;
});

test('isAscii 接受 Uint8Array', () => {
  const uint8 = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  return isAscii(uint8) === true;
});

test('isAscii 数字和标点符号', () => {
  const buf = Buffer.from('123!@#$%^&*()');
  return isAscii(buf) === true;
});

test('isAscii 控制字符', () => {
  const buf = Buffer.from([0x00, 0x01, 0x1F, 0x7F]);
  return isAscii(buf) === true;
});

// allocUnsafeSlow 与 transcode 配合
test('allocUnsafeSlow 后 transcode', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('test', 'utf8');
  const transcoded = transcode(buf.slice(0, 4), 'utf8', 'ucs2');
  return transcoded.length === 8;
});

// allocUnsafeSlow 与 isUtf8/isAscii 配合
test('allocUnsafeSlow 写入后 isUtf8 验证', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('hello', 'utf8');
  return isUtf8(buf.slice(0, 5)) === true;
});

test('allocUnsafeSlow 写入后 isAscii 验证', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('test', 'ascii');
  return isAscii(buf.slice(0, 4)) === true;
});

test('allocUnsafeSlow 未初始化内存可能不是有效 UTF-8', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  return typeof isUtf8(buf) === 'boolean';
});

// 组合测试
test('transcode 结果可用于 allocUnsafeSlow', () => {
  const source = Buffer.from('test', 'utf8');
  const transcoded = transcode(source, 'utf8', 'ucs2');
  const buf = Buffer.allocUnsafeSlow(transcoded.length);
  transcoded.copy(buf);
  return buf.equals(transcoded);
});

test('poolSize 不影响 transcode 结果', () => {
  const original = Buffer.poolSize;
  Buffer.poolSize = 64;
  const source = Buffer.from('test');
  const result = transcode(source, 'utf8', 'latin1');
  Buffer.poolSize = original;
  return result.toString() === 'test';
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
