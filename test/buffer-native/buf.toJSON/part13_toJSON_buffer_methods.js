// buf.toJSON() - Buffer.concat, Buffer.from Edge Cases, and Consistency Tests
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

// Buffer.concat 特殊情况
test('Buffer.concat 空数组', () => {
  const result = Buffer.concat([]);
  const json = result.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

test('Buffer.concat 只包含空 Buffer', () => {
  const result = Buffer.concat([Buffer.from([])]);
  const json = result.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

test('Buffer.concat 包含多个空 Buffer', () => {
  const result = Buffer.concat([Buffer.from([]), Buffer.from([]), Buffer.from([])]);
  const json = result.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

test('Buffer.concat 混合空和非空 Buffer', () => {
  const result = Buffer.concat([
    Buffer.from([]),
    Buffer.from([1, 2]),
    Buffer.from([]),
    Buffer.from([3, 4])
  ]);
  const json = result.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 4) return false;
  if (json.data[0] !== 1 || json.data[3] !== 4) return false;

  return true;
});

test('Buffer.concat 指定总长度小于实际长度', () => {
  const parts = [Buffer.from([1, 2, 3]), Buffer.from([4, 5, 6])];
  const result = Buffer.concat(parts, 4);
  const json = result.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 4) return false;
  if (json.data[0] !== 1 || json.data[3] !== 4) return false;

  return true;
});

test('Buffer.concat 指定总长度大于实际长度', () => {
  const parts = [Buffer.from([1, 2]), Buffer.from([3, 4])];
  const result = Buffer.concat(parts, 10);
  const json = result.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 10) return false;
  // 前 4 字节是数据
  if (json.data[0] !== 1 || json.data[3] !== 4) return false;
  // 后 6 字节应该是 0
  for (let i = 4; i < 10; i++) {
    if (json.data[i] !== 0) return false;
  }

  return true;
});

test('Buffer.concat 指定总长度为 0', () => {
  const parts = [Buffer.from([1, 2]), Buffer.from([3, 4])];
  const result = Buffer.concat(parts, 0);
  const json = result.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

// Buffer.from 特殊数组值
test('Buffer.from 数组包含超出 0-255 的值', () => {
  const result = Buffer.from([1, 2, 300, 400, 256]);
  const json = result.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 5) return false;
  // 值应该被截断为 8 位
  if (json.data[0] !== 1) return false;
  if (json.data[1] !== 2) return false;
  if (json.data[2] !== (300 & 0xFF)) return false; // 44
  if (json.data[3] !== (400 & 0xFF)) return false; // 144
  if (json.data[4] !== 0) return false; // 256 & 0xFF = 0

  return true;
});

test('Buffer.from 数组包含负数', () => {
  const result = Buffer.from([1, -1, -128, -256]);
  const json = result.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 4) return false;
  if (json.data[0] !== 1) return false;
  if (json.data[1] !== 255) return false; // -1 & 0xFF = 255
  if (json.data[2] !== 128) return false; // -128 & 0xFF = 128
  if (json.data[3] !== 0) return false;   // -256 & 0xFF = 0

  return true;
});

test('Buffer.from 数组包含 NaN', () => {
  const result = Buffer.from([1, NaN, 3]);
  const json = result.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 1) return false;
  if (json.data[1] !== 0) return false; // NaN -> 0
  if (json.data[2] !== 3) return false;

  return true;
});

test('Buffer.from 数组包含 Infinity', () => {
  const result = Buffer.from([1, Infinity, -Infinity, 4]);
  const json = result.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 4) return false;
  if (json.data[0] !== 1) return false;
  if (json.data[1] !== 0) return false; // Infinity -> 0
  if (json.data[2] !== 0) return false; // -Infinity -> 0
  if (json.data[3] !== 4) return false;

  return true;
});

test('Buffer.from 类数组对象', () => {
  const arrayLike = { 0: 10, 1: 20, 2: 30, length: 3 };
  const result = Buffer.from(arrayLike);
  const json = result.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 10 || json.data[1] !== 20 || json.data[2] !== 30) return false;

  return true;
});

test('Buffer.from 类数组对象长度不匹配', () => {
  const arrayLike = { 0: 10, 1: 20, 2: 30, 3: 40, length: 2 };
  const result = Buffer.from(arrayLike);
  const json = result.toJSON();

  if (json.type !== 'Buffer') return false;
  // 只取 length 指定的数量
  if (json.data.length !== 2) return false;
  if (json.data[0] !== 10 || json.data[1] !== 20) return false;

  return true;
});

// Buffer.of 测试
test('Buffer.of 创建 Buffer', () => {
  const result = Buffer.of(1, 2, 3, 4, 5);
  const json = result.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 5) return false;
  if (json.data[0] !== 1 || json.data[4] !== 5) return false;

  return true;
});

test('Buffer.of 无参数', () => {
  const result = Buffer.of();
  const json = result.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

test('Buffer.of 单个参数', () => {
  const result = Buffer.of(42);
  const json = result.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 1) return false;
  if (json.data[0] !== 42) return false;

  return true;
});

// toString 往返一致性
test('toString utf8 往返一致', () => {
  const original = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
  const str = original.toString('utf8');
  const back = Buffer.from(str, 'utf8');

  const json1 = original.toJSON();
  const json2 = back.toJSON();

  if (JSON.stringify(json1) !== JSON.stringify(json2)) return false;

  return true;
});

test('toString hex 往返一致', () => {
  const original = Buffer.from([0x12, 0x34, 0xab, 0xcd]);
  const str = original.toString('hex');
  const back = Buffer.from(str, 'hex');

  const json1 = original.toJSON();
  const json2 = back.toJSON();

  if (JSON.stringify(json1) !== JSON.stringify(json2)) return false;

  return true;
});

test('toString base64 往返一致', () => {
  const original = Buffer.from([100, 101, 102, 103, 104]);
  const str = original.toString('base64');
  const back = Buffer.from(str, 'base64');

  const json1 = original.toJSON();
  const json2 = back.toJSON();

  if (JSON.stringify(json1) !== JSON.stringify(json2)) return false;

  return true;
});

// Buffer.isBuffer 测试
test('Buffer.isBuffer 识别 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  if (!Buffer.isBuffer(buf)) return false;
  return true;
});

test('Buffer.isBuffer 不识别 toJSON 结果', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  if (Buffer.isBuffer(json)) return false;
  return true;
});

test('Buffer.isBuffer 不识别 data 数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  if (Buffer.isBuffer(json.data)) return false;
  return true;
});

// readUInt8 和 toJSON 一致性
test('readUInt8 与 toJSON data 一致', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const json = buf.toJSON();

  for (let i = 0; i < buf.length; i++) {
    if (buf.readUInt8(i) !== json.data[i]) return false;
  }

  return true;
});

test('索引访问与 toJSON data 一致', () => {
  const buf = Buffer.from([100, 101, 102, 103]);
  const json = buf.toJSON();

  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== json.data[i]) return false;
  }

  return true;
});

// instanceof 检查
test('Buffer instanceof 检查', () => {
  const buf = Buffer.from([1, 2, 3]);
  if (!(buf instanceof Buffer)) return false;
  if (!(buf instanceof Uint8Array)) return false;
  return true;
});

test('toJSON 返回值 instanceof 检查', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  if (!(json instanceof Object)) return false;
  if (json instanceof Buffer) return false;
  if (json instanceof Uint8Array) return false;
  if (!(json.data instanceof Array)) return false;

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
