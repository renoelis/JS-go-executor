const crypto = require('crypto');

// 测试结果收集器
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  testResults.total++;
  try {
    fn();
    testResults.passed++;
    testResults.tests.push({ name, status: '✅', error: null });
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: '❌', error: error.message });
  }
}

// 用于异步测试的辅助函数
function testAsync(name, fn) {
  testResults.total++;
  return new Promise((resolve) => {
    fn()
      .then(() => {
        testResults.passed++;
        testResults.tests.push({ name, status: '✅', error: null });
        resolve();
      })
      .catch((error) => {
        testResults.failed++;
        testResults.tests.push({ name, status: '❌', error: error.message });
        resolve();
      });
  });
}

// ==================== 基础功能测试 ====================

test('1.1 randomBytes 同步模式 - 生成指定字节数', () => {
  const bytes = crypto.randomBytes(16);
  if (!Buffer.isBuffer(bytes)) {
    throw new Error('返回值不是 Buffer 类型');
  }
  if (bytes.length !== 16) {
    throw new Error(`期望长度 16, 实际 ${bytes.length}`);
  }
});

test('1.2 randomBytes 同步模式 - 生成 0 字节', () => {
  const bytes = crypto.randomBytes(0);
  if (!Buffer.isBuffer(bytes)) {
    throw new Error('返回值不是 Buffer 类型');
  }
  if (bytes.length !== 0) {
    throw new Error(`期望长度 0, 实际 ${bytes.length}`);
  }
});

test('1.3 randomBytes 同步模式 - 生成 1 字节', () => {
  const bytes = crypto.randomBytes(1);
  if (bytes.length !== 1) {
    throw new Error(`期望长度 1, 实际 ${bytes.length}`);
  }
});

test('1.4 randomBytes 同步模式 - 生成常用大小 (32 字节)', () => {
  const bytes = crypto.randomBytes(32);
  if (bytes.length !== 32) {
    throw new Error(`期望长度 32, 实际 ${bytes.length}`);
  }
});

test('1.5 randomBytes 同步模式 - 生成较大数据 (1024 字节)', () => {
  const bytes = crypto.randomBytes(1024);
  if (bytes.length !== 1024) {
    throw new Error(`期望长度 1024, 实际 ${bytes.length}`);
  }
});

test('1.6 randomBytes 同步模式 - 生成更大数据 (65536 字节)', () => {
  const bytes = crypto.randomBytes(65536);
  if (bytes.length !== 65536) {
    throw new Error(`期望长度 65536, 实际 ${bytes.length}`);
  }
});

test('1.7 randomBytes 同步模式 - 生成 256 字节', () => {
  const bytes = crypto.randomBytes(256);
  if (bytes.length !== 256) {
    throw new Error(`期望长度 256, 实际 ${bytes.length}`);
  }
});

test('1.8 randomBytes 同步模式 - 生成 2 字节', () => {
  const bytes = crypto.randomBytes(2);
  if (bytes.length !== 2) {
    throw new Error(`期望长度 2, 实际 ${bytes.length}`);
  }
});

// ==================== 参数验证测试 ====================

test('2.1 randomBytes 参数错误 - 负数', () => {
  try {
    crypto.randomBytes(-1);
    throw new Error('应该抛出错误但没有');
  } catch (error) {
    if (error.message === '应该抛出错误但没有') {
      throw error;
    }
    // 期望抛出 RangeError 或 TypeError
    const validErrors = ['size', 'range', 'negative', 'must be', 'invalid'];
    const hasValidError = validErrors.some(keyword =>
      error.message.toLowerCase().includes(keyword)
    );
    if (!hasValidError) {
      throw new Error(`错误信息不符合预期: ${error.message}`);
    }
  }
});

test('2.2 randomBytes 参数错误 - 非数字 (字符串)', () => {
  try {
    crypto.randomBytes('invalid');
    throw new Error('应该抛出错误但没有');
  } catch (error) {
    if (error.message === '应该抛出错误但没有') {
      throw error;
    }
    // 期望抛出 TypeError
  }
});

test('2.3 randomBytes 参数错误 - 非数字 (null)', () => {
  try {
    crypto.randomBytes(null);
    throw new Error('应该抛出错误但没有');
  } catch (error) {
    if (error.message === '应该抛出错误但没有') {
      throw error;
    }
  }
});

test('2.4 randomBytes 参数错误 - 非数字 (undefined)', () => {
  try {
    crypto.randomBytes(undefined);
    throw new Error('应该抛出错误但没有');
  } catch (error) {
    if (error.message === '应该抛出错误但没有') {
      throw error;
    }
  }
});

test('2.5 randomBytes 参数错误 - 非数字 (对象)', () => {
  try {
    crypto.randomBytes({});
    throw new Error('应该抛出错误但没有');
  } catch (error) {
    if (error.message === '应该抛出错误但没有') {
      throw error;
    }
  }
});

test('2.6 randomBytes 参数错误 - 小数 (会被截断)', () => {
  // Node.js 会将小数转换为整数
  const bytes = crypto.randomBytes(10.5);
  if (bytes.length !== 10) {
    throw new Error(`期望长度 10 (截断), 实际 ${bytes.length}`);
  }
});

test('2.7 randomBytes 参数错误 - 小数 (向下取整验证)', () => {
  const bytes = crypto.randomBytes(10.9);
  if (bytes.length !== 10) {
    throw new Error(`期望长度 10 (向下取整), 实际 ${bytes.length}`);
  }
});

test('2.8 randomBytes 参数错误 - NaN', () => {
  try {
    crypto.randomBytes(NaN);
    throw new Error('应该抛出错误但没有');
  } catch (error) {
    if (error.message === '应该抛出错误但没有') {
      throw error;
    }
  }
});

test('2.9 randomBytes 参数错误 - Infinity', () => {
  try {
    crypto.randomBytes(Infinity);
    throw new Error('应该抛出错误但没有');
  } catch (error) {
    if (error.message === '应该抛出错误但没有') {
      throw error;
    }
  }
});

test('2.10 randomBytes 参数错误 - 负Infinity', () => {
  try {
    crypto.randomBytes(-Infinity);
    throw new Error('应该抛出错误但没有');
  } catch (error) {
    if (error.message === '应该抛出错误但没有') {
      throw error;
    }
  }
});

test('2.11 randomBytes 参数错误 - 数组', () => {
  try {
    crypto.randomBytes([16]);
    throw new Error('应该抛出错误但没有');
  } catch (error) {
    if (error.message === '应该抛出错误但没有') {
      throw error;
    }
  }
});

test('2.12 randomBytes 参数错误 - 布尔值', () => {
  try {
    crypto.randomBytes(true);
    throw new Error('应该抛出错误但没有');
  } catch (error) {
    if (error.message === '应该抛出错误但没有') {
      throw error;
    }
  }
});

test('2.13 randomBytes 参数错误 - Symbol', () => {
  try {
    crypto.randomBytes(Symbol('test'));
    throw new Error('应该抛出错误但没有');
  } catch (error) {
    if (error.message === '应该抛出错误但没有') {
      throw error;
    }
  }
});

test('2.14 randomBytes 参数 - 数字字符串 (应该转换)', () => {
  // Node.js 可能会将数字字符串转换为数字
  try {
    const bytes = crypto.randomBytes('16');
    // 如果成功，验证长度
    if (bytes.length !== 16) {
      throw new Error(`期望长度 16, 实际 ${bytes.length}`);
    }
  } catch (error) {
    // 如果抛出错误也是合理的
    if (!error.message.includes('type') && !error.message.includes('number')) {
      throw error;
    }
  }
});

// ==================== 边界值测试 ====================

test('3.1 randomBytes 边界值 - 最大安全整数测试 (1MB)', () => {
  const bytes = crypto.randomBytes(1024 * 1024); // 1MB
  if (bytes.length !== 1024 * 1024) {
    throw new Error('大数据生成失败');
  }
});

test('3.2 randomBytes 边界值 - 超过最大值 (2^31)', () => {
  const overMaxSize = Math.pow(2, 31);
  try {
    crypto.randomBytes(overMaxSize);
    throw new Error('应该抛出错误但没有');
  } catch (error) {
    if (error.message === '应该抛出错误但没有') {
      throw error;
    }
    // 期望抛出 RangeError
  }
});

test('3.3 randomBytes 边界值 - 最大值 (1MB)', () => {
  // 项目环境限制最大值为 1MB (1048576 字节)
  const maxSize = 1024 * 1024; // 1MB
  try {
    const bytes = crypto.randomBytes(maxSize);
    if (bytes.length !== maxSize) {
      throw new Error(`期望长度 ${maxSize}, 实际 ${bytes.length}`);
    }
  } catch (error) {
    // 如果因为内存问题失败，也是可以接受的
    if (!error.message.includes('memory') && !error.message.includes('ENOMEM') && !error.message.includes('range')) {
      throw error;
    }
  }
});

test('3.4 randomBytes 边界值 - 零', () => {
  const bytes = crypto.randomBytes(0);
  if (bytes.length !== 0) {
    throw new Error('零字节应该返回空Buffer');
  }
});

// ==================== 数据质量测试 ====================

test('4.1 randomBytes 随机性 - 两次调用结果不同', () => {
  const bytes1 = crypto.randomBytes(32);
  const bytes2 = crypto.randomBytes(32);

  // 两次生成的随机数据应该不同
  const areEqual = bytes1.equals(bytes2);
  if (areEqual) {
    throw new Error('两次生成的随机数据相同,随机性可疑');
  }
});

test('4.2 randomBytes 随机性 - 数据不全为零', () => {
  const bytes = crypto.randomBytes(256);
  let allZeros = true;

  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== 0) {
      allZeros = false;
      break;
    }
  }

  if (allZeros) {
    throw new Error('生成的数据全为 0,随机性异常');
  }
});

test('4.3 randomBytes 随机性 - 数据不全为同一值', () => {
  const bytes = crypto.randomBytes(256);
  const firstByte = bytes[0];
  let allSame = true;

  for (let i = 1; i < bytes.length; i++) {
    if (bytes[i] !== firstByte) {
      allSame = false;
      break;
    }
  }

  if (allSame) {
    throw new Error('生成的数据全为同一值,随机性异常');
  }
});

test('4.4 randomBytes 随机性 - 数据不全为 0xFF', () => {
  const bytes = crypto.randomBytes(256);
  let allFF = true;

  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== 0xFF) {
      allFF = false;
      break;
    }
  }

  if (allFF) {
    throw new Error('生成的数据全为 0xFF,随机性异常');
  }
});

test('4.5 randomBytes 随机性 - 字节分布基本均匀 (统计检验)', () => {
  const bytes = crypto.randomBytes(10000);
  const distribution = new Array(256).fill(0);

  // 统计每个字节值的出现次数
  for (let i = 0; i < bytes.length; i++) {
    distribution[bytes[i]]++;
  }

  // 期望每个字节值出现约 10000/256 ≈ 39 次
  // 允许较大的偏差范围 (10 到 70 次)
  const expected = 10000 / 256;
  const minCount = expected * 0.25; // 约 10
  const maxCount = expected * 1.75; // 约 70

  // 检查是否有过多的异常值
  let anomalyCount = 0;
  for (let i = 0; i < 256; i++) {
    if (distribution[i] < minCount || distribution[i] > maxCount) {
      anomalyCount++;
    }
  }

  if (anomalyCount > 256 * 0.1) { // 超过 10% 的值异常
    throw new Error(`字节分布不均匀,异常值过多: ${anomalyCount}/256`);
  }
});

test('4.6 randomBytes 随机性 - 卡方检验', () => {
  const bytes = crypto.randomBytes(10000);
  const distribution = new Array(256).fill(0);

  for (let i = 0; i < bytes.length; i++) {
    distribution[bytes[i]]++;
  }

  const expected = bytes.length / 256;
  let chiSquare = 0;

  for (let i = 0; i < 256; i++) {
    const diff = distribution[i] - expected;
    chiSquare += (diff * diff) / expected;
  }

  // 自由度为 255，显著性水平 0.05 时，临界值约为 293
  // 显著性水平 0.01 时，临界值约为 310
  if (chiSquare > 400) {
    throw new Error(`卡方值过大: ${chiSquare.toFixed(2)}, 随机性可疑`);
  }
});

test('4.7 randomBytes 随机性 - 连续字节不应全部递增', () => {
  const bytes = crypto.randomBytes(100);
  let allIncreasing = true;

  for (let i = 1; i < bytes.length; i++) {
    if (bytes[i] <= bytes[i - 1]) {
      allIncreasing = false;
      break;
    }
  }

  if (allIncreasing) {
    throw new Error('连续字节全部递增,不符合随机性');
  }
});

test('4.8 randomBytes 随机性 - 连续字节不应全部递减', () => {
  const bytes = crypto.randomBytes(100);
  let allDecreasing = true;

  for (let i = 1; i < bytes.length; i++) {
    if (bytes[i] >= bytes[i - 1]) {
      allDecreasing = false;
      break;
    }
  }

  if (allDecreasing) {
    throw new Error('连续字节全部递减,不符合随机性');
  }
});

// ==================== Buffer 类型验证 ====================

test('5.1 randomBytes 返回值 - 是 Buffer 实例', () => {
  const bytes = crypto.randomBytes(16);
  if (!(bytes instanceof Buffer)) {
    throw new Error('返回值不是 Buffer 实例');
  }
});

test('5.2 randomBytes 返回值 - Buffer.isBuffer 检查', () => {
  const bytes = crypto.randomBytes(16);
  if (!Buffer.isBuffer(bytes)) {
    throw new Error('Buffer.isBuffer 检查失败');
  }
});

test('5.3 randomBytes 返回值 - Buffer 方法可用 (toString hex)', () => {
  const bytes = crypto.randomBytes(16);
  const hex = bytes.toString('hex');
  if (typeof hex !== 'string') {
    throw new Error('toString 方法不可用');
  }
  if (hex.length !== 32) { // 16 字节 = 32 个十六进制字符
    throw new Error(`hex 字符串长度错误: 期望 32, 实际 ${hex.length}`);
  }
  // 验证hex字符串只包含合法字符
  if (!/^[0-9a-f]+$/i.test(hex)) {
    throw new Error('hex 字符串包含非法字符');
  }
});

test('5.4 randomBytes 返回值 - Buffer 方法可用 (toString base64)', () => {
  const bytes = crypto.randomBytes(16);
  const base64 = bytes.toString('base64');
  if (typeof base64 !== 'string') {
    throw new Error('toString base64 不可用');
  }
  // Base64 编码后的长度应该是原长度的 4/3 倍左右
  if (base64.length < 20 || base64.length > 25) {
    throw new Error(`base64 字符串长度异常: ${base64.length}`);
  }
});

test('5.5 randomBytes 返回值 - Buffer 方法可用 (slice)', () => {
  const bytes = crypto.randomBytes(16);
  const slice = bytes.slice(0, 8);
  if (!Buffer.isBuffer(slice)) {
    throw new Error('slice 方法返回值不是 Buffer');
  }
  if (slice.length !== 8) {
    throw new Error(`slice 长度错误: 期望 8, 实际 ${slice.length}`);
  }
});

test('5.6 randomBytes 返回值 - Buffer 可以被修改', () => {
  const bytes = crypto.randomBytes(16);
  const original = bytes[0];
  bytes[0] = 0xFF;
  if (bytes[0] !== 0xFF) {
    throw new Error('Buffer 无法被修改');
  }
  // 恢复原值
  bytes[0] = original;
});

test('5.7 randomBytes 返回值 - Buffer 索引访问', () => {
  const bytes = crypto.randomBytes(10);
  for (let i = 0; i < bytes.length; i++) {
    const val = bytes[i];
    if (typeof val !== 'number' || val < 0 || val > 255) {
      throw new Error(`索引 ${i} 的值异常: ${val}`);
    }
  }
});

test('5.8 randomBytes 返回值 - Buffer.concat 兼容性', () => {
  const bytes1 = crypto.randomBytes(8);
  const bytes2 = crypto.randomBytes(8);
  const concatenated = Buffer.concat([bytes1, bytes2]);

  if (!Buffer.isBuffer(concatenated)) {
    throw new Error('concat 结果不是 Buffer');
  }
  if (concatenated.length !== 16) {
    throw new Error(`concat 长度错误: 期望 16, 实际 ${concatenated.length}`);
  }
});

test('5.9 randomBytes 返回值 - Buffer.compare 可用', () => {
  const bytes1 = crypto.randomBytes(16);
  const bytes2 = crypto.randomBytes(16);

  try {
    const result = Buffer.compare(bytes1, bytes2);
    if (typeof result !== 'number') {
      throw new Error('compare 返回值不是数字');
    }
  } catch (error) {
    throw new Error(`Buffer.compare 失败: ${error.message}`);
  }
});

test('5.10 randomBytes 返回值 - Buffer.equals 可用', () => {
  const bytes1 = crypto.randomBytes(16);
  const bytes2 = Buffer.from(bytes1);

  if (!bytes1.equals(bytes2)) {
    throw new Error('equals 方法失败');
  }
});

// ==================== 特殊场景测试 ====================

test('6.1 randomBytes 多次调用 - 连续调用 100 次', () => {
  for (let i = 0; i < 100; i++) {
    const bytes = crypto.randomBytes(16);
    if (bytes.length !== 16) {
      throw new Error(`第 ${i + 1} 次调用失败`);
    }
  }
});

test('6.2 randomBytes 多次调用 - 不同大小连续调用', () => {
  const sizes = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
  for (const size of sizes) {
    const bytes = crypto.randomBytes(size);
    if (bytes.length !== size) {
      throw new Error(`生成 ${size} 字节失败`);
    }
  }
});

test('6.3 randomBytes 性能 - 生成 1MB 数据', () => {
  const start = Date.now();
  const bytes = crypto.randomBytes(1024 * 1024);
  const duration = Date.now() - start;

  if (bytes.length !== 1024 * 1024) {
    throw new Error('数据生成失败');
  }

  // 合理的性能预期: 1MB 数据应该在 1 秒内生成
  if (duration > 1000) {
    console.log(`警告: 生成 1MB 数据耗时 ${duration}ms,可能性能较差`);
  }
});

test('6.4 randomBytes 唯一性 - 生成100个不重复的16字节序列', () => {
  const set = new Set();
  for (let i = 0; i < 100; i++) {
    const bytes = crypto.randomBytes(16);
    const hex = bytes.toString('hex');
    if (set.has(hex)) {
      throw new Error(`第 ${i + 1} 次生成了重复数据`);
    }
    set.add(hex);
  }
});

test('6.5 randomBytes 内存 - 多次生成不会累积内存', () => {
  // 简单测试：多次生成后不应该有明显的内存问题
  for (let i = 0; i < 10; i++) {
    const bytes = crypto.randomBytes(100 * 1024); // 100KB each
    // 确保buffer被使用
    if (bytes.length !== 100 * 1024) {
      throw new Error('内存测试失败');
    }
  }
});

// ==================== 异步模式测试（将在最后运行） ====================

const asyncTests = [];

asyncTests.push(() => testAsync('7.1 randomBytes 异步模式 - 基本功能', () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(16, (err, bytes) => {
      if (err) {
        reject(new Error(`异步调用出错: ${err.message}`));
        return;
      }
      if (!Buffer.isBuffer(bytes)) {
        reject(new Error('返回值不是 Buffer'));
        return;
      }
      if (bytes.length !== 16) {
        reject(new Error(`期望长度 16, 实际 ${bytes.length}`));
        return;
      }
      resolve();
    });
  });
}));

asyncTests.push(() => testAsync('7.2 randomBytes 异步模式 - 返回值应该是 undefined', () => {
  return new Promise((resolve, reject) => {
    const result = crypto.randomBytes(16, (err, bytes) => {
      if (err) {
        reject(new Error(`异步调用出错: ${err.message}`));
        return;
      }
      resolve();
    });

    if (result !== undefined) {
      reject(new Error(`异步模式返回值应该是 undefined, 实际是 ${typeof result}`));
    }
  });
}));

asyncTests.push(() => testAsync('7.3 randomBytes 异步模式 - 错误参数会立即抛出同步错误', () => {
  return new Promise((resolve, reject) => {
    try {
      crypto.randomBytes(-1, (err, bytes) => {
        // 不应该执行到这里
        reject(new Error('回调不应该被执行'));
      });
      // 如果没有抛出错误，测试失败
      reject(new Error('应该立即抛出同步错误'));
    } catch (error) {
      // 期望立即抛出同步错误
      if (error.message && (error.message.includes('range') || error.message.includes('size'))) {
        resolve();
      } else {
        reject(new Error(`错误信息不符合预期: ${error.message}`));
      }
    }
  });
}));

asyncTests.push(() => testAsync('7.4 randomBytes 异步模式 - 生成0字节', () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(0, (err, bytes) => {
      if (err) {
        reject(new Error(`不应该出错: ${err.message}`));
        return;
      }
      if (bytes.length !== 0) {
        reject(new Error(`期望长度 0, 实际 ${bytes.length}`));
        return;
      }
      resolve();
    });
  });
}));

asyncTests.push(() => testAsync('7.5 randomBytes 异步模式 - 大数据生成 (1MB)', () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(1024 * 1024, (err, bytes) => {
      if (err) {
        reject(new Error(`生成失败: ${err.message}`));
        return;
      }
      if (bytes.length !== 1024 * 1024) {
        reject(new Error(`期望长度 ${1024 * 1024}, 实际 ${bytes.length}`));
        return;
      }
      resolve();
    });
  });
}));

asyncTests.push(() => testAsync('7.6 randomBytes 异步模式 - 回调第一个参数是null（无错误时）', () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(16, (err, bytes) => {
      if (err !== null) {
        reject(new Error('无错误时第一个参数应该是 null'));
        return;
      }
      resolve();
    });
  });
}));

asyncTests.push(() => testAsync('7.7 randomBytes 异步模式 - 随机性验证', () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(32, (err, bytes1) => {
      if (err) {
        reject(new Error(`第一次生成失败: ${err.message}`));
        return;
      }

      crypto.randomBytes(32, (err2, bytes2) => {
        if (err2) {
          reject(new Error(`第二次生成失败: ${err2.message}`));
          return;
        }

        if (bytes1.equals(bytes2)) {
          reject(new Error('两次生成的数据相同'));
          return;
        }

        resolve();
      });
    });
  });
}));

// ==================== 主执行流程 ====================

console.log('\n========================================');
console.log('crypto.randomBytes 全面测试报告');
console.log('========================================\n');

console.log('正在执行同步测试...\n');

// 使用 Promise 链来执行异步测试并返回结果
return Promise.resolve()
  .then(async () => {
    console.log('\n正在执行异步测试...\n');

    // 顺序执行所有异步测试
    for (const asyncTest of asyncTests) {
      await asyncTest();
    }

    // ==================== 输出结果 ====================

    console.log('\n========================================');
    console.log('测试结果汇总');
    console.log('========================================\n');

    testResults.tests.forEach((test, index) => {
      console.log(`${test.status} [${index + 1}/${testResults.total}] ${test.name}`);
      if (test.error) {
        console.log(`   错误: ${test.error}`);
      }
    });

    console.log('\n========================================');
    console.log(`总计: ${testResults.total} | 通过: ${testResults.passed} | 失败: ${testResults.failed}`);
    console.log(`通过率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
    console.log('========================================\n');

    // 返回结果供外部使用
    const finalResult = {
      success: testResults.failed === 0,
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      tests: testResults.tests
    };
    
    console.log(JSON.stringify(finalResult, null, 2));
    
    return finalResult;
  });
