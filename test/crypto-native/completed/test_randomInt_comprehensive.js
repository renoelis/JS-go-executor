const crypto = require('crypto');

/**
 * crypto.randomInt() 全量综合测试（查缺补漏版）
 * 
 * API签名:
 * - crypto.randomInt(max[, callback])
 * - crypto.randomInt(min, max[, callback])
 * 
 * 参数:
 * - min: 最小值（包含），默认为 0，必须是安全整数
 * - max: 最大值（不包含），必须是安全整数
 * - callback: 可选的回调函数 function(err, n)
 * 
 * 约束:
 * - min 和 max 必须是安全整数 (Number.MIN_SAFE_INTEGER 到 Number.MAX_SAFE_INTEGER)
 * - max - min 必须小于 2^48
 * - min < max
 * 
 * 返回值:
 * - 同步模式: 返回 min <= n < max 的随机整数
 * - 异步模式: 通过回调函数返回结果
 */

// 测试结果收集
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

// 测试辅助函数
function runTest(name, testFn) {
  testResults.total++;
  try {
    testFn();
    testResults.passed++;
    testResults.details.push({
      name,
      status: '✅',
      message: 'PASSED'
    });
    console.log(`✅ ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.details.push({
      name,
      status: '❌',
      message: error.message,
      stack: error.stack
    });
    console.error(`❌ ${name}`);
    console.error(`   错误: ${error.message}`);
  }
}

// 异步测试辅助函数
function runAsyncTest(name, testFn) {
  return new Promise((resolve) => {
    testResults.total++;
    testFn()
      .then(() => {
        testResults.passed++;
        testResults.details.push({
          name,
          status: '✅',
          message: 'PASSED'
        });
        console.log(`✅ ${name}`);
        resolve();
      })
      .catch((error) => {
        testResults.failed++;
        testResults.details.push({
          name,
          status: '❌',
          message: error.message,
          stack: error.stack
        });
        console.error(`❌ ${name}`);
        console.error(`   错误: ${error.message}`);
        resolve();
      });
  });
}

// 主测试函数
async function runAllTests() {
  // ============================================================================
  // 基本功能测试
  // ============================================================================

  console.log('\n=== 基本功能测试 ===\n');

  // 测试1: 同步调用 - 单参数 (0 到 max-1)
  runTest('同步调用 - randomInt(max)', () => {
    const max = 10;
    const n = crypto.randomInt(max);
    if (typeof n !== 'number') {
      throw new Error(`返回值应该是 number 类型，实际是 ${typeof n}`);
    }
    if (!Number.isInteger(n)) {
      throw new Error(`返回值应该是整数，实际是 ${n}`);
    }
    if (n < 0 || n >= max) {
      throw new Error(`返回值 ${n} 应该在 [0, ${max}) 范围内`);
    }
  });

  // 测试2: 同步调用 - 双参数 (min 到 max-1)
  runTest('同步调用 - randomInt(min, max)', () => {
    const min = 5;
    const max = 15;
    const n = crypto.randomInt(min, max);
    if (typeof n !== 'number') {
      throw new Error(`返回值应该是 number 类型，实际是 ${typeof n}`);
    }
    if (!Number.isInteger(n)) {
      throw new Error(`返回值应该是整数，实际是 ${n}`);
    }
    if (n < min || n >= max) {
      throw new Error(`返回值 ${n} 应该在 [${min}, ${max}) 范围内`);
    }
  });

  // 测试3: 边界值 - min = 0, max = 1
  runTest('边界值 - randomInt(0, 1) 只能返回 0', () => {
    const n = crypto.randomInt(0, 1);
    if (n !== 0) {
      throw new Error(`randomInt(0, 1) 应该只返回 0，实际返回 ${n}`);
    }
  });

  // 测试4: 边界值 - max = 1
  runTest('边界值 - randomInt(1) 只能返回 0', () => {
    const n = crypto.randomInt(1);
    if (n !== 0) {
      throw new Error(`randomInt(1) 应该只返回 0，实际返回 ${n}`);
    }
  });

  // 测试5: 大范围值
  runTest('大范围值 - randomInt(0, 1000000)', () => {
    const max = 1000000;
    const n = crypto.randomInt(max);
    if (n < 0 || n >= max) {
      throw new Error(`返回值 ${n} 应该在 [0, ${max}) 范围内`);
    }
  });

  // 测试6: 负数范围
  runTest('负数范围 - randomInt(-100, -50)', () => {
    const min = -100;
    const max = -50;
    const n = crypto.randomInt(min, max);
    if (n < min || n >= max) {
      throw new Error(`返回值 ${n} 应该在 [${min}, ${max}) 范围内`);
    }
  });

  // 测试7: 跨越零的范围
  runTest('跨越零的范围 - randomInt(-50, 50)', () => {
    const min = -50;
    const max = 50;
    const n = crypto.randomInt(min, max);
    if (n < min || n >= max) {
      throw new Error(`返回值 ${n} 应该在 [${min}, ${max}) 范围内`);
    }
  });

  // ============================================================================
  // 新增：特殊边界组合测试
  // ============================================================================

  console.log('\n=== 特殊边界组合测试 ===\n');

  // 测试8: randomInt(-1, 0) 只能返回 -1
  runTest('边界 - randomInt(-1, 0) 只能返回 -1', () => {
    const n = crypto.randomInt(-1, 0);
    if (n !== -1) {
      throw new Error(`randomInt(-1, 0) 应该只返回 -1，实际返回 ${n}`);
    }
  });

  // 测试9: randomInt(-2, -1) 只能返回 -2
  runTest('边界 - randomInt(-2, -1) 只能返回 -2', () => {
    const n = crypto.randomInt(-2, -1);
    if (n !== -2) {
      throw new Error(`randomInt(-2, -1) 应该只返回 -2，实际返回 ${n}`);
    }
  });

  // 测试10: randomInt(0, 2) 只能返回 0 或 1
  runTest('边界 - randomInt(0, 2) 只能返回 0 或 1', () => {
    const results = new Set();
    for (let i = 0; i < 100; i++) {
      const n = crypto.randomInt(0, 2);
      if (n !== 0 && n !== 1) {
        throw new Error(`randomInt(0, 2) 返回了 ${n}，应该只返回 0 或 1`);
      }
      results.add(n);
    }
    // 应该能生成 0 和 1
    if (results.size < 2) {
      console.warn('   警告: 100次调用未能同时生成0和1');
    }
  });

  // 测试11: 最大安全整数作为 max
  runTest('边界 - randomInt(Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER)', () => {
    const n = crypto.randomInt(Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER);
    if (n !== Number.MAX_SAFE_INTEGER - 1) {
      throw new Error(`应该返回 ${Number.MAX_SAFE_INTEGER - 1}，实际返回 ${n}`);
    }
  });

  // 测试12: 最小安全整数作为 min
  runTest('边界 - randomInt(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER + 1)', () => {
    const n = crypto.randomInt(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER + 1);
    if (n !== Number.MIN_SAFE_INTEGER) {
      throw new Error(`应该返回 ${Number.MIN_SAFE_INTEGER}，实际返回 ${n}`);
    }
  });

  // 测试13: 从 0 开始的小范围
  runTest('边界 - randomInt(0, 3) 验证所有可能值', () => {
    const results = new Set();
    for (let i = 0; i < 300; i++) {
      const n = crypto.randomInt(0, 3);
      if (n < 0 || n >= 3) {
        throw new Error(`randomInt(0, 3) 返回了 ${n}，应该在 [0, 3) 范围内`);
      }
      results.add(n);
    }
    // 应该能生成 0, 1, 2
    if (results.size < 3) {
      console.warn(`   警告: 300次调用只生成了 ${results.size} 个不同值: ${[...results].join(', ')}`);
    }
  });

  // ============================================================================
  // 新增：特殊数值测试
  // ============================================================================

  console.log('\n=== 特殊数值测试 ===\n');

  // 测试14: -0 作为参数
  runTest('特殊值 - randomInt(-0, 5)', () => {
    const n = crypto.randomInt(-0, 5);
    if (n < 0 || n >= 5) {
      throw new Error(`返回值 ${n} 应该在 [0, 5) 范围内`);
    }
  });

  // 测试15: 10.0（整数的浮点表示）
  runTest('特殊值 - randomInt(10.0) 应该正常工作', () => {
    const n = crypto.randomInt(10.0);
    if (n < 0 || n >= 10) {
      throw new Error(`返回值 ${n} 应该在 [0, 10) 范围内`);
    }
  });

  // 测试16: 科学计数法 - 1e6
  runTest('特殊值 - randomInt(1e6) 科学计数法', () => {
    const max = 1e6;
    const n = crypto.randomInt(max);
    if (n < 0 || n >= max) {
      throw new Error(`返回值 ${n} 应该在 [0, ${max}) 范围内`);
    }
  });

  // 测试17: 科学计数法 - 1e3
  runTest('特殊值 - randomInt(1e3, 1e4)', () => {
    const min = 1e3;
    const max = 1e4;
    const n = crypto.randomInt(min, max);
    if (n < min || n >= max) {
      throw new Error(`返回值 ${n} 应该在 [${min}, ${max}) 范围内`);
    }
  });

  // 测试18: 非常接近但不是整数的浮点数
  runTest('错误 - 非整数浮点数 10.000000001', () => {
    try {
      crypto.randomInt(10.000000001);
      throw new Error('应该抛出错误');
    } catch (error) {
      if (error.name !== 'RangeError' && error.name !== 'TypeError') {
        throw new Error(`应该抛出 RangeError 或 TypeError，实际抛出 ${error.name}`);
      }
    }
  });

  // ============================================================================
  // 异步回调测试
  // ============================================================================

  console.log('\n=== 异步回调测试 ===\n');

  const asyncTests = [];

  // 测试19: 异步调用 - 单参数
  asyncTests.push(runAsyncTest('异步调用 - randomInt(max, callback)', () => {
    return new Promise((resolve, reject) => {
      const max = 10;
      crypto.randomInt(max, (err, n) => {
        if (err) return reject(err);
        if (typeof n !== 'number') {
          return reject(new Error(`返回值应该是 number 类型，实际是 ${typeof n}`));
        }
        if (!Number.isInteger(n)) {
          return reject(new Error(`返回值应该是整数，实际是 ${n}`));
        }
        if (n < 0 || n >= max) {
          return reject(new Error(`返回值 ${n} 应该在 [0, ${max}) 范围内`));
        }
        resolve();
      });
    });
  }));

  // 测试20: 异步调用 - 双参数
  asyncTests.push(runAsyncTest('异步调用 - randomInt(min, max, callback)', () => {
    return new Promise((resolve, reject) => {
      const min = 5;
      const max = 15;
      crypto.randomInt(min, max, (err, n) => {
        if (err) return reject(err);
        if (typeof n !== 'number') {
          return reject(new Error(`返回值应该是 number 类型，实际是 ${typeof n}`));
        }
        if (!Number.isInteger(n)) {
          return reject(new Error(`返回值应该是整数，实际是 ${n}`));
        }
        if (n < min || n >= max) {
          return reject(new Error(`返回值 ${n} 应该在 [${min}, ${max}) 范围内`));
        }
        resolve();
      });
    });
  }));

  // 测试21: 异步调用 - 负数范围
  asyncTests.push(runAsyncTest('异步调用 - randomInt(-100, -50, callback)', () => {
    return new Promise((resolve, reject) => {
      const min = -100;
      const max = -50;
      crypto.randomInt(min, max, (err, n) => {
        if (err) return reject(err);
        if (n < min || n >= max) {
          return reject(new Error(`返回值 ${n} 应该在 [${min}, ${max}) 范围内`));
        }
        resolve();
      });
    });
  }));

  // 测试22: 异步调用 - 边界值
  asyncTests.push(runAsyncTest('异步调用 - randomInt(0, 1, callback)', () => {
    return new Promise((resolve, reject) => {
      crypto.randomInt(0, 1, (err, n) => {
        if (err) return reject(err);
        if (n !== 0) {
          return reject(new Error(`应该返回 0，实际返回 ${n}`));
        }
        resolve();
      });
    });
  }));

  // 测试23: 异步调用 - 多个并发调用
  asyncTests.push(runAsyncTest('异步调用 - 并发多个调用', () => {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(new Promise((resolve, reject) => {
        crypto.randomInt(100, (err, n) => {
          if (err) return reject(err);
          if (n < 0 || n >= 100) {
            return reject(new Error(`返回值 ${n} 超出范围`));
          }
          resolve(n);
        });
      }));
    }
    return Promise.all(promises);
  }));

  // ============================================================================
  // 新增：回调函数特殊测试
  // ============================================================================

  console.log('\n=== 回调函数特殊测试 ===\n');

  // 等待前面的异步测试完成
  await Promise.all(asyncTests);

  // 测试24: 回调函数不应该影响同步返回（无返回值）
  runTest('回调 - 异步调用无返回值', () => {
    const result = crypto.randomInt(10, (err, n) => {
      // 异步回调
    });
    if (result !== undefined) {
      throw new Error(`异步调用应该返回 undefined，实际返回 ${result}`);
    }
  });

  // ============================================================================
  // 错误处理测试
  // ============================================================================

  console.log('\n=== 错误处理测试 ===\n');

  // 测试25: min >= max
  runTest('错误 - min 等于 max', () => {
    try {
      crypto.randomInt(5, 5);
      throw new Error('应该抛出 RangeError');
    } catch (error) {
      if (error.name !== 'RangeError' && error.code !== 'ERR_OUT_OF_RANGE') {
        throw new Error(`应该抛出 RangeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试26: min > max
  runTest('错误 - min 大于 max', () => {
    try {
      crypto.randomInt(10, 5);
      throw new Error('应该抛出 RangeError');
    } catch (error) {
      if (error.name !== 'RangeError' && error.code !== 'ERR_OUT_OF_RANGE') {
        throw new Error(`应该抛出 RangeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试27: max 为 0
  runTest('错误 - max 为 0', () => {
    try {
      crypto.randomInt(0);
      throw new Error('应该抛出 RangeError');
    } catch (error) {
      if (error.name !== 'RangeError' && error.code !== 'ERR_OUT_OF_RANGE') {
        throw new Error(`应该抛出 RangeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试28: 负数 max (单参数)
  runTest('错误 - 负数 max (单参数)', () => {
    try {
      crypto.randomInt(-5);
      throw new Error('应该抛出 RangeError');
    } catch (error) {
      if (error.name !== 'RangeError' && error.code !== 'ERR_OUT_OF_RANGE') {
        throw new Error(`应该抛出 RangeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试29: 非整数参数 - 小数
  runTest('错误 - 非整数参数 (小数)', () => {
    try {
      crypto.randomInt(1.5, 10.5);
      throw new Error('应该抛出 RangeError 或 TypeError');
    } catch (error) {
      if (error.name !== 'RangeError' && error.name !== 'TypeError') {
        throw new Error(`应该抛出 RangeError 或 TypeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试30: 非数字参数 - 字符串
  runTest('错误 - 非数字参数 (字符串)', () => {
    try {
      crypto.randomInt('10');
      throw new Error('应该抛出 TypeError');
    } catch (error) {
      if (error.name !== 'TypeError' && error.code !== 'ERR_INVALID_ARG_TYPE') {
        throw new Error(`应该抛出 TypeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试31: 非数字参数 - null
  runTest('错误 - 非数字参数 (null)', () => {
    try {
      crypto.randomInt(null);
      throw new Error('应该抛出 TypeError');
    } catch (error) {
      if (error.name !== 'TypeError' && error.code !== 'ERR_INVALID_ARG_TYPE') {
        throw new Error(`应该抛出 TypeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试32: 非数字参数 - undefined (作为 min)
  runTest('错误 - 非数字参数 (undefined 作为 min)', () => {
    try {
      crypto.randomInt(undefined, 10);
      throw new Error('应该抛出 TypeError');
    } catch (error) {
      if (error.name !== 'TypeError' && error.code !== 'ERR_INVALID_ARG_TYPE') {
        throw new Error(`应该抛出 TypeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试33: 非数字参数 - 对象
  runTest('错误 - 非数字参数 (对象)', () => {
    try {
      crypto.randomInt({});
      throw new Error('应该抛出 TypeError');
    } catch (error) {
      if (error.name !== 'TypeError' && error.code !== 'ERR_INVALID_ARG_TYPE') {
        throw new Error(`应该抛出 TypeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试34: NaN 参数
  runTest('错误 - NaN 参数', () => {
    try {
      crypto.randomInt(NaN);
      throw new Error('应该抛出 RangeError 或 TypeError');
    } catch (error) {
      if (error.name !== 'RangeError' && error.name !== 'TypeError') {
        throw new Error(`应该抛出 RangeError 或 TypeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试35: Infinity 参数
  runTest('错误 - Infinity 参数', () => {
    try {
      crypto.randomInt(Infinity);
      throw new Error('应该抛出 TypeError');
    } catch (error) {
      if (error.name !== 'TypeError' && error.code !== 'ERR_INVALID_ARG_TYPE') {
        throw new Error(`应该抛出 TypeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试36: -Infinity 参数
  runTest('错误 - -Infinity 参数', () => {
    try {
      crypto.randomInt(-Infinity, 10);
      throw new Error('应该抛出 TypeError');
    } catch (error) {
      if (error.name !== 'TypeError' && error.code !== 'ERR_INVALID_ARG_TYPE') {
        throw new Error(`应该抛出 TypeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试37: 无效回调函数 - 非函数
  runTest('错误 - 无效回调函数 (非函数)', () => {
    try {
      crypto.randomInt(10, 'not a function');
      throw new Error('应该抛出 TypeError');
    } catch (error) {
      if (error.name !== 'TypeError' && error.code !== 'ERR_INVALID_ARG_TYPE') {
        throw new Error(`应该抛出 TypeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试38: 无效回调函数 - 数字
  runTest('错误 - 无效回调函数 (数字)', () => {
    try {
      crypto.randomInt(5, 10, 123);
      throw new Error('应该抛出 TypeError');
    } catch (error) {
      if (error.name !== 'TypeError' && error.code !== 'ERR_INVALID_ARG_TYPE') {
        throw new Error(`应该抛出 TypeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // ============================================================================
  // 新增：更多类型强制转换测试
  // ============================================================================

  console.log('\n=== 类型强制转换测试 ===\n');

  // 测试39: 布尔值 true
  runTest('错误 - 布尔值 true', () => {
    try {
      crypto.randomInt(true);
      throw new Error('应该抛出 TypeError');
    } catch (error) {
      if (error.name !== 'TypeError') {
        throw new Error(`应该抛出 TypeError，实际抛出 ${error.name}`);
      }
    }
  });

  // 测试40: 布尔值 false
  runTest('错误 - 布尔值 false', () => {
    try {
      crypto.randomInt(false, 10);
      throw new Error('应该抛出 TypeError');
    } catch (error) {
      if (error.name !== 'TypeError') {
        throw new Error(`应该抛出 TypeError，实际抛出 ${error.name}`);
      }
    }
  });

  // 测试41: 数组
  runTest('错误 - 数组 [10]', () => {
    try {
      crypto.randomInt([10]);
      throw new Error('应该抛出 TypeError');
    } catch (error) {
      if (error.name !== 'TypeError') {
        throw new Error(`应该抛出 TypeError，实际抛出 ${error.name}`);
      }
    }
  });

  // 测试42: 对象带 valueOf
  runTest('错误 - 对象带 valueOf 方法', () => {
    try {
      const obj = { valueOf: () => 10 };
      crypto.randomInt(obj);
      throw new Error('应该抛出 TypeError');
    } catch (error) {
      if (error.name !== 'TypeError') {
        throw new Error(`应该抛出 TypeError，实际抛出 ${error.name}`);
      }
    }
  });

  // 测试43: Symbol
  runTest('错误 - Symbol', () => {
    try {
      crypto.randomInt(Symbol('10'));
      throw new Error('应该抛出 TypeError');
    } catch (error) {
      if (error.name !== 'TypeError') {
        throw new Error(`应该抛出 TypeError，实际抛出 ${error.name}`);
      }
    }
  });

  // 测试44: BigInt
  runTest('错误 - BigInt', () => {
    try {
      crypto.randomInt(10n);
      throw new Error('应该抛出 TypeError');
    } catch (error) {
      if (error.name !== 'TypeError') {
        throw new Error(`应该抛出 TypeError，实际抛出 ${error.name}`);
      }
    }
  });

  // ============================================================================
  // 安全整数边界测试
  // ============================================================================

  console.log('\n=== 安全整数边界测试 ===\n');

  // 测试45: 2^48 限制内的最大值
  runTest('安全整数 - max 为 2^48 - 1', () => {
    const max = Math.pow(2, 48) - 1;
    const n = crypto.randomInt(max);
    if (n < 0 || n >= max) {
      throw new Error(`返回值 ${n} 应该在 [0, ${max}) 范围内`);
    }
  });

  // 测试46: 负数范围在 2^48 限制内
  runTest('安全整数 - 负数范围在限制内', () => {
    const min = -1000000;
    const max = 0;
    const n = crypto.randomInt(min, max);
    if (n < min || n >= max) {
      throw new Error(`返回值 ${n} 应该在 [${min}, ${max}) 范围内`);
    }
  });

  // 测试47: 超出安全整数 - max 过大
  runTest('错误 - max 超出安全整数', () => {
    try {
      crypto.randomInt(Number.MAX_SAFE_INTEGER + 1);
      throw new Error('应该抛出 TypeError');
    } catch (error) {
      if (error.name !== 'TypeError' && error.code !== 'ERR_INVALID_ARG_TYPE') {
        throw new Error(`应该抛出 TypeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试48: 超出安全整数 - min 过小
  runTest('错误 - min 超出安全整数', () => {
    try {
      crypto.randomInt(Number.MIN_SAFE_INTEGER - 1, 0);
      throw new Error('应该抛出 TypeError');
    } catch (error) {
      if (error.name !== 'TypeError' && error.code !== 'ERR_INVALID_ARG_TYPE') {
        throw new Error(`应该抛出 TypeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试49: MAX_SAFE_INTEGER 作为 min 和 max
  runTest('边界 - MAX_SAFE_INTEGER 范围', () => {
    const max = Number.MAX_SAFE_INTEGER;
    const min = max - 10;
    const n = crypto.randomInt(min, max);
    if (n < min || n >= max) {
      throw new Error(`返回值 ${n} 应该在 [${min}, ${max}) 范围内`);
    }
  });

  // 测试50: MIN_SAFE_INTEGER 作为 min
  runTest('边界 - MIN_SAFE_INTEGER 范围', () => {
    const min = Number.MIN_SAFE_INTEGER;
    const max = min + 10;
    const n = crypto.randomInt(min, max);
    if (n < min || n >= max) {
      throw new Error(`返回值 ${n} 应该在 [${min}, ${max}) 范围内`);
    }
  });

  // ============================================================================
  // 2^48 范围限制测试
  // ============================================================================

  console.log('\n=== 2^48 范围限制测试 ===\n');

  // 测试51: 范围恰好等于 2^48
  runTest('边界 - 范围恰好等于 2^48', () => {
    try {
      const range = Math.pow(2, 48);
      crypto.randomInt(0, range);
      throw new Error('应该抛出 RangeError');
    } catch (error) {
      if (error.name !== 'RangeError') {
        throw new Error(`应该抛出 RangeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试52: 范围略小于 2^48
  runTest('边界 - 范围略小于 2^48', () => {
    const range = Math.pow(2, 48) - 1;
    const n = crypto.randomInt(0, range);
    if (n < 0 || n >= range) {
      throw new Error(`返回值 ${n} 应该在 [0, ${range}) 范围内`);
    }
  });

  // 测试53: 范围超过 2^48
  runTest('错误 - 范围超过 2^48', () => {
    try {
      const range = Math.pow(2, 48) + 100;
      crypto.randomInt(0, range);
      throw new Error('应该抛出 RangeError');
    } catch (error) {
      if (error.name !== 'RangeError') {
        throw new Error(`应该抛出 RangeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试54: 负数范围超过 2^48
  runTest('错误 - 负数范围超过 2^48', () => {
    try {
      const range = Math.pow(2, 48);
      crypto.randomInt(-range, 1);
      throw new Error('应该抛出 RangeError');
    } catch (error) {
      if (error.name !== 'RangeError') {
        throw new Error(`应该抛出 RangeError，实际抛出 ${error.name}: ${error.message}`);
      }
    }
  });

  // 测试55: 精确的 2^48 - 1 范围
  runTest('边界 - 范围为 2^48 - 1（max - min）', () => {
    const min = 0;
    const max = Math.pow(2, 48) - 1;
    const n = crypto.randomInt(min, max);
    if (n < min || n >= max) {
      throw new Error(`返回值 ${n} 应该在 [${min}, ${max}) 范围内`);
    }
  });

  // 测试56: 负数到正数跨度接近 2^48
  runTest('边界 - 负数到正数跨度接近 2^48', () => {
    const range = Math.pow(2, 48) - 1;
    const min = -Math.floor(range / 2);
    const max = Math.ceil(range / 2);
    const n = crypto.randomInt(min, max);
    if (n < min || n >= max) {
      throw new Error(`返回值 ${n} 应该在 [${min}, ${max}) 范围内`);
    }
  });

  // ============================================================================
  // 随机性和分布测试
  // ============================================================================

  console.log('\n=== 随机性和分布测试 ===\n');

  // 测试57: 小范围均匀分布 (0-9)
  runTest('分布 - 小范围均匀分布 (0-9)', () => {
    const min = 0;
    const max = 10;
    const iterations = 100000;
    const counts = new Array(max - min).fill(0);
    
    for (let i = 0; i < iterations; i++) {
      const n = crypto.randomInt(min, max);
      counts[n - min]++;
    }
    
    const expected = iterations / (max - min);
    const tolerance = expected * 0.1; // 10% 容差
    
    for (let i = 0; i < counts.length; i++) {
      const diff = Math.abs(counts[i] - expected);
      if (diff > tolerance) {
        throw new Error(
          `数字 ${i + min} 的分布不均匀: 出现 ${counts[i]} 次，预期约 ${expected} 次 (±${tolerance.toFixed(0)})`
        );
      }
    }
  });

  // 测试58: 中等范围均匀分布 (1-100)
  runTest('分布 - 中等范围均匀分布 (1-100)', () => {
    const min = 1;
    const max = 101;
    const iterations = 100000;
    const buckets = 10; // 分成10个桶
    const bucketSize = (max - min) / buckets;
    const counts = new Array(buckets).fill(0);
    
    for (let i = 0; i < iterations; i++) {
      const n = crypto.randomInt(min, max);
      const bucket = Math.floor((n - min) / bucketSize);
      counts[Math.min(bucket, buckets - 1)]++;
    }
    
    const expected = iterations / buckets;
    const tolerance = expected * 0.1; // 10% 容差
    
    for (let i = 0; i < counts.length; i++) {
      const diff = Math.abs(counts[i] - expected);
      if (diff > tolerance) {
        throw new Error(
          `桶 ${i} 的分布不均匀: 出现 ${counts[i]} 次，预期约 ${expected} 次 (±${tolerance.toFixed(0)})`
        );
      }
    }
  });

  // 测试59: 负数范围均匀分布
  runTest('分布 - 负数范围均匀分布 (-50 到 -41)', () => {
    const min = -50;
    const max = -40;
    const iterations = 100000;
    const counts = new Array(max - min).fill(0);
    
    for (let i = 0; i < iterations; i++) {
      const n = crypto.randomInt(min, max);
      counts[n - min]++;
    }
    
    const expected = iterations / (max - min);
    const tolerance = expected * 0.1; // 10% 容差
    
    for (let i = 0; i < counts.length; i++) {
      const diff = Math.abs(counts[i] - expected);
      if (diff > tolerance) {
        throw new Error(
          `数字 ${i + min} 的分布不均匀: 出现 ${counts[i]} 次，预期约 ${expected} 次 (±${tolerance.toFixed(0)})`
        );
      }
    }
  });

  // 测试60: 连续调用产生不同结果
  runTest('随机性 - 连续调用产生不同结果', () => {
    const max = 1000000;
    const samples = 100;
    const results = new Set();
    
    for (let i = 0; i < samples; i++) {
      results.add(crypto.randomInt(max));
    }
    
    // 期望至少有95%的唯一值（在大范围内）
    const uniqueRatio = results.size / samples;
    if (uniqueRatio < 0.95) {
      throw new Error(
        `随机性不足: ${samples} 次调用中只有 ${results.size} 个唯一值 (${(uniqueRatio * 100).toFixed(1)}%)`
      );
    }
  });

  // 测试61: 避免模偏差 - 非2的幂次范围
  runTest('分布 - 避免模偏差 (非2的幂次范围)', () => {
    const min = 0;
    const max = 7; // 非2的幂次
    const iterations = 70000;
    const counts = new Array(max - min).fill(0);
    
    for (let i = 0; i < iterations; i++) {
      const n = crypto.randomInt(min, max);
      counts[n - min]++;
    }
    
    const expected = iterations / (max - min);
    const tolerance = expected * 0.1; // 10% 容差
    
    for (let i = 0; i < counts.length; i++) {
      const diff = Math.abs(counts[i] - expected);
      if (diff > tolerance) {
        throw new Error(
          `数字 ${i + min} 的分布不均匀（可能存在模偏差）: 出现 ${counts[i]} 次，预期约 ${expected} 次 (±${tolerance.toFixed(0)})`
        );
      }
    }
  });

  // 测试62: 二元范围均匀分布 (0-1)
  runTest('分布 - 二元范围均匀分布 (0-1)', () => {
    const iterations = 100000;
    let count0 = 0;
    let count1 = 0;
    
    for (let i = 0; i < iterations; i++) {
      const n = crypto.randomInt(2);
      if (n === 0) count0++;
      else if (n === 1) count1++;
      else throw new Error(`randomInt(2) 返回了 ${n}，应该只返回 0 或 1`);
    }
    
    const expected = iterations / 2;
    const tolerance = expected * 0.02; // 2% 容差（更严格）
    
    if (Math.abs(count0 - expected) > tolerance) {
      throw new Error(
        `0 的分布不均匀: 出现 ${count0} 次，预期约 ${expected} 次 (±${tolerance.toFixed(0)})`
      );
    }
    
    if (Math.abs(count1 - expected) > tolerance) {
      throw new Error(
        `1 的分布不均匀: 出现 ${count1} 次，预期约 ${expected} 次 (±${tolerance.toFixed(0)})`
      );
    }
  });

  // ============================================================================
  // 特殊场景测试
  // ============================================================================

  console.log('\n=== 特殊场景测试 ===\n');

  // 测试63: 连续大量调用性能
  runTest('性能 - 连续大量调用 (100000次)', () => {
    const startTime = Date.now();
    const iterations = 100000;
    
    for (let i = 0; i < iterations; i++) {
      crypto.randomInt(1000000);
    }
    
    const duration = Date.now() - startTime;
    const avgTime = duration / iterations;
    
    // 平均每次调用应该在合理时间内（如 0.01ms）
    if (avgTime > 0.01) {
      console.warn(`   警告: 平均调用时间 ${avgTime.toFixed(4)}ms 可能偏高`);
    }
  });

  // 测试64: 大范围随机数生成
  runTest('特殊 - 大范围随机数生成 (接近 2^48)', () => {
    const max = Math.pow(2, 47); // 2^47，远小于 2^48 限制
    const n = crypto.randomInt(max);
    if (n < 0 || n >= max) {
      throw new Error(`返回值 ${n} 应该在 [0, ${max}) 范围内`);
    }
  });

  // 测试65: 多次调用同一参数
  runTest('一致性 - 多次调用同一参数产生不同结果', () => {
    const min = 0;
    const max = 100;
    const results = [];
    
    for (let i = 0; i < 10; i++) {
      results.push(crypto.randomInt(min, max));
    }
    
    // 检查是否有重复（10次调用在0-100范围内很可能有重复，但不应该全部相同）
    const allSame = results.every(val => val === results[0]);
    if (allSame) {
      throw new Error('多次调用返回了完全相同的值，可能随机性有问题');
    }
  });

  // 测试66: 极小范围多次调用
  runTest('特殊 - 极小范围多次调用 randomInt(2)', () => {
    const results = [];
    for (let i = 0; i < 20; i++) {
      const n = crypto.randomInt(2);
      if (n !== 0 && n !== 1) {
        throw new Error(`randomInt(2) 返回了 ${n}，应该只返回 0 或 1`);
      }
      results.push(n);
    }
    
    // 20次调用应该有变化
    const hasZero = results.includes(0);
    const hasOne = results.includes(1);
    
    if (!hasZero || !hasOne) {
      console.warn(`   警告: 20次调用未能同时生成0和1，结果: ${results.join(',')}`);
    }
  });

  // ============================================================================
  // 异步错误处理测试
  // ============================================================================

  console.log('\n=== 异步错误处理测试 ===\n');

  const asyncErrorTests = [];

  // 测试67: 异步调用 - min >= max 错误 (同步抛出，不会进入回调)
  asyncErrorTests.push(runAsyncTest('异步错误 - min 等于 max (同步抛出)', () => {
    return new Promise((resolve, reject) => {
      try {
        crypto.randomInt(5, 5, (err, n) => {
          // 不应该进入这里
          reject(new Error('不应该进入回调，应该同步抛出错误'));
        });
        reject(new Error('应该同步抛出 RangeError'));
      } catch (error) {
        if (error.name !== 'RangeError' && error.code !== 'ERR_OUT_OF_RANGE') {
          return reject(new Error(`应该抛出 RangeError，实际是 ${error.name}: ${error.message}`));
        }
        resolve();
      }
    });
  }));

  // 测试68: 异步调用 - 范围超过 2^48 (同步抛出，不会进入回调)
  asyncErrorTests.push(runAsyncTest('异步错误 - 范围超过 2^48 (同步抛出)', () => {
    return new Promise((resolve, reject) => {
      try {
        const range = Math.pow(2, 48) + 1;
        crypto.randomInt(0, range, (err, n) => {
          // 不应该进入这里
          reject(new Error('不应该进入回调，应该同步抛出错误'));
        });
        reject(new Error('应该同步抛出 RangeError'));
      } catch (error) {
        if (error.name !== 'RangeError') {
          return reject(new Error(`应该抛出 RangeError，实际是 ${error.name}: ${error.message}`));
        }
        resolve();
      }
    });
  }));

  // 测试69: 异步调用 - 无效回调类型 (同步抛出)
  asyncErrorTests.push(runAsyncTest('异步错误 - 无效回调类型 (同步抛出)', () => {
    return new Promise((resolve, reject) => {
      try {
        crypto.randomInt(10, null);
        reject(new Error('应该同步抛出 TypeError'));
      } catch (error) {
        if (error.name !== 'TypeError') {
          return reject(new Error(`应该抛出 TypeError，实际是 ${error.name}: ${error.message}`));
        }
        resolve();
      }
    });
  }));

  // 等待所有异步错误测试完成
  await Promise.all(asyncErrorTests);

  // ============================================================================
  // 参数解析测试
  // ============================================================================

  console.log('\n=== 参数解析测试 ===\n');

  // 测试70: 单参数调用 - 确认 min 默认为 0
  runTest('参数解析 - 单参数 min 默认为 0', () => {
    const max = 5;
    const results = [];
    
    // 多次调用，确保能生成 0
    for (let i = 0; i < 1000; i++) {
      results.push(crypto.randomInt(max));
    }
    
    const hasZero = results.includes(0);
    const allInRange = results.every(n => n >= 0 && n < max);
    
    if (!allInRange) {
      throw new Error('存在超出 [0, max) 范围的值');
    }
    
    if (!hasZero) {
      console.warn('   警告: 1000次调用中未生成0，可能需要更多样本');
    }
  });

  // 测试71: 双参数调用 - 确认范围正确
  runTest('参数解析 - 双参数范围正确', () => {
    const min = 10;
    const max = 20;
    const results = [];
    
    for (let i = 0; i < 1000; i++) {
      results.push(crypto.randomInt(min, max));
    }
    
    const allInRange = results.every(n => n >= min && n < max);
    const hasMin = results.includes(min);
    const hasMax = results.includes(max);
    const hasMaxMinus1 = results.includes(max - 1);
    
    if (!allInRange) {
      throw new Error('存在超出 [min, max) 范围的值');
    }
    
    if (hasMax) {
      throw new Error(`生成了 max 值 ${max}，但应该是 [min, max) 不包含 max`);
    }
    
    if (!hasMin) {
      console.warn(`   警告: 1000次调用中未生成 min 值 ${min}`);
    }
    
    if (!hasMaxMinus1) {
      console.warn(`   警告: 1000次调用中未生成 max-1 值 ${max - 1}`);
    }
  });

  // 测试72: 验证不会生成 max 值
  runTest('参数解析 - 永远不应该生成 max 值', () => {
    const min = 0;
    const max = 5;
    const results = [];
    
    for (let i = 0; i < 10000; i++) {
      const n = crypto.randomInt(min, max);
      if (n === max) {
        throw new Error(`生成了 max 值 ${max}，违反了 [min, max) 规则`);
      }
      results.push(n);
    }
    
    // 验证确实生成了 max - 1
    if (!results.includes(max - 1)) {
      console.warn(`   警告: 10000次调用中未生成 max-1 值 ${max - 1}`);
    }
  });

  // 测试73: 无参数调用
  runTest('错误 - 无参数调用', () => {
    try {
      crypto.randomInt();
      throw new Error('应该抛出错误');
    } catch (error) {
      if (error.name !== 'TypeError' && error.name !== 'RangeError') {
        throw new Error(`应该抛出 TypeError 或 RangeError，实际抛出 ${error.name}`);
      }
    }
  });

  // ============================================================================
  // 新增：零和负零测试
  // ============================================================================

  console.log('\n=== 零和负零测试 ===\n');

  // 测试74: randomInt(10, 10) 等于 randomInt(10)
  runTest('零范围 - 确认参数处理一致性', () => {
    // 两者都应该抛出错误或都正常（实际上都应该抛错）
    let error1 = null;
    let error2 = null;
    
    try {
      crypto.randomInt(0);
    } catch (e) {
      error1 = e;
    }
    
    try {
      crypto.randomInt(0, 0);
    } catch (e) {
      error2 = e;
    }
    
    // 两者都应该抛出错误
    if (!error1 || !error2) {
      throw new Error('randomInt(0) 和 randomInt(0, 0) 都应该抛出错误');
    }
    
    // 错误类型应该相同
    if (error1.name !== error2.name) {
      console.warn(`   警告: randomInt(0) 抛出 ${error1.name}，但 randomInt(0, 0) 抛出 ${error2.name}`);
    }
  });

  // 测试75: 负零的处理
  runTest('特殊 - 负零 -0 的处理', () => {
    // -0 应该被当作 0 处理
    const n = crypto.randomInt(-0, 5);
    if (n < 0 || n >= 5) {
      throw new Error(`返回值 ${n} 应该在 [0, 5) 范围内`);
    }
  });

  // ============================================================================
  // 测试总结
  // ============================================================================

  console.log('\n' + '='.repeat(70));
  console.log('测试总结');
  console.log('='.repeat(70));
  console.log(`总测试数: ${testResults.total}`);
  console.log(`通过: ${testResults.passed} ✅`);
  console.log(`失败: ${testResults.failed} ❌`);
  console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
  console.log('='.repeat(70));

  // 如果有失败的测试，显示详情
  if (testResults.failed > 0) {
    console.log('\n失败的测试详情:');
    testResults.details
      .filter(t => t.status === '❌')
      .forEach(t => {
        console.log(`\n${t.status} ${t.name}`);
        console.log(`   ${t.message}`);
      });
  }

  // 返回测试结果
  const finalResult = {
    success: testResults.failed === 0,
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: `${((testResults.passed / testResults.total) * 100).toFixed(2)}%`
    },
    details: testResults.details
  };

  console.log('\n最终结果:');
  console.log(JSON.stringify(finalResult, null, 2));

  return finalResult;
}

// 执行测试并返回结果
return runAllTests();
