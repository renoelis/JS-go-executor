// buf.toJSON() - Extreme Cases and Historical Behavior Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌', passed: pass });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// 极端场景与历史行为测试
test('长度刚好为 0 的 subarray', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const empty1 = buf.subarray(0, 0);
  const empty2 = buf.subarray(2, 2);
  const empty3 = buf.subarray(5, 5);

  const json1 = empty1.toJSON();
  const json2 = empty2.toJSON();
  const json3 = empty3.toJSON();

  if (json1.data.length !== 0) return false;
  if (json2.data.length !== 0) return false;
  if (json3.data.length !== 0) return false;

  return true;
});

test('长度为 1 字节的所有可能值', () => {
  for (let i = 0; i < 256; i++) {
    const buf = Buffer.from([i]);
    const json = buf.toJSON();

    if (json.type !== 'Buffer') return false;
    if (json.data.length !== 1) return false;
    if (json.data[0] !== i) return false;
  }

  return true;
});

test('offset 为 length-1 的 slice', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(4); // 只包含最后一个元素
  const json = sliced.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 1) return false;
  if (json.data[0] !== 5) return false;

  return true;
});

test('offset 为 0, length 为 buffer.length 的 slice', () => {
  const buf = Buffer.from([10, 20, 30]);
  const sliced = buf.slice(0, buf.length);
  const json = sliced.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 10 || json.data[2] !== 30) return false;

  return true;
});

test('负数索引的 slice', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(-2); // 最后两个元素
  const json = sliced.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 2) return false;
  if (json.data[0] !== 4 || json.data[1] !== 5) return false;

  return true;
});

test('负数起始和结束的 slice', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sliced = buf.slice(-4, -1); // [20, 30, 40]
  const json = sliced.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 20 || json.data[1] !== 30 || json.data[2] !== 40) return false;

  return true;
});

test('包含高位字节的 UTF-8 字符', () => {
  // 测试不同字节长度的 UTF-8 字符
  const testCases = [
    { char: '😀', expectedLength: 4 }, // 4 字节 emoji
    { char: '🚀', expectedLength: 4 }, // 4 字节 emoji
    { char: '⭐', expectedLength: 3 }, // 3 字节 emoji
    { char: '🎉', expectedLength: 4 }  // 4 字节 emoji
  ];

  for (const testCase of testCases) {
    const buf = Buffer.from(testCase.char, 'utf8');
    const json = buf.toJSON();

    if (json.type !== 'Buffer') return false;
    if (json.data.length !== testCase.expectedLength) return false;

    // 验证可以重建
    const rebuilt = Buffer.from(json.data);
    if (rebuilt.toString('utf8') !== testCase.char) return false;
  }

  return true;
});

test('包含 BOM 的 UTF-8 Buffer', () => {
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
  const text = Buffer.from('Hello', 'utf8');
  const combined = Buffer.concat([bom, text]);
  const json = combined.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 8) return false; // 3 (BOM) + 5 (Hello)
  if (json.data[0] !== 0xEF || json.data[1] !== 0xBB || json.data[2] !== 0xBF) return false;

  return true;
});

test('包含替代对的 UTF-16 字符', () => {
  const str = '𝕳𝖊𝖑𝖑𝖔'; // Mathematical bold text (uses surrogate pairs)
  const buf = Buffer.from(str, 'utf8');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;

  // 验证可以重建
  const rebuilt = Buffer.from(json.data);
  if (rebuilt.toString('utf8') !== str) return false;

  return true;
});

test('包含零宽字符的 Buffer', () => {
  const str = 'a\u200Bb\u200Cc\u200Dd'; // 零宽空格, 零宽非连接符, 零宽连接符
  const buf = Buffer.from(str, 'utf8');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;

  // 验证可以重建
  const rebuilt = Buffer.from(json.data);
  if (rebuilt.toString('utf8') !== str) return false;

  return true;
});

test('包含组合字符的 Buffer', () => {
  const str = 'e\u0301'; // é (e + combining acute accent)
  const buf = Buffer.from(str, 'utf8');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;

  const rebuilt = Buffer.from(json.data);
  if (rebuilt.toString('utf8') !== str) return false;

  return true;
});

test('hex 编码的边界情况', () => {
  // 奇数长度的 hex 字符串
  const buf1 = Buffer.from('abc', 'hex'); // 会被截断为 'ab'
  const json1 = buf1.toJSON();
  if (json1.data.length !== 1) return false;
  if (json1.data[0] !== 0xab) return false;

  // 空 hex 字符串
  const buf2 = Buffer.from('', 'hex');
  const json2 = buf2.toJSON();
  if (json2.data.length !== 0) return false;

  // 无效的 hex 字符串 (包含非 hex 字符)
  const buf3 = Buffer.from('zz', 'hex');
  const json3 = buf3.toJSON();
  if (json3.data.length !== 0) return false;

  return true;
});

test('base64 编码的边界情况', () => {
  // 不同 padding 的 base64
  const testCases = [
    'SGVsbG8=',   // 标准 padding
    'SGVsbG8',    // 无 padding
    'QQ==',       // 双 padding
    'QQ'          // 无 padding
  ];

  for (const b64 of testCases) {
    const buf = Buffer.from(b64, 'base64');
    const json = buf.toJSON();

    if (json.type !== 'Buffer') return false;
    if (!Array.isArray(json.data)) return false;
  }

  return true;
});

test('latin1 的全字符集', () => {
  const bytes = [];
  for (let i = 0; i < 256; i++) {
    bytes.push(i);
  }

  const buf = Buffer.from(bytes);
  const latin1Str = buf.toString('latin1');
  const buf2 = Buffer.from(latin1Str, 'latin1');
  const json = buf2.toJSON();

  if (json.data.length !== 256) return false;

  for (let i = 0; i < 256; i++) {
    if (json.data[i] !== i) return false;
  }

  return true;
});

test('写入后立即 toJSON', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello', 0, 'utf8');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 10) return false;

  // 前 5 字节应该是 'hello'
  const expected = [104, 101, 108, 108, 111];
  for (let i = 0; i < 5; i++) {
    if (json.data[i] !== expected[i]) return false;
  }

  // 后 5 字节应该是 0
  for (let i = 5; i < 10; i++) {
    if (json.data[i] !== 0) return false;
  }

  return true;
});

test('fill 后立即 toJSON', () => {
  const buf = Buffer.alloc(20);
  buf.fill('abc', 0, 15);
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 20) return false;

  // 验证填充模式
  const pattern = [97, 98, 99]; // 'abc'
  for (let i = 0; i < 15; i++) {
    if (json.data[i] !== pattern[i % 3]) return false;
  }

  // 最后 5 字节应该是 0
  for (let i = 15; i < 20; i++) {
    if (json.data[i] !== 0) return false;
  }

  return true;
});

test('copy 后的 Buffer', () => {
  const src = Buffer.from([1, 2, 3, 4, 5]);
  const dest = Buffer.alloc(10);
  src.copy(dest, 2); // 从 dest[2] 开始复制

  const json = dest.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 10) return false;

  // 前 2 字节是 0
  if (json.data[0] !== 0 || json.data[1] !== 0) return false;

  // 中间 5 字节是复制的数据
  for (let i = 0; i < 5; i++) {
    if (json.data[i + 2] !== i + 1) return false;
  }

  // 最后 3 字节是 0
  for (let i = 7; i < 10; i++) {
    if (json.data[i] !== 0) return false;
  }

  return true;
});

test('swap16/swap32/swap64 后的 toJSON', () => {
  const buf16 = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf16.swap16();
  const json16 = buf16.toJSON();
  // swap16 应该交换每对字节
  if (json16.data[0] !== 0x02 || json16.data[1] !== 0x01) return false;
  if (json16.data[2] !== 0x04 || json16.data[3] !== 0x03) return false;

  const buf32 = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf32.swap32();
  const json32 = buf32.toJSON();
  // swap32 应该反转 4 字节
  if (json32.data[0] !== 0x04 || json32.data[3] !== 0x01) return false;

  return true;
});

test('包含多语言文本的 Buffer', () => {
  const texts = [
    'English',
    '中文',
    '日本語',
    '한국어',
    'العربية',
    'עברית',
    'Русский'
  ];

  for (const text of texts) {
    const buf = Buffer.from(text, 'utf8');
    const json = buf.toJSON();

    if (json.type !== 'Buffer') return false;

    const rebuilt = Buffer.from(json.data);
    if (rebuilt.toString('utf8') !== text) return false;
  }

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
    tests: tests
  };
  console.log('\n' + JSON.stringify(result, null, 2));
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
