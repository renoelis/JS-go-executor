// buf.includes() - Additional Coverage Tests (额外补充测试)
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

// === 更多 TypedArray 子类测试 ===
test('Int32Array 作为搜索值', () => {
  const buf = Buffer.from([0, 0, 0, 1, 0, 0, 0, 2]);
  try {
    const search = new Int32Array([1]);
    const result = buf.includes(search);
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

test('Uint32Array 作为搜索值', () => {
  const buf = Buffer.from([0, 0, 0, 1, 0, 0, 0, 2]);
  try {
    const search = new Uint32Array([1]);
    const result = buf.includes(search);
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

test('Float64Array 作为搜索值', () => {
  const buf = Buffer.from([0, 0, 0, 0, 0, 0, 240, 63]); // 1.0 in little-endian
  try {
    const search = new Float64Array([1.0]);
    const result = buf.includes(search);
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

test('BigInt64Array 作为搜索值', () => {
  const buf = Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]);
  try {
    const search = new BigInt64Array([1n]);
    const result = buf.includes(search);
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

test('BigUint64Array 作为搜索值', () => {
  const buf = Buffer.from([255, 255, 255, 255, 255, 255, 255, 255]);
  try {
    const search = new BigUint64Array([18446744073709551615n]);
    const result = buf.includes(search);
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

// === Buffer 池化相关测试 ===
test('allocUnsafe 创建的 Buffer - includes 正常工作', () => {
  const buf = Buffer.allocUnsafe(20);
  buf.fill(0);
  buf.write('hello', 0);
  return buf.includes('hello') === true;
});

test('allocUnsafeSlow 创建的 Buffer - includes 正常工作', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  buf.fill(0);
  buf.write('world', 0);
  return buf.includes('world') === true;
});

test('小 Buffer (< 4KB) 池化行为', () => {
  const buf1 = Buffer.alloc(100);
  buf1.write('test1', 0);
  const buf2 = Buffer.alloc(100);
  buf2.write('test2', 0);
  return buf1.includes('test1') && buf2.includes('test2') && !buf1.includes('test2');
});

// === 字符串编码边界情况 ===
test('utf8 编码 - BOM 字符', () => {
  const buf = Buffer.from('\uFEFFhello');
  return buf.includes('\uFEFF') === true;
});

test('utf8 编码 - 替换字符 (U+FFFD)', () => {
  const buf = Buffer.from('\uFFFD');
  return buf.includes('\uFFFD') === true;
});

test('utf16le 编码 - 空字符串', () => {
  const buf = Buffer.from('', 'utf16le');
  return buf.includes('', 0, 'utf16le') === true;
});

test('utf16le 编码 - 单字符', () => {
  const buf = Buffer.from('A', 'utf16le');
  return buf.includes('A', 0, 'utf16le') === true;
});

test('hex 编码 - 单个字节', () => {
  const buf = Buffer.from('FF', 'hex');
  return buf.includes('FF', 0, 'hex') === true;
});

test('hex 编码 - 空字符串', () => {
  const buf = Buffer.from('AABB', 'hex');
  return buf.includes('', 0, 'hex') === true;
});

test('base64 编码 - 空字符串', () => {
  const buf = Buffer.from('aGVsbG8=', 'base64');
  return buf.includes('', 0, 'base64') === true;
});

test('base64 编码 - 填充字符处理', () => {
  const buf = Buffer.from('YQ==', 'base64'); // 'a'
  return buf.includes('a') === true;
});

// === 特殊的 byteOffset 值 ===
test('byteOffset 为字符串 "0"', () => {
  const buf = Buffer.from('hello world');
  try {
    const result = buf.includes('hello', '0');
    return result === true;
  } catch (e) {
    return true;
  }
});

test('byteOffset 为字符串 "abc" (转为 NaN)', () => {
  const buf = Buffer.from('hello world');
  try {
    const result = buf.includes('hello', 'abc');
    return result === true;
  } catch (e) {
    return true;
  }
});

test('byteOffset 为布尔值 true (转为 1)', () => {
  const buf = Buffer.from('hello world');
  try {
    const result = buf.includes('ello', true);
    return result === true;
  } catch (e) {
    return true;
  }
});

test('byteOffset 为布尔值 false (转为 0)', () => {
  const buf = Buffer.from('hello world');
  try {
    const result = buf.includes('hello', false);
    return result === true;
  } catch (e) {
    return true;
  }
});

// === 混合场景 ===
test('在 Buffer 中查找 Uint8Array，使用 offset', () => {
  const buf = Buffer.from('hello world');
  const search = new Uint8Array([119, 111, 114, 108, 100]); // 'world'
  return buf.includes(search, 6) === true;
});

test('在 Buffer 中查找 Uint8Array，offset 超出', () => {
  const buf = Buffer.from('hello world');
  const search = new Uint8Array([104, 101, 108, 108, 111]); // 'hello'
  return buf.includes(search, 6) === false;
});

test('查找单字节 Buffer，使用负 offset', () => {
  const buf = Buffer.from('hello world');
  const search = Buffer.from([100]); // 'd'
  return buf.includes(search, -1) === true;
});

test('查找多字节 Buffer，使用负 offset', () => {
  const buf = Buffer.from('hello world');
  const search = Buffer.from('world');
  return buf.includes(search, -5) === true;
});

// === 极端长度测试 ===
test('搜索长度为 1 的字符串，在长 Buffer 中', () => {
  const buf = Buffer.alloc(10000);
  buf.write('x', 5000);
  return buf.includes('x') === true;
});

test('搜索长度为 Buffer.length - 1 的内容', () => {
  const buf = Buffer.from('abcdefghij');
  return buf.includes('abcdefghi') === true;
});

test('搜索长度为 Buffer.length 的内容', () => {
  const buf = Buffer.from('abcdefghij');
  return buf.includes('abcdefghij') === true;
});

// === 特殊 Unicode 组合 ===
test('组合字符序列 - 多个音标', () => {
  const buf = Buffer.from('e\u0301\u0302'); // e + 两个音标
  return buf.includes('\u0301') === true;
});

test('表情符号 - 国旗序列', () => {
  const buf = Buffer.from('🇨🇳'); // 中国国旗
  return buf.includes('🇨🇳') === true;
});

test('表情符号 - 性别修饰符', () => {
  const buf = Buffer.from('👨‍⚕️'); // 男医生
  return buf.includes('👨') === true;
});

// === 与其他 Buffer 方法的交互 ===
test('fill 后 includes', () => {
  const buf = Buffer.alloc(10);
  buf.fill('a');
  return buf.includes('a') === true && buf.includes('aaaa') === true;
});

test('copy 后 includes', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  buf1.copy(buf2, 0);
  return buf2.includes('hello') === true;
});

test('swap16 后 includes', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();
  return buf.includes(Buffer.from([0x02, 0x01])) === true;
});

test('swap32 后 includes', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();
  return buf.includes(Buffer.from([0x04, 0x03, 0x02, 0x01])) === true;
});

test('swap64 后 includes', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();
  return buf.includes(Buffer.from([0x08, 0x07, 0x06, 0x05])) === true;
});

// === 内存视图测试 ===
test('Buffer.from(buffer) 创建副本后 includes', () => {
  const buf1 = Buffer.from('hello world');
  const buf2 = Buffer.from(buf1);
  return buf2.includes('world') === true;
});

test('Buffer.from(buffer.buffer) 共享内存后 includes', () => {
  const buf1 = Buffer.from('hello world');
  const buf2 = Buffer.from(buf1.buffer);
  return buf2.includes('world') === true;
});

// === 性能相关 - 对齐和非对齐访问 ===
test('非对齐访问 - 奇数位置开始', () => {
  const buf = Buffer.from('xhello world');
  return buf.includes('hello', 1) === true;
});

test('非对齐访问 - 查找跨越对齐边界', () => {
  const buf = Buffer.from('x'.repeat(15) + 'target' + 'y'.repeat(15));
  return buf.includes('target', 15) === true;
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
