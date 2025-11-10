// buf.toJSON() - Cross-combination and Comprehensive Tests
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

// 组合与综合测试
test('toJSON 与 Buffer.compare 配合使用', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const buf3 = Buffer.from([1, 2, 4]);

  if (Buffer.compare(buf1, buf2) !== 0) return false;
  if (Buffer.compare(buf1, buf3) >= 0) return false;

  const json1 = buf1.toJSON();
  const json2 = buf2.toJSON();

  // toJSON 返回的 data 应该相同
  if (JSON.stringify(json1.data) !== JSON.stringify(json2.data)) return false;

  return true;
});

test('toJSON 与 Buffer.equals 配合使用', () => {
  const buf1 = Buffer.from([10, 20, 30]);
  const buf2 = Buffer.from([10, 20, 30]);

  if (!buf1.equals(buf2)) return false;

  const json1 = buf1.toJSON();
  const json2 = buf2.toJSON();

  // 相等的 Buffer 应该有相同的 toJSON 结果
  if (JSON.stringify(json1) !== JSON.stringify(json2)) return false;

  return true;
});

test('修改 Buffer 后 toJSON 结果应该改变', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json1 = buf.toJSON();

  buf[1] = 99;
  const json2 = buf.toJSON();

  if (json1.data[1] === json2.data[1]) return false;
  if (json2.data[1] !== 99) return false;

  return true;
});

test('Buffer.concat 后的 toJSON', () => {
  const bufs = [];
  for (let i = 0; i < 10; i++) {
    bufs.push(Buffer.from([i]));
  }

  const combined = Buffer.concat(bufs);
  const json = combined.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 10) return false;

  for (let i = 0; i < 10; i++) {
    if (json.data[i] !== i) return false;
  }

  return true;
});

test('Buffer.concat 空数组', () => {
  const combined = Buffer.concat([]);
  const json = combined.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

test('包含 base64url 编码的 Buffer', () => {
  const str = 'test-data_123';
  const buf = Buffer.from(str, 'base64url');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (!Array.isArray(json.data)) return false;

  return true;
});

test('包含 ucs2 编码的 Buffer', () => {
  const str = 'Hello';
  const buf = Buffer.from(str, 'ucs2');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  // UCS-2 是 UTF-16LE 的别名,每个字符 2 字节
  if (json.data.length !== 10) return false;

  return true;
});

test('使用 Buffer.copyBytesFrom 创建的 Buffer', () => {
  const uint8 = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(uint8);
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 4) return false;
  if (json.data[0] !== 10 || json.data[1] !== 20 || json.data[2] !== 30 || json.data[3] !== 40) return false;

  // 修改原 Uint8Array 不应影响 Buffer
  uint8[0] = 99;
  const json2 = buf.toJSON();
  if (json2.data[0] !== 10) return false;

  return true;
});

test('使用 Buffer.copyBytesFrom 复制视图', () => {
  const arrayBuffer = new ArrayBuffer(10);
  const view = new Uint8Array(arrayBuffer, 2, 5);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  view[3] = 4;
  view[4] = 5;

  const buf = Buffer.copyBytesFrom(view);
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 5) return false;
  if (json.data[0] !== 1 || json.data[4] !== 5) return false;

  return true;
});

test('Buffer.isEncoding 验证后使用 toJSON', () => {
  if (!Buffer.isEncoding('utf8')) return false;
  if (!Buffer.isEncoding('hex')) return false;
  if (!Buffer.isEncoding('base64')) return false;

  const buf = Buffer.from('test', 'utf8');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 4) return false;

  return true;
});

test('toJSON 在 Map 中的 Buffer', () => {
  const map = new Map();
  map.set('buf1', Buffer.from([1, 2, 3]));
  map.set('buf2', Buffer.from([4, 5, 6]));

  const obj = {
    buffers: Array.from(map.values())
  };

  const str = JSON.stringify(obj);
  const parsed = JSON.parse(str);

  if (!Array.isArray(parsed.buffers)) return false;
  if (parsed.buffers.length !== 2) return false;
  if (parsed.buffers[0].type !== 'Buffer') return false;
  if (parsed.buffers[1].type !== 'Buffer') return false;

  return true;
});

test('toJSON 在 Set 中的 Buffer', () => {
  const set = new Set();
  set.add(Buffer.from([1, 2]));
  set.add(Buffer.from([3, 4]));

  const arr = Array.from(set);
  const str = JSON.stringify(arr);
  const parsed = JSON.parse(str);

  if (!Array.isArray(parsed)) return false;
  if (parsed.length !== 2) return false;
  if (parsed[0].type !== 'Buffer') return false;
  if (parsed[1].type !== 'Buffer') return false;

  return true;
});

test('Buffer.byteLength 与 toJSON data.length 一致性', () => {
  const testCases = [
    { str: 'hello', encoding: 'utf8' },
    { str: '你好', encoding: 'utf8' },
    { str: 'ABCD', encoding: 'hex' },
    { str: 'SGVsbG8=', encoding: 'base64' }
  ];

  for (const testCase of testCases) {
    const buf = Buffer.from(testCase.str, testCase.encoding);
    const json = buf.toJSON();

    if (buf.length !== json.data.length) return false;
    if (Buffer.byteLength(testCase.str, testCase.encoding) !== json.data.length) return false;
  }

  return true;
});

test('toJSON 与 buffer.entries() 的一致性', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const json = buf.toJSON();

  let index = 0;
  for (const [i, byte] of buf.entries()) {
    if (i !== index) return false;
    if (byte !== json.data[i]) return false;
    index++;
  }

  return true;
});

test('toJSON 与 buffer.values() 的一致性', () => {
  const buf = Buffer.from([5, 10, 15, 20]);
  const json = buf.toJSON();

  let index = 0;
  for (const byte of buf.values()) {
    if (byte !== json.data[index]) return false;
    index++;
  }

  return true;
});

test('toJSON 与 buffer.keys() 的一致性', () => {
  const buf = Buffer.from([100, 200, 50]);
  const json = buf.toJSON();

  const keys = Array.from(buf.keys());
  if (keys.length !== json.data.length) return false;

  for (let i = 0; i < keys.length; i++) {
    if (keys[i] !== i) return false;
  }

  return true;
});

test('toJSON 在 WeakMap 值中的 Buffer', () => {
  const wm = new WeakMap();
  const key = {};
  wm.set(key, Buffer.from([1, 2, 3]));

  const buf = wm.get(key);
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;

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
