// buf.toJSON() - Edge Cases and Boundary Tests
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

// 边界和极端情况测试
test('所有字节值 0-255 的正确性', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 256) return false;
  for (let i = 0; i < 256; i++) {
    if (json.data[i] !== i) return false;
  }
  return true;
});

test('包含 0x00 的 Buffer', () => {
  const buf = Buffer.from([0, 0, 0]);
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 0 || json.data[1] !== 0 || json.data[2] !== 0) return false;
  return true;
});

test('包含 0xFF 的 Buffer', () => {
  const buf = Buffer.from([255, 255, 255]);
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 255 || json.data[1] !== 255 || json.data[2] !== 255) return false;
  return true;
});

test('交替 0x00 和 0xFF', () => {
  const buf = Buffer.from([0, 255, 0, 255, 0, 255]);
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 6) return false;
  for (let i = 0; i < 6; i++) {
    if (json.data[i] !== (i % 2 === 0 ? 0 : 255)) return false;
  }
  return true;
});

test('较大的 Buffer (1000 字节)', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < 1000; i++) {
    buf[i] = i % 256;
  }
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 1000) return false;
  for (let i = 0; i < 1000; i++) {
    if (json.data[i] !== i % 256) return false;
  }
  return true;
});

test('包含 UTF-8 多字节字符的 Buffer', () => {
  const buf = Buffer.from('你好世界', 'utf8');
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  // '你好世界' 应该是 12 字节 (每个中文字符 3 字节)
  if (json.data.length !== 12) return false;
  // 验证可以转回字符串
  const rebuilt = Buffer.from(json.data);
  if (rebuilt.toString('utf8') !== '你好世界') return false;
  return true;
});

test('包含 emoji 的 Buffer', () => {
  const buf = Buffer.from('😀😁😂', 'utf8');
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  // emoji 每个 4 字节
  if (json.data.length !== 12) return false;
  const rebuilt = Buffer.from(json.data);
  if (rebuilt.toString('utf8') !== '😀😁😂') return false;
  return true;
});

test('包含特殊 ASCII 字符的 Buffer', () => {
  const buf = Buffer.from('\n\r\t\0', 'ascii');
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 4) return false;
  if (json.data[0] !== 10) return false; // \n
  if (json.data[1] !== 13) return false; // \r
  if (json.data[2] !== 9) return false;  // \t
  if (json.data[3] !== 0) return false;  // \0
  return true;
});

test('从 latin1 编码创建的 Buffer', () => {
  const buf = Buffer.from('café', 'latin1');
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 4) return false;
  const rebuilt = Buffer.from(json.data);
  if (rebuilt.toString('latin1') !== 'café') return false;
  return true;
});

test('包含二进制数据的 Buffer', () => {
  const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG 文件头
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 4) return false;
  if (json.data[0] !== 0x89 || json.data[1] !== 0x50 || json.data[2] !== 0x4e || json.data[3] !== 0x47) return false;
  return true;
});

test('使用 fill 填充的 Buffer', () => {
  const buf = Buffer.alloc(10).fill(42);
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 10) return false;
  for (let i = 0; i < 10; i++) {
    if (json.data[i] !== 42) return false;
  }
  return true;
});

test('使用 fill 填充字符串的 Buffer', () => {
  const buf = Buffer.alloc(6).fill('ab');
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 6) return false;
  // 'ab' 重复填充: 'ababab'
  const expected = [97, 98, 97, 98, 97, 98];
  for (let i = 0; i < 6; i++) {
    if (json.data[i] !== expected[i]) return false;
  }
  return true;
});

test('concat 连接的 Buffer', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const buf3 = Buffer.from([5, 6]);
  const combined = Buffer.concat([buf1, buf2, buf3]);
  const json = combined.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 6) return false;
  for (let i = 0; i < 6; i++) {
    if (json.data[i] !== i + 1) return false;
  }
  return true;
});

test('长度为 10000 的 Buffer', () => {
  const buf = Buffer.alloc(10000);
  for (let i = 0; i < 10000; i++) {
    buf[i] = i % 256;
  }
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 10000) return false;
  // 抽样检查
  if (json.data[0] !== 0) return false;
  if (json.data[255] !== 255) return false;
  if (json.data[256] !== 0) return false;
  if (json.data[9999] !== (9999 % 256)) return false;
  return true;
});

test('从无效 UTF-8 序列创建的 Buffer', () => {
  const buf = Buffer.from([0xc3, 0x28]); // 无效的 UTF-8
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 2) return false;
  if (json.data[0] !== 0xc3 || json.data[1] !== 0x28) return false;
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
