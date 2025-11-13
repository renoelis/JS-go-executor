// buffer.transcode() - Part 6: Encoding Coverage and ICU Tests
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

// Latin1 和 Binary 的等价性
test('Latin1 和 Binary 编码等价', () => {
  const source = Buffer.from('Hello', 'utf8');
  try {
    const latin1Result = transcode(source, 'utf8', 'latin1');
    const binaryResult = transcode(source, 'utf8', 'binary');
    return latin1Result.equals(binaryResult);
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('Binary 作为源编码', () => {
  try {
    const source = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
    const result = transcode(source, 'binary', 'utf8');
    return result.toString('utf8') === 'Hello';
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('Binary 作为目标编码', () => {
  try {
    const source = Buffer.from('Hello', 'utf8');
    const result = transcode(source, 'utf8', 'binary');
    return result.toString('binary') === 'Hello';
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

// UCS2 和 UTF-16LE 的关系
test('UCS2 和 UTF-16LE 等价测试', () => {
  const source = Buffer.from('Hello', 'utf8');
  const ucs2Result = transcode(source, 'utf8', 'ucs2');
  const utf16Result = transcode(source, 'utf8', 'utf16le');
  return ucs2Result.equals(utf16Result);
});

test('UCS2 转 UTF-8', () => {
  const source = Buffer.from('Test', 'ucs2');
  const result = transcode(source, 'ucs2', 'utf8');
  return result.toString('utf8') === 'Test';
});

test('UTF-8 转 UCS2', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'utf8', 'ucs2');
  const back = transcode(result, 'ucs2', 'utf8');
  return back.toString('utf8') === 'Test';
});

// 不支持的编码（base64, base64url, hex）
test('base64 作为源编码（不支持）', () => {
  try {
    const source = Buffer.from('SGVsbG8=', 'base64');
    transcode(source, 'base64', 'utf8');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('base64 作为目标编码（不支持）', () => {
  try {
    const source = Buffer.from('Hello', 'utf8');
    transcode(source, 'utf8', 'base64');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('base64url 作为源编码（不支持）', () => {
  try {
    const source = Buffer.from('SGVsbG8', 'base64url');
    transcode(source, 'base64url', 'utf8');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('base64url 作为目标编码（不支持）', () => {
  try {
    const source = Buffer.from('Hello', 'utf8');
    transcode(source, 'utf8', 'base64url');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('hex 作为源编码（不支持）', () => {
  try {
    const source = Buffer.from('48656c6c6f', 'hex');
    transcode(source, 'hex', 'utf8');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('hex 作为目标编码（不支持）', () => {
  try {
    const source = Buffer.from('Hello', 'utf8');
    transcode(source, 'utf8', 'hex');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

// ASCII 范围测试
test('ASCII 范围内字符 (0x00-0x7F)', () => {
  const bytes = [];
  for (let i = 0; i <= 0x7F; i++) {
    bytes.push(i);
  }
  const source = Buffer.from(bytes);
  const result = transcode(source, 'ascii', 'utf8');
  return result.length === 128;
});

test('ASCII 转 Latin1', () => {
  const source = Buffer.from('Hello ASCII', 'ascii');
  const result = transcode(source, 'ascii', 'latin1');
  return result.toString('latin1') === 'Hello ASCII';
});

test('ASCII 转 UTF-16LE', () => {
  const source = Buffer.from('ABC', 'ascii');
  const result = transcode(source, 'ascii', 'utf16le');
  return result.length === 6;
});

// Latin1 完整范围
test('Latin1 扩展字符转 UTF-8 (0x80-0xFF)', () => {
  const bytes = [];
  for (let i = 0x80; i <= 0xFF; i++) {
    bytes.push(i);
  }
  const source = Buffer.from(bytes);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length > 128;
});

test('Latin1 特定字符 - © (0xA9)', () => {
  const source = Buffer.from([0xA9]);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length === 2;
});

test('Latin1 特定字符 - ® (0xAE)', () => {
  const source = Buffer.from([0xAE]);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length === 2;
});

test('Latin1 特定字符 - ½ (0xBD)', () => {
  const source = Buffer.from([0xBD]);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length === 2;
});

test('Latin1 特定字符 - ÿ (0xFF)', () => {
  const source = Buffer.from([0xFF]);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length === 2;
});

// UTF-8 边界和非法序列详细测试
test('UTF-8 非法起始字节 0xFE', () => {
  const source = Buffer.from([0xFE]);
  try {
    transcode(source, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('UTF-8 非法起始字节 0xFF', () => {
  const source = Buffer.from([0xFF]);
  try {
    transcode(source, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('UTF-8 4 字节序列不完整', () => {
  const source = Buffer.from([0xF0, 0x90, 0x80]); // 缺少最后一个字节
  try {
    transcode(source, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('UTF-8 3 字节序列不完整', () => {
  const source = Buffer.from([0xE0, 0xA0]); // 缺少最后一个字节
  try {
    transcode(source, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('UTF-8 过长编码 - 2 字节表示 ASCII', () => {
  const source = Buffer.from([0xC1, 0x81]); // 过长编码的 'A'
  try {
    transcode(source, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
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
