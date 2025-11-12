// Buffer.allocUnsafe() - Combination Tests
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

// 组合场景测试
test('allocUnsafe与其他Buffer方法组合使用', () => {
  // 创建Buffer
  const buf = Buffer.allocUnsafe(20);

  // 使用各种Buffer方法
  buf.fill(65); // 填充'A'
  const str = buf.toString('utf8');
  const hex = buf.toString('hex');
  const base64 = buf.toString('base64');

  if (str !== 'AAAAAAAAAAAAAAAAAAAA') throw new Error(`String conversion failed`);
  if (hex !== '4141414141414141414141414141414141414141') throw new Error(`Hex conversion failed`);
  if (base64 !== 'QUFBQUFBQUFBQUFBQUFBQUFBQUE=') throw new Error(`Base64 conversion failed`);

  console.log('✅ allocUnsafe与其他Buffer方法组合使用');
  return true;
});

test('allocUnsafe与slice组合', () => {
  const buf = Buffer.allocUnsafe(10);

  // 填充数据
  for (let i = 0; i < buf.length; i++) {
    buf[i] = i + 10;
  }

  // 创建slice
  const slice1 = buf.slice(2, 8);
  const slice2 = buf.slice(0, 5);
  const slice3 = buf.slice(5);

  if (slice1.length !== 6) throw new Error(`Slice1 length mismatch`);
  if (slice2.length !== 5) throw new Error(`Slice2 length mismatch`);
  if (slice3.length !== 5) throw new Error(`Slice3 length mismatch`);

  // 验证slice数据
  for (let i = 0; i < slice1.length; i++) {
    if (slice1[i] !== (i + 2) + 10) {
      throw new Error(`Slice1 data mismatch at ${i}`);
    }
  }

  console.log('✅ allocUnsafe与slice组合');
  return true;
});

test('allocUnsafe与copy组合', () => {
  const source = Buffer.allocUnsafe(10);
  const target = Buffer.allocUnsafe(15);

  // 填充源数据
  for (let i = 0; i < source.length; i++) {
    source[i] = i + 20;
  }

  // 填充目标数据
  for (let i = 0; i < target.length; i++) {
    target[i] = 0;
  }

  // 执行copy
  const copied = source.copy(target, 2, 3, 8);

  if (copied !== 5) throw new Error(`Expected 5 bytes copied, got ${copied}`);

  // 验证copy结果
  for (let i = 0; i < 5; i++) {
    if (target[i + 2] !== source[i + 3]) {
      throw new Error(`Copy verification failed at ${i}`);
    }
  }

  console.log('✅ allocUnsafe与copy组合');
  return true;
});

test('allocUnsafe与concat组合', () => {
  const buf1 = Buffer.allocUnsafe(5);
  const buf2 = Buffer.allocUnsafe(5);
  const buf3 = Buffer.allocUnsafe(5);

  // 填充不同的数据
  buf1.fill(65); // 'A'
  buf2.fill(66); // 'B'
  buf3.fill(67); // 'C'

  // 连接Buffer
  const concatenated = Buffer.concat([buf1, buf2, buf3]);

  if (concatenated.length !== 15) throw new Error(`Concatenated length mismatch`);

  // 验证连接结果
  for (let i = 0; i < 5; i++) {
    if (concatenated[i] !== 65) throw new Error(`First part verification failed`);
    if (concatenated[i + 5] !== 66) throw new Error(`Second part verification failed`);
    if (concatenated[i + 10] !== 67) throw new Error(`Third part verification failed`);
  }

  console.log('✅ allocUnsafe与concat组合');
  return true;
});

test('allocUnsafe与数组操作组合', () => {
  const buf = Buffer.allocUnsafe(10);

  // 当作数组使用
  for (let i = 0; i < buf.length; i++) {
    buf[i] = (i * 3) % 256;
  }

  // 使用数组方法（通过展开操作符）
  const values = [...buf];
  const sum = values.reduce((a, b) => a + b, 0);
  const max = Math.max(...values);
  const min = Math.min(...values);

  if (values.length !== 10) throw new Error(`Array conversion failed`);
  if (sum === 0) throw new Error(`Sum calculation failed`);

  console.log('✅ allocUnsafe与数组操作组合');
  return true;
});

test('allocUnsafe与JSON操作组合', () => {
  const buf = Buffer.allocUnsafe(8);

  // 填充一些可预测的数据
  buf.writeUInt32BE(0x12345678, 0);
  buf.writeUInt32BE(0x9ABCDEF0, 4);

  // 转换为JSON
  const json = buf.toJSON();

  if (!json.type) throw new Error(`JSON type missing`);
  if (!json.data) throw new Error(`JSON data missing`);
  if (json.data.length !== 8) throw new Error(`JSON data length mismatch`);

  // 从JSON恢复
  const restored = Buffer.from(json);
  if (restored.length !== 8) throw new Error(`Restored buffer length mismatch`);

  // 验证数据
  if (restored.readUInt32BE(0) !== 0x12345678) throw new Error(`First uint32 mismatch`);
  if (restored.readUInt32BE(4) !== 0x9ABCDEF0) throw new Error(`Second uint32 mismatch`);

  console.log('✅ allocUnsafe与JSON操作组合');
  return true;
});

test('allocUnsafe与流操作组合', () => {
  // 简化测试，不依赖 stream 模块
  const buf = Buffer.allocUnsafe(16);
  buf.fill(88); // 'X'

  // 验证Buffer可以被用作数据源
  const data = [];
  for (let i = 0; i < buf.length; i++) {
    data.push(buf[i]);
  }

  // 验证数据完整性
  if (data.length !== 16) throw new Error(`Data length mismatch`);
  if (data.some(byte => byte !== 88)) throw new Error(`Data content mismatch`);

  // 验证可以从数据重建Buffer
  const reconstructed = Buffer.from(data);
  if (!reconstructed.equals(buf)) throw new Error(`Reconstructed buffer mismatch`);

  console.log('✅ allocUnsafe与流操作组合（基本验证）');
  return true;
});

test('allocUnsafe与类型数组交互', () => {
  const buf = Buffer.allocUnsafe(16);

  // 填充数据
  for (let i = 0; i < buf.length; i++) {
    buf[i] = i;
  }

  // 转换为类型数组
  const uint8Array = new Uint8Array(buf);
  const uint16Array = new Uint16Array(buf.buffer, buf.byteOffset, buf.length / 2);

  if (uint8Array.length !== 16) throw new Error(`Uint8Array length mismatch`);
  if (uint16Array.length !== 8) throw new Error(`Uint16Array length mismatch`);

  // 验证数据
  for (let i = 0; i < 8; i++) {
    if (uint16Array[i] !== (i * 2) + (i * 2 + 1) * 256) {
      throw new Error(`Uint16Array data mismatch at ${i}`);
    }
  }

  console.log('✅ allocUnsafe与类型数组交互');
  return true;
});

test('allocUnsafe错误处理组合', () => {
  const errorCases = [
    { input: -1, desc: '负数' },
    { input: NaN, desc: 'NaN' },
    { input: Infinity, desc: 'Infinity' },
    { input: 'invalid', desc: '无效字符串' },
    { input: {}, desc: '对象' }
  ];

  for (const testCase of errorCases) {
    try {
      Buffer.allocUnsafe(testCase.input);
      console.log(`❌ ${testCase.desc}应该抛出错误`);
      return false;
    } catch (error) {
      // 预期错误
    }
  }

  console.log('✅ allocUnsafe错误处理组合');
  return true;
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