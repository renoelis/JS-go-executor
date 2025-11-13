const crypto = require('crypto');

/**
 * crypto.randomFill() 全面测试
 * Node.js v25.0.0 API 对齐测试
 *
 * API 签名:
 * - crypto.randomFill(buffer[, offset][, size], callback)
 *
 * 测试覆盖:
 * 1. 基本功能测试
 * 2. 不同 Buffer 类型支持
 * 3. offset 和 size 参数
 * 4. 边界情况测试
 * 5. 错误处理
 * 6. 回调函数行为
 * 7. TypedArray 支持
 * 8. 性能和安全特性
 */

const testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  tests: []
};

function addTest(name, passed, details = {}) {
  testResults.totalTests++;
  if (passed) {
    testResults.passedTests++;
  } else {
    testResults.failedTests++;
  }
  testResults.tests.push({
    name,
    status: passed ? '✅' : '❌',
    ...details
  });
}

// 辅助函数:检查 buffer 是否被填充(非全零)
function isBufferFilled(buffer) {
  const arr = new Uint8Array(buffer.buffer || buffer);
  let hasNonZero = false;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  return hasNonZero;
}

// 辅助函数:延迟执行
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('开始 crypto.randomFill() 全面测试\n');

  // ==================== 测试 1: 基本 Buffer 填充 ====================
  await new Promise((resolve) => {
    const buffer = Buffer.allocUnsafe(16);
    crypto.randomFill(buffer, (err, buf) => {
      const passed = !err && buf === buffer && isBufferFilled(buffer) && buffer.length === 16;
      addTest('基本 Buffer 填充 (16 bytes)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        isFilled: isBufferFilled(buffer),
        length: buffer.length
      });
      resolve();
    });
  });

  // ==================== 测试 2: Uint8Array 填充 ====================
  await new Promise((resolve) => {
    const arr = new Uint8Array(32);
    crypto.randomFill(arr, (err, buf) => {
      const passed = !err && buf === arr && isBufferFilled(arr) && arr.length === 32;
      addTest('Uint8Array 填充 (32 bytes)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === arr,
        isFilled: isBufferFilled(arr),
        length: arr.length
      });
      resolve();
    });
  });

  // ==================== 测试 3: Uint16Array 填充 ====================
  await new Promise((resolve) => {
    const arr = new Uint16Array(16);
    crypto.randomFill(arr, (err, buf) => {
      const passed = !err && buf === arr && isBufferFilled(arr);
      addTest('Uint16Array 填充 (16 elements)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === arr,
        isFilled: isBufferFilled(arr),
        elements: arr.length
      });
      resolve();
    });
  });

  // ==================== 测试 4: Uint32Array 填充 ====================
  await new Promise((resolve) => {
    const arr = new Uint32Array(8);
    crypto.randomFill(arr, (err, buf) => {
      const passed = !err && buf === arr && isBufferFilled(arr);
      addTest('Uint32Array 填充 (8 elements)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === arr,
        isFilled: isBufferFilled(arr),
        elements: arr.length
      });
      resolve();
    });
  });

  // ==================== 测试 5: BigUint64Array 填充 ====================
  await new Promise((resolve) => {
    const arr = new BigUint64Array(4);
    crypto.randomFill(arr, (err, buf) => {
      const passed = !err && buf === arr && isBufferFilled(arr);
      addTest('BigUint64Array 填充 (4 elements)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === arr,
        isFilled: isBufferFilled(arr),
        elements: arr.length
      });
      resolve();
    });
  });

  // ==================== 测试 6: DataView 填充 ====================
  await new Promise((resolve) => {
    const buffer = new ArrayBuffer(24);
    const view = new DataView(buffer);
    crypto.randomFill(view, (err, buf) => {
      const passed = !err && buf === view && isBufferFilled(view);
      addTest('DataView 填充 (24 bytes)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === view,
        isFilled: isBufferFilled(view),
        byteLength: view.byteLength
      });
      resolve();
    });
  });

  // ==================== 测试 7: 使用 offset 参数 ====================
  await new Promise((resolve) => {
    const buffer = Buffer.alloc(32, 0);
    const offset = 8;
    crypto.randomFill(buffer, offset, (err, buf) => {
      const firstPartZero = buffer.slice(0, offset).every(b => b === 0);
      const secondPartFilled = isBufferFilled(buffer.slice(offset));
      const passed = !err && buf === buffer && firstPartZero && secondPartFilled;
      addTest('使用 offset 参数 (offset=8)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        firstPartZero,
        secondPartFilled,
        offset
      });
      resolve();
    });
  });

  // ==================== 测试 8: 使用 offset 和 size 参数 ====================
  await new Promise((resolve) => {
    const buffer = Buffer.alloc(32, 0);
    const offset = 8;
    const size = 16;
    crypto.randomFill(buffer, offset, size, (err, buf) => {
      const firstPartZero = buffer.slice(0, offset).every(b => b === 0);
      const middlePartFilled = isBufferFilled(buffer.slice(offset, offset + size));
      const lastPartZero = buffer.slice(offset + size).every(b => b === 0);
      const passed = !err && buf === buffer && firstPartZero && middlePartFilled && lastPartZero;
      addTest('使用 offset 和 size 参数 (offset=8, size=16)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        firstPartZero,
        middlePartFilled,
        lastPartZero,
        offset,
        size
      });
      resolve();
    });
  });

  // ==================== 测试 9: Uint8Array 使用 offset ====================
  await new Promise((resolve) => {
    const arr = new Uint8Array(32);
    arr.fill(0);
    const offset = 10;
    crypto.randomFill(arr, offset, (err, buf) => {
      const firstPartZero = arr.slice(0, offset).every(b => b === 0);
      const secondPartFilled = isBufferFilled(arr.slice(offset));
      const passed = !err && buf === arr && firstPartZero && secondPartFilled;
      addTest('Uint8Array 使用 offset (offset=10)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === arr,
        firstPartZero,
        secondPartFilled,
        offset
      });
      resolve();
    });
  });

  // ==================== 测试 10: Uint8Array 使用 offset 和 size ====================
  await new Promise((resolve) => {
    const arr = new Uint8Array(40);
    arr.fill(0);
    const offset = 5;
    const size = 20;
    crypto.randomFill(arr, offset, size, (err, buf) => {
      const firstPartZero = arr.slice(0, offset).every(b => b === 0);
      const middlePartFilled = isBufferFilled(arr.slice(offset, offset + size));
      const lastPartZero = arr.slice(offset + size).every(b => b === 0);
      const passed = !err && buf === arr && firstPartZero && middlePartFilled && lastPartZero;
      addTest('Uint8Array 使用 offset 和 size (offset=5, size=20)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === arr,
        firstPartZero,
        middlePartFilled,
        lastPartZero,
        offset,
        size
      });
      resolve();
    });
  });

  // ==================== 测试 11: 边界情况 - 最小 buffer (1 byte) ====================
  await new Promise((resolve) => {
    const buffer = Buffer.allocUnsafe(1);
    crypto.randomFill(buffer, (err, buf) => {
      const passed = !err && buf === buffer && buffer.length === 1;
      addTest('最小 buffer (1 byte)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        length: buffer.length,
        value: buffer[0]
      });
      resolve();
    });
  });

  // ==================== 测试 12: 边界情况 - 大 buffer (64KB) ====================
  await new Promise((resolve) => {
    const buffer = Buffer.allocUnsafe(65536);
    crypto.randomFill(buffer, (err, buf) => {
      const passed = !err && buf === buffer && isBufferFilled(buffer) && buffer.length === 65536;
      addTest('大 buffer (64KB)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        isFilled: isBufferFilled(buffer),
        length: buffer.length
      });
      resolve();
    });
  });

  // ==================== 测试 13: 边界情况 - offset 为 0 ====================
  await new Promise((resolve) => {
    const buffer = Buffer.alloc(16, 0);
    crypto.randomFill(buffer, 0, (err, buf) => {
      const passed = !err && buf === buffer && isBufferFilled(buffer);
      addTest('offset 为 0', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        isFilled: isBufferFilled(buffer)
      });
      resolve();
    });
  });

  // ==================== 测试 14: 边界情况 - size 为 0 ====================
  await new Promise((resolve) => {
    const buffer = Buffer.alloc(16, 0);
    crypto.randomFill(buffer, 0, 0, (err, buf) => {
      const allZero = buffer.every(b => b === 0);
      const passed = !err && buf === buffer && allZero;
      addTest('size 为 0', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        allZero
      });
      resolve();
    });
  });

  // ==================== 测试 15: 边界情况 - offset + size = buffer.length ====================
  await new Promise((resolve) => {
    const buffer = Buffer.alloc(32, 0);
    const offset = 16;
    const size = 16;
    crypto.randomFill(buffer, offset, size, (err, buf) => {
      const firstPartZero = buffer.slice(0, offset).every(b => b === 0);
      const secondPartFilled = isBufferFilled(buffer.slice(offset));
      const passed = !err && buf === buffer && firstPartZero && secondPartFilled;
      addTest('offset + size = buffer.length', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        firstPartZero,
        secondPartFilled,
        offset,
        size
      });
      resolve();
    });
  });

  // ==================== 测试 16: 错误处理 - offset 超出范围 ====================
  await new Promise((resolve) => {
    try {
      const buffer = Buffer.allocUnsafe(16);
      crypto.randomFill(buffer, 20, (err, buf) => {
        const hasError = !!err;
        const isRangeError = err && (err.code === 'ERR_OUT_OF_RANGE' || err.message.includes('out of range') || err.message.includes('offset'));
        const passed = hasError && isRangeError;
        addTest('错误: offset 超出范围', passed, {
          hasError,
          errorCode: err ? err.code : null,
          errorMessage: err ? err.message : null,
          isRangeError
        });
        resolve();
      });
    } catch (syncErr) {
      const isRangeError = syncErr.code === 'ERR_OUT_OF_RANGE' || syncErr.message.includes('out of range');
      addTest('错误: offset 超出范围', isRangeError, {
        syncError: true,
        errorCode: syncErr.code,
        errorMessage: syncErr.message,
        isRangeError
      });
      resolve();
    }
  });

  // ==================== 测试 17: 错误处理 - offset + size 超出范围 ====================
  await new Promise((resolve) => {
    try {
      const buffer = Buffer.allocUnsafe(16);
      crypto.randomFill(buffer, 10, 10, (err, buf) => {
        const hasError = !!err;
        const isRangeError = err && (err.code === 'ERR_OUT_OF_RANGE' || err.message.includes('out of range') || err.message.includes('offset') || err.message.includes('size'));
        const passed = hasError && isRangeError;
        addTest('错误: offset + size 超出范围', passed, {
          hasError,
          errorCode: err ? err.code : null,
          errorMessage: err ? err.message : null,
          isRangeError
        });
        resolve();
      });
    } catch (syncErr) {
      const isRangeError = syncErr.code === 'ERR_OUT_OF_RANGE' || syncErr.message.includes('out of range');
      addTest('错误: offset + size 超出范围', isRangeError, {
        syncError: true,
        errorCode: syncErr.code,
        errorMessage: syncErr.message,
        isRangeError
      });
      resolve();
    }
  });

  // ==================== 测试 18: 错误处理 - 负数 offset ====================
  await new Promise((resolve) => {
    try {
      const buffer = Buffer.allocUnsafe(16);
      crypto.randomFill(buffer, -1, (err, buf) => {
        const hasError = !!err;
        const isRangeError = err && (err.code === 'ERR_OUT_OF_RANGE' || err.message.includes('out of range') || err.message.includes('offset') || err.message.includes('negative'));
        const passed = hasError && isRangeError;
        addTest('错误: 负数 offset', passed, {
          hasError,
          errorCode: err ? err.code : null,
          errorMessage: err ? err.message : null,
          isRangeError
        });
        resolve();
      });
    } catch (syncErr) {
      const isRangeError = syncErr.code === 'ERR_OUT_OF_RANGE' || syncErr.message.includes('out of range');
      addTest('错误: 负数 offset', isRangeError, {
        syncError: true,
        errorCode: syncErr.code,
        errorMessage: syncErr.message,
        isRangeError
      });
      resolve();
    }
  });

  // ==================== 测试 19: 错误处理 - 负数 size ====================
  await new Promise((resolve) => {
    try {
      const buffer = Buffer.allocUnsafe(16);
      crypto.randomFill(buffer, 0, -5, (err, buf) => {
        const hasError = !!err;
        const isRangeError = err && (err.code === 'ERR_OUT_OF_RANGE' || err.message.includes('out of range') || err.message.includes('size') || err.message.includes('negative'));
        const passed = hasError && isRangeError;
        addTest('错误: 负数 size', passed, {
          hasError,
          errorCode: err ? err.code : null,
          errorMessage: err ? err.message : null,
          isRangeError
        });
        resolve();
      });
    } catch (syncErr) {
      const isRangeError = syncErr.code === 'ERR_OUT_OF_RANGE' || syncErr.message.includes('out of range');
      addTest('错误: 负数 size', isRangeError, {
        syncError: true,
        errorCode: syncErr.code,
        errorMessage: syncErr.message,
        isRangeError
      });
      resolve();
    }
  });

  // ==================== 测试 20: 错误处理 - 无效 buffer 类型 (null) ====================
  await new Promise((resolve) => {
    try {
      crypto.randomFill(null, (err, buf) => {
        const passed = !!err;
        addTest('错误: 无效 buffer 类型 (null)', passed, {
          hasError: !!err,
          errorCode: err ? err.code : null,
          errorMessage: err ? err.message : null
        });
        resolve();
      });
    } catch (syncErr) {
      const passed = true;
      addTest('错误: 无效 buffer 类型 (null)', passed, {
        syncError: true,
        errorCode: syncErr.code,
        errorMessage: syncErr.message
      });
      resolve();
    }
  });

  // ==================== 测试 21: 错误处理 - 无效 buffer 类型 (普通对象) ====================
  await new Promise((resolve) => {
    try {
      crypto.randomFill({}, (err, buf) => {
        const passed = !!err;
        addTest('错误: 无效 buffer 类型 (普通对象)', passed, {
          hasError: !!err,
          errorCode: err ? err.code : null,
          errorMessage: err ? err.message : null
        });
        resolve();
      });
    } catch (syncErr) {
      const passed = true;
      addTest('错误: 无效 buffer 类型 (普通对象)', passed, {
        syncError: true,
        errorCode: syncErr.code,
        errorMessage: syncErr.message
      });
      resolve();
    }
  });

  // ==================== 测试 22: 错误处理 - 缺少 callback ====================
  try {
    const buffer = Buffer.allocUnsafe(16);
    crypto.randomFill(buffer);
    addTest('错误: 缺少 callback', false, {
      note: '应该抛出同步错误'
    });
  } catch (err) {
    const isTypeError = err instanceof TypeError || (err.code === 'ERR_INVALID_ARG_TYPE');
    addTest('错误: 缺少 callback', isTypeError, {
      hasError: true,
      errorType: err instanceof TypeError ? 'TypeError' : 'Error',
      errorCode: err.code,
      errorMessage: err.message
    });
  }

  // ==================== 测试 23: Float32Array 支持(但不应用于生成随机浮点数) ====================
  await new Promise((resolve) => {
    const arr = new Float32Array(8);
    crypto.randomFill(arr, (err, buf) => {
      const passed = !err && buf === arr;
      // 注意: 官方文档警告不应该用这个生成随机浮点数,可能包含 Infinity 和 NaN
      const hasSpecialValues = Array.from(arr).some(v => !isFinite(v));
      addTest('Float32Array 填充 (不推荐用于随机浮点数)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === arr,
        hasSpecialValues,
        note: '可能包含 ±Infinity 和 NaN'
      });
      resolve();
    });
  });

  // ==================== 测试 24: Float64Array 支持(但不应用于生成随机浮点数) ====================
  await new Promise((resolve) => {
    const arr = new Float64Array(4);
    crypto.randomFill(arr, (err, buf) => {
      const passed = !err && buf === arr;
      const hasSpecialValues = Array.from(arr).some(v => !isFinite(v));
      addTest('Float64Array 填充 (不推荐用于随机浮点数)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === arr,
        hasSpecialValues,
        note: '可能包含 ±Infinity 和 NaN'
      });
      resolve();
    });
  });

  // ==================== 测试 25: Int8Array 填充 ====================
  await new Promise((resolve) => {
    const arr = new Int8Array(20);
    crypto.randomFill(arr, (err, buf) => {
      const passed = !err && buf === arr && isBufferFilled(arr);
      addTest('Int8Array 填充 (20 elements)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === arr,
        isFilled: isBufferFilled(arr),
        elements: arr.length
      });
      resolve();
    });
  });

  // ==================== 测试 26: Int16Array 填充 ====================
  await new Promise((resolve) => {
    const arr = new Int16Array(12);
    crypto.randomFill(arr, (err, buf) => {
      const passed = !err && buf === arr && isBufferFilled(arr);
      addTest('Int16Array 填充 (12 elements)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === arr,
        isFilled: isBufferFilled(arr),
        elements: arr.length
      });
      resolve();
    });
  });

  // ==================== 测试 27: Int32Array 填充 ====================
  await new Promise((resolve) => {
    const arr = new Int32Array(8);
    crypto.randomFill(arr, (err, buf) => {
      const passed = !err && buf === arr && isBufferFilled(arr);
      addTest('Int32Array 填充 (8 elements)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === arr,
        isFilled: isBufferFilled(arr),
        elements: arr.length
      });
      resolve();
    });
  });

  // ==================== 测试 28: BigInt64Array 填充 ====================
  await new Promise((resolve) => {
    const arr = new BigInt64Array(5);
    crypto.randomFill(arr, (err, buf) => {
      const passed = !err && buf === arr && isBufferFilled(arr);
      addTest('BigInt64Array 填充 (5 elements)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === arr,
        isFilled: isBufferFilled(arr),
        elements: arr.length
      });
      resolve();
    });
  });

  // ==================== 测试 29: 回调函数异步执行验证 ====================
  let callbackExecuted = false;
  let syncCodeExecuted = false;
  const buffer = Buffer.allocUnsafe(16);

  crypto.randomFill(buffer, (err, buf) => {
    callbackExecuted = true;
    const passed = syncCodeExecuted; // 回调应该在同步代码之后执行
    addTest('回调函数异步执行', passed, {
      callbackExecuted,
      syncCodeExecuted,
      isAsync: syncCodeExecuted
    });
  });

  syncCodeExecuted = true;
  await delay(50); // 等待回调执行

  // ==================== 测试 30: 多次调用产生不同结果(随机性验证) ====================
  const buffers = [];
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => {
      const buf = Buffer.allocUnsafe(16);
      crypto.randomFill(buf, (err, filledBuf) => {
        if (!err) buffers.push(Buffer.from(filledBuf));
        resolve();
      });
    });
  }

  // 检查是否所有 buffer 都不相同
  let allDifferent = true;
  for (let i = 0; i < buffers.length; i++) {
    for (let j = i + 1; j < buffers.length; j++) {
      if (buffers[i].equals(buffers[j])) {
        allDifferent = false;
        break;
      }
    }
    if (!allDifferent) break;
  }

  addTest('多次调用产生不同结果(随机性)', allDifferent, {
    iterations: buffers.length,
    allDifferent
  });

  // ==================== 测试 31: Uint8ClampedArray 填充 ====================
  await new Promise((resolve) => {
    const arr = new Uint8ClampedArray(24);
    crypto.randomFill(arr, (err, buf) => {
      const passed = !err && buf === arr && isBufferFilled(arr);
      // 所有值应该在 0-255 范围内
      const allInRange = Array.from(arr).every(v => v >= 0 && v <= 255);
      addTest('Uint8ClampedArray 填充 (24 elements)', passed && allInRange, {
        error: err ? err.message : null,
        bufferSame: buf === arr,
        isFilled: isBufferFilled(arr),
        allInRange,
        elements: arr.length
      });
      resolve();
    });
  });

  // ==================== 测试 32: 小 size 值测试 (size=1) ====================
  await new Promise((resolve) => {
    const buffer = Buffer.alloc(16, 0);
    const offset = 5;
    const size = 1;
    crypto.randomFill(buffer, offset, size, (err, buf) => {
      const firstPartZero = buffer.slice(0, offset).every(b => b === 0);
      const lastPartZero = buffer.slice(offset + size).every(b => b === 0);
      const passed = !err && buf === buffer && firstPartZero && lastPartZero;
      addTest('小 size 值 (size=1)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        firstPartZero,
        lastPartZero,
        value: buffer[offset]
      });
      resolve();
    });
  });

  // ==================== 测试 33: 验证 buffer 引用不变 ====================
  await new Promise((resolve) => {
    const buffer = Buffer.allocUnsafe(16);
    const originalBuffer = buffer;
    crypto.randomFill(buffer, (err, buf) => {
      const sameReference = buf === originalBuffer && buf === buffer;
      const passed = !err && sameReference;
      addTest('buffer 引用保持不变', passed, {
        error: err ? err.message : null,
        sameReference,
        bufSameAsOriginal: buf === originalBuffer,
        bufSameAsBuffer: buf === buffer
      });
      resolve();
    });
  });

  // ==================== 测试 34: ArrayBuffer 通过 Uint8Array 包装 ====================
  await new Promise((resolve) => {
    const arrayBuffer = new ArrayBuffer(32);
    const view = new Uint8Array(arrayBuffer);
    crypto.randomFill(view, (err, buf) => {
      const passed = !err && buf === view && isBufferFilled(view);
      addTest('ArrayBuffer 通过 Uint8Array 包装', passed, {
        error: err ? err.message : null,
        bufferSame: buf === view,
        isFilled: isBufferFilled(view),
        byteLength: arrayBuffer.byteLength
      });
      resolve();
    });
  });

  // ==================== 测试 35: 并发多次调用 ====================
  const concurrentPromises = [];
  const concurrentResults = [];

  for (let i = 0; i < 10; i++) {
    concurrentPromises.push(
      new Promise((resolve) => {
        const buf = Buffer.allocUnsafe(16);
        crypto.randomFill(buf, (err, filledBuf) => {
          concurrentResults.push({ err, buf: filledBuf, isFilled: !err && isBufferFilled(filledBuf) });
          resolve();
        });
      })
    );
  }

  await Promise.all(concurrentPromises);
  const allSuccess = concurrentResults.every(r => !r.err && r.isFilled);

  addTest('并发 10 次调用', allSuccess, {
    totalCalls: concurrentResults.length,
    successfulCalls: concurrentResults.filter(r => !r.err && r.isFilled).length,
    allSuccess
  });

  // ==================== 测试 36: offset 为非整数时的行为 ====================
  await new Promise((resolve) => {
    const buffer = Buffer.alloc(32, 0);
    crypto.randomFill(buffer, 8.5, (err, buf) => {
      // Node.js 应该将 8.5 转换为 8
      const firstPartZero = buffer.slice(0, 8).every(b => b === 0);
      const secondPartFilled = isBufferFilled(buffer.slice(8));
      const passed = !err && buf === buffer && firstPartZero && secondPartFilled;
      addTest('offset 为非整数 (8.5)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        firstPartZero,
        secondPartFilled,
        note: 'Node.js 应将 8.5 转换为 8'
      });
      resolve();
    });
  });

  // ==================== 测试 37: size 为非整数时的行为 ====================
  await new Promise((resolve) => {
    const buffer = Buffer.alloc(32, 0);
    const offset = 4;
    const size = 10.9;
    crypto.randomFill(buffer, offset, size, (err, buf) => {
      // Node.js 应该将 10.9 转换为 10
      const firstPartZero = buffer.slice(0, offset).every(b => b === 0);
      const middlePartFilled = isBufferFilled(buffer.slice(offset, offset + 10));
      const lastPartZero = buffer.slice(offset + 10).every(b => b === 0);
      const passed = !err && buf === buffer && firstPartZero && middlePartFilled && lastPartZero;
      addTest('size 为非整数 (10.9)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        firstPartZero,
        middlePartFilled,
        lastPartZero,
        note: 'Node.js 应将 10.9 转换为 10'
      });
      resolve();
    });
  });

  // ==================== 测试 38: TypedArray 的 byteOffset 支持 ====================
  await new Promise((resolve) => {
    const arrayBuffer = new ArrayBuffer(64);
    const view = new Uint8Array(arrayBuffer, 16, 32); // offset=16, length=32
    crypto.randomFill(view, (err, buf) => {
      const passed = !err && buf === view && isBufferFilled(view) && view.byteLength === 32;
      addTest('TypedArray 的 byteOffset (offset=16, length=32)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === view,
        isFilled: isBufferFilled(view),
        byteLength: view.byteLength,
        byteOffset: view.byteOffset
      });
      resolve();
    });
  });

  // ==================== 测试 39: 非常大的 size 参数(等于 buffer 长度) ====================
  await new Promise((resolve) => {
    const buffer = Buffer.alloc(128, 0);
    crypto.randomFill(buffer, 0, 128, (err, buf) => {
      const passed = !err && buf === buffer && isBufferFilled(buffer);
      addTest('size 等于 buffer 长度', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        isFilled: isBufferFilled(buffer),
        size: 128
      });
      resolve();
    });
  });

  // ==================== 测试 40: 统计分布均匀性验证(简单检查) ====================
  await new Promise((resolve) => {
    const buffer = Buffer.allocUnsafe(10000);
    crypto.randomFill(buffer, (err, buf) => {
      if (err) {
        addTest('统计分布均匀性验证', false, { error: err.message });
        resolve();
        return;
      }

      // 统计每个字节值出现的次数
      const distribution = new Array(256).fill(0);
      for (let i = 0; i < buffer.length; i++) {
        distribution[buffer[i]]++;
      }

      // 期望每个值出现约 10000/256 ≈ 39 次
      const expectedFreq = 10000 / 256;
      const tolerance = 0.5; // 允许 50% 的偏差

      // 检查是否大部分值都在合理范围内
      const inRange = distribution.filter(freq =>
        freq >= expectedFreq * (1 - tolerance) &&
        freq <= expectedFreq * (1 + tolerance)
      ).length;

      const passed = inRange > 200; // 至少 200/256 的值应该在范围内

      addTest('统计分布均匀性验证 (10000 bytes)', passed, {
        totalValues: 256,
        valuesInRange: inRange,
        expectedFrequency: expectedFreq.toFixed(2),
        minFrequency: Math.min(...distribution),
        maxFrequency: Math.max(...distribution),
        passed
      });
      resolve();
    });
  });

  // ==================== 补充测试: undefined/null 参数处理 ====================
  
  // 测试 41: 省略 offset 参数 (等同于 undefined)
  await new Promise((resolve) => {
    const buffer = Buffer.alloc(16, 0);
    crypto.randomFill(buffer, (err, buf) => {
      const passed = !err && buf === buffer && isBufferFilled(buffer);
      addTest('省略 offset 参数 (应填充整个 buffer)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        isFilled: isBufferFilled(buffer)
      });
      resolve();
    });
  });

  // 测试 42: 省略 size 参数 (等同于 undefined, 应填充到 buffer 末尾)
  await new Promise((resolve) => {
    const buffer = Buffer.alloc(20, 0);
    crypto.randomFill(buffer, 10, (err, buf) => {
      const firstPartZero = buffer.slice(0, 10).every(b => b === 0);
      const secondPartFilled = isBufferFilled(buffer.slice(10));
      const passed = !err && buf === buffer && firstPartZero && secondPartFilled;
      addTest('省略 size 参数 (应填充到 buffer 末尾)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        firstPartZero,
        secondPartFilled
      });
      resolve();
    });
  });

  // 测试 43: null 作为 offset (应抛出错误)
  await new Promise((resolve) => {
    try {
      const buffer = Buffer.alloc(16, 0);
      crypto.randomFill(buffer, null, (err, buf) => {
        const hasError = !!err;
        const hasCorrectMessage = err && (err.message.includes('offset') || err.message.includes('type number') || err.message.includes('null'));
        const passed = hasError && hasCorrectMessage;
        addTest('null 作为 offset (应抛出类型错误)', passed, {
          hasError,
          errorMessage: err ? err.message : null,
          hasCorrectMessage
        });
        resolve();
      });
    } catch (syncErr) {
      const hasCorrectMessage = syncErr.message && (syncErr.message.includes('offset') || syncErr.message.includes('type number') || syncErr.message.includes('null'));
      addTest('null 作为 offset (应抛出类型错误)', hasCorrectMessage, {
        syncError: true,
        errorMessage: syncErr.message,
        hasCorrectMessage
      });
      resolve();
    }
  });

  // 测试 44: null 作为 size (应抛出错误)
  await new Promise((resolve) => {
    try {
      const buffer = Buffer.alloc(16, 0);
      crypto.randomFill(buffer, 0, null, (err, buf) => {
        const hasError = !!err;
        const hasCorrectMessage = err && (err.message.includes('size') || err.message.includes('type number') || err.message.includes('null'));
        const passed = hasError && hasCorrectMessage;
        addTest('null 作为 size (应抛出类型错误)', passed, {
          hasError,
          errorMessage: err ? err.message : null,
          hasCorrectMessage
        });
        resolve();
      });
    } catch (syncErr) {
      const hasCorrectMessage = syncErr.message && (syncErr.message.includes('size') || syncErr.message.includes('type number') || syncErr.message.includes('null'));
      addTest('null 作为 size (应抛出类型错误)', hasCorrectMessage, {
        syncError: true,
        errorMessage: syncErr.message,
        hasCorrectMessage
      });
      resolve();
    }
  });

  // ==================== 补充测试: 特殊数值参数 ====================
  
  // 测试 45: NaN 作为 offset
  await new Promise((resolve) => {
    try {
      const buffer = Buffer.alloc(16, 0);
      crypto.randomFill(buffer, NaN, (err, buf) => {
        const hasError = !!err;
        const hasCorrectMessage = err && (err.message.includes('out of range') || err.message.includes('offset') || err.message.includes('NaN'));
        const passed = hasError && hasCorrectMessage;
        addTest('NaN 作为 offset (应抛出范围错误)', passed, {
          hasError,
          errorMessage: err ? err.message : null,
          hasCorrectMessage
        });
        resolve();
      });
    } catch (syncErr) {
      const hasCorrectMessage = syncErr.message && (syncErr.message.includes('out of range') || syncErr.message.includes('offset') || syncErr.message.includes('NaN'));
      addTest('NaN 作为 offset (应抛出范围错误)', hasCorrectMessage, {
        syncError: true,
        errorMessage: syncErr.message,
        hasCorrectMessage
      });
      resolve();
    }
  });

  // 测试 46: NaN 作为 size
  await new Promise((resolve) => {
    try {
      const buffer = Buffer.alloc(16, 0);
      crypto.randomFill(buffer, 0, NaN, (err, buf) => {
        const hasError = !!err;
        const hasCorrectMessage = err && (err.message.includes('out of range') || err.message.includes('size') || err.message.includes('NaN'));
        const passed = hasError && hasCorrectMessage;
        addTest('NaN 作为 size (应抛出范围错误)', passed, {
          hasError,
          errorMessage: err ? err.message : null,
          hasCorrectMessage
        });
        resolve();
      });
    } catch (syncErr) {
      const hasCorrectMessage = syncErr.message && (syncErr.message.includes('out of range') || syncErr.message.includes('size') || syncErr.message.includes('NaN'));
      addTest('NaN 作为 size (应抛出范围错误)', hasCorrectMessage, {
        syncError: true,
        errorMessage: syncErr.message,
        hasCorrectMessage
      });
      resolve();
    }
  });

  // 测试 47: Infinity 作为 offset
  await new Promise((resolve) => {
    try {
      const buffer = Buffer.alloc(16, 0);
      crypto.randomFill(buffer, Infinity, (err, buf) => {
        const hasError = !!err;
        const hasCorrectMessage = err && (err.message.includes('out of range') || err.message.includes('offset'));
        const passed = hasError && hasCorrectMessage;
        addTest('Infinity 作为 offset (应抛出范围错误)', passed, {
          hasError,
          errorMessage: err ? err.message : null,
          hasCorrectMessage
        });
        resolve();
      });
    } catch (syncErr) {
      const hasCorrectMessage = syncErr.message && (syncErr.message.includes('out of range') || syncErr.message.includes('offset'));
      addTest('Infinity 作为 offset (应抛出范围错误)', hasCorrectMessage, {
        syncError: true,
        errorMessage: syncErr.message,
        hasCorrectMessage
      });
      resolve();
    }
  });

  // 测试 48: Infinity 作为 size
  await new Promise((resolve) => {
    try {
      const buffer = Buffer.alloc(16, 0);
      crypto.randomFill(buffer, 0, Infinity, (err, buf) => {
        const hasError = !!err;
        const hasCorrectMessage = err && (err.message.includes('out of range') || err.message.includes('size'));
        const passed = hasError && hasCorrectMessage;
        addTest('Infinity 作为 size (应抛出范围错误)', passed, {
          hasError,
          errorMessage: err ? err.message : null,
          hasCorrectMessage
        });
        resolve();
      });
    } catch (syncErr) {
      const hasCorrectMessage = syncErr.message && (syncErr.message.includes('out of range') || syncErr.message.includes('size'));
      addTest('Infinity 作为 size (应抛出范围错误)', hasCorrectMessage, {
        syncError: true,
        errorMessage: syncErr.message,
        hasCorrectMessage
      });
      resolve();
    }
  });

  // 测试 49: 字符串类型的 offset
  await new Promise((resolve) => {
    try {
      const buffer = Buffer.alloc(16, 0);
      crypto.randomFill(buffer, '10', (err, buf) => {
        const hasError = !!err;
        const hasCorrectMessage = err && (err.message.includes('offset') || err.message.includes('type number'));
        const passed = hasError && hasCorrectMessage;
        addTest('字符串类型的 offset (应抛出类型错误)', passed, {
          hasError,
          errorMessage: err ? err.message : null,
          hasCorrectMessage
        });
        resolve();
      });
    } catch (syncErr) {
      const hasCorrectMessage = syncErr.message && (syncErr.message.includes('offset') || syncErr.message.includes('type number'));
      addTest('字符串类型的 offset (应抛出类型错误)', hasCorrectMessage, {
        syncError: true,
        errorMessage: syncErr.message,
        hasCorrectMessage
      });
      resolve();
    }
  });

  // 测试 50: 字符串类型的 size
  await new Promise((resolve) => {
    try {
      const buffer = Buffer.alloc(16, 0);
      crypto.randomFill(buffer, 0, '5', (err, buf) => {
        const hasError = !!err;
        const hasCorrectMessage = err && (err.message.includes('size') || err.message.includes('type number'));
        const passed = hasError && hasCorrectMessage;
        addTest('字符串类型的 size (应抛出类型错误)', passed, {
          hasError,
          errorMessage: err ? err.message : null,
          hasCorrectMessage
        });
        resolve();
      });
    } catch (syncErr) {
      const hasCorrectMessage = syncErr.message && (syncErr.message.includes('size') || syncErr.message.includes('type number'));
      addTest('字符串类型的 size (应抛出类型错误)', hasCorrectMessage, {
        syncError: true,
        errorMessage: syncErr.message,
        hasCorrectMessage
      });
      resolve();
    }
  });

  // ==================== 补充测试: TypedArray byteOffset 场景 ====================
  
  // 测试 51: TypedArray 有 byteOffset 时指定 offset 参数
  await new Promise((resolve) => {
    const arrayBuffer = new ArrayBuffer(64);
    const fullView = new Uint8Array(arrayBuffer);
    const subView = new Uint8Array(arrayBuffer, 16, 32); // byteOffset=16, length=32
    
    crypto.randomFill(subView, 8, (err, buf) => {
      if (err) {
        addTest('TypedArray 有 byteOffset 时指定 offset 参数', false, { error: err.message });
        resolve();
        return;
      }
      
      // 检查 arrayBuffer[0-23] 应该为 0
      const firstPartZero = Array.from(fullView.slice(0, 24)).every(b => b === 0);
      // 检查 arrayBuffer[24-47] 应该被填充 (subView[8-31])
      const middlePartFilled = isBufferFilled(fullView.slice(24, 48));
      // 检查 arrayBuffer[48-63] 应该为 0
      const lastPartZero = Array.from(fullView.slice(48)).every(b => b === 0);
      
      const passed = buf === subView && firstPartZero && middlePartFilled && lastPartZero;
      addTest('TypedArray 有 byteOffset 时指定 offset 参数', passed, {
        bufferSame: buf === subView,
        firstPartZero,
        middlePartFilled,
        lastPartZero
      });
      resolve();
    });
  });

  // 测试 52: TypedArray 有 byteOffset 时指定 offset 和 size 参数
  await new Promise((resolve) => {
    const arrayBuffer = new ArrayBuffer(64);
    const fullView = new Uint8Array(arrayBuffer);
    const subView = new Uint8Array(arrayBuffer, 16, 32); // byteOffset=16, length=32
    
    crypto.randomFill(subView, 8, 16, (err, buf) => {
      if (err) {
        addTest('TypedArray 有 byteOffset 时指定 offset 和 size 参数', false, { error: err.message });
        resolve();
        return;
      }
      
      // 检查 arrayBuffer[0-23] 应该为 0
      const firstPartZero = Array.from(fullView.slice(0, 24)).every(b => b === 0);
      // 检查 arrayBuffer[24-39] 应该被填充 (subView[8-23])
      const middlePartFilled = isBufferFilled(fullView.slice(24, 40));
      // 检查 arrayBuffer[40-63] 应该为 0
      const lastPartZero = Array.from(fullView.slice(40)).every(b => b === 0);
      
      const passed = buf === subView && firstPartZero && middlePartFilled && lastPartZero;
      addTest('TypedArray 有 byteOffset 时指定 offset 和 size 参数', passed, {
        bufferSame: buf === subView,
        firstPartZero,
        middlePartFilled,
        lastPartZero
      });
      resolve();
    });
  });

  // ==================== 补充测试: DataView 完整场景 ====================
  
  // 测试 53: DataView 指定 offset 和 size 参数组合
  await new Promise((resolve) => {
    const arrayBuffer = new ArrayBuffer(48);
    const view = new DataView(arrayBuffer);
    const fullBuf = new Uint8Array(arrayBuffer);
    
    crypto.randomFill(view, 16, 16, (err, buf) => {
      if (err) {
        addTest('DataView 指定 offset 和 size 参数组合', false, { error: err.message });
        resolve();
        return;
      }
      
      const firstPartZero = Array.from(fullBuf.slice(0, 16)).every(b => b === 0);
      const middlePartFilled = isBufferFilled(fullBuf.slice(16, 32));
      const lastPartZero = Array.from(fullBuf.slice(32)).every(b => b === 0);
      
      const passed = buf === view && firstPartZero && middlePartFilled && lastPartZero;
      addTest('DataView 指定 offset 和 size 参数组合', passed, {
        bufferSame: buf === view,
        firstPartZero,
        middlePartFilled,
        lastPartZero
      });
      resolve();
    });
  });

  // 测试 54: DataView 有 byteOffset 时的行为
  await new Promise((resolve) => {
    const arrayBuffer = new ArrayBuffer(64);
    const view = new DataView(arrayBuffer, 16, 32); // byteOffset=16, byteLength=32
    const fullBuf = new Uint8Array(arrayBuffer);
    
    crypto.randomFill(view, (err, buf) => {
      if (err) {
        addTest('DataView 有 byteOffset 时的行为', false, { error: err.message });
        resolve();
        return;
      }
      
      const firstPartZero = Array.from(fullBuf.slice(0, 16)).every(b => b === 0);
      const middlePartFilled = isBufferFilled(fullBuf.slice(16, 48));
      const lastPartZero = Array.from(fullBuf.slice(48)).every(b => b === 0);
      
      const passed = buf === view && firstPartZero && middlePartFilled && lastPartZero;
      addTest('DataView 有 byteOffset 时的行为', passed, {
        bufferSame: buf === view,
        firstPartZero,
        middlePartFilled,
        lastPartZero
      });
      resolve();
    });
  });

  // 测试 55: DataView 有 byteOffset 时指定 offset 和 size
  await new Promise((resolve) => {
    const arrayBuffer = new ArrayBuffer(64);
    const view = new DataView(arrayBuffer, 16, 32); // byteOffset=16, byteLength=32
    const fullBuf = new Uint8Array(arrayBuffer);
    
    crypto.randomFill(view, 8, 16, (err, buf) => {
      if (err) {
        addTest('DataView 有 byteOffset 时指定 offset 和 size', false, { error: err.message });
        resolve();
        return;
      }
      
      // arrayBuffer[0-23] 应该为 0
      const firstPartZero = Array.from(fullBuf.slice(0, 24)).every(b => b === 0);
      // arrayBuffer[24-39] 应该被填充
      const middlePartFilled = isBufferFilled(fullBuf.slice(24, 40));
      // arrayBuffer[40-63] 应该为 0
      const lastPartZero = Array.from(fullBuf.slice(40)).every(b => b === 0);
      
      const passed = buf === view && firstPartZero && middlePartFilled && lastPartZero;
      addTest('DataView 有 byteOffset 时指定 offset 和 size', passed, {
        bufferSame: buf === view,
        firstPartZero,
        middlePartFilled,
        lastPartZero
      });
      resolve();
    });
  });

  // ==================== 补充测试: 多余参数和边界情况 ====================
  
  // 测试 56: 正常使用所有参数 (buffer, offset, size, callback)
  await new Promise((resolve) => {
    const buffer = Buffer.alloc(16, 0);
    crypto.randomFill(buffer, 0, 8, (err, buf) => {
      const firstPartFilled = isBufferFilled(buffer.slice(0, 8));
      const secondPartZero = buffer.slice(8).every(b => b === 0);
      const passed = !err && buf === buffer && firstPartFilled && secondPartZero;
      addTest('使用所有参数 (buffer, offset, size, callback)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        firstPartFilled,
        secondPartZero
      });
      resolve();
    });
  });

  // 测试 57: buffer 长度为 1，offset=0
  await new Promise((resolve) => {
    const buffer = Buffer.alloc(1, 0);
    crypto.randomFill(buffer, 0, (err, buf) => {
      const passed = !err && buf === buffer && buffer.length === 1;
      addTest('buffer 长度为 1，offset=0', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        length: buffer.length,
        value: buffer[0]
      });
      resolve();
    });
  });

  // 测试 58: buffer 长度为 1，offset=1
  await new Promise((resolve) => {
    const buffer = Buffer.alloc(1, 0);
    crypto.randomFill(buffer, 1, (err, buf) => {
      const passed = !err && buf === buffer && buffer[0] === 0;
      addTest('buffer 长度为 1，offset=1 (应返回空填充)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        valueUnchanged: buffer[0] === 0
      });
      resolve();
    });
  });

  // 测试 59: Buffer.alloc(0) - 空 Buffer
  await new Promise((resolve) => {
    const buffer = Buffer.alloc(0);
    crypto.randomFill(buffer, (err, buf) => {
      const passed = !err && buf === buffer && buffer.length === 0;
      addTest('空 Buffer (长度为 0)', passed, {
        error: err ? err.message : null,
        bufferSame: buf === buffer,
        length: buffer.length
      });
      resolve();
    });
  });

  // 测试 60: Buffer.slice() 创建的视图
  await new Promise((resolve) => {
    const parentBuffer = Buffer.alloc(40, 0);
    const sliceBuffer = parentBuffer.slice(10, 30);
    
    crypto.randomFill(sliceBuffer, (err, buf) => {
      if (err) {
        addTest('Buffer.slice() 创建的视图', false, { error: err.message });
        resolve();
        return;
      }
      
      // 检查父 buffer 的前10个字节应该为0
      const firstPartZero = parentBuffer.slice(0, 10).every(b => b === 0);
      // 检查父 buffer 的中间20个字节应该被填充
      const middlePartFilled = isBufferFilled(parentBuffer.slice(10, 30));
      // 检查父 buffer 的后10个字节应该为0
      const lastPartZero = parentBuffer.slice(30).every(b => b === 0);
      
      const passed = buf === sliceBuffer && firstPartZero && middlePartFilled && lastPartZero;
      addTest('Buffer.slice() 创建的视图 (应修改父 buffer)', passed, {
        bufferSame: buf === sliceBuffer,
        firstPartZero,
        middlePartFilled,
        lastPartZero
      });
      resolve();
    });
  });

  // 测试 61: 大量数据的熵检查
  await new Promise((resolve) => {
    const buffer = Buffer.allocUnsafe(1024);
    crypto.randomFill(buffer, (err, buf) => {
      if (err) {
        addTest('大量数据的熵检查', false, { error: err.message });
        resolve();
        return;
      }

      // 统计每个字节值出现的次数
      const counts = new Array(256).fill(0);
      for (let i = 0; i < buffer.length; i++) {
        counts[buffer[i]]++;
      }

      // 检查是否有足够多的不同字节值（至少50%的可能值）
      let uniqueValues = 0;
      for (let i = 0; i < 256; i++) {
        if (counts[i] > 0) uniqueValues++;
      }

      const passed = uniqueValues >= 128;
      addTest('大量数据的熵检查 (1024 bytes)', passed, {
        uniqueValues,
        totalPossibleValues: 256,
        entropyRatio: (uniqueValues / 256 * 100).toFixed(2) + '%',
        passed
      });
      resolve();
    });
  });

  // 测试 62: 避免全0或全255
  await new Promise((resolve) => {
    const buffer = Buffer.allocUnsafe(256);
    crypto.randomFill(buffer, (err, buf) => {
      if (err) {
        addTest('避免全0或全255', false, { error: err.message });
        resolve();
        return;
      }

      // 检查是否所有字节都相同
      const firstByte = buffer[0];
      let allSame = true;
      for (let i = 1; i < buffer.length; i++) {
        if (buffer[i] !== firstByte) {
          allSame = false;
          break;
        }
      }

      const passed = !allSame;
      addTest('字节分布不均匀 (避免全0或全255)', passed, {
        allSame,
        firstByte,
        passed
      });
      resolve();
    });
  });

  // 测试 63: SharedArrayBuffer 支持的 Uint8Array (如果支持)
  if (typeof SharedArrayBuffer !== 'undefined') {
    await new Promise((resolve) => {
      const sab = new SharedArrayBuffer(32);
      const arr = new Uint8Array(sab);
      
      crypto.randomFill(arr, (err, buf) => {
        const passed = !err && buf === arr && isBufferFilled(arr);
        addTest('SharedArrayBuffer 支持的 Uint8Array', passed, {
          error: err ? err.message : null,
          bufferSame: buf === arr,
          isFilled: isBufferFilled(arr),
          byteLength: arr.byteLength
        });
        resolve();
      });
    });
  } else {
    addTest('SharedArrayBuffer 支持的 Uint8Array', true, {
      note: '当前环境不支持 SharedArrayBuffer，跳过测试'
    });
  }

  // 测试 64: callback 为 null (应同步抛出错误)
  try {
    const buffer = Buffer.allocUnsafe(16);
    crypto.randomFill(buffer, null);
    addTest('callback 为 null (应抛出 TypeError)', false, {
      note: '应该抛出同步错误'
    });
  } catch (err) {
    const isTypeError = err instanceof TypeError || (err.code === 'ERR_INVALID_ARG_TYPE');
    addTest('callback 为 null (应抛出 TypeError)', isTypeError, {
      errorType: err instanceof TypeError ? 'TypeError' : 'Error',
      errorCode: err.code,
      errorMessage: err.message,
      isTypeError
    });
  }

  // 测试 65: 连续部分填充
  const buffer65 = Buffer.alloc(30, 0);
  
  await new Promise((resolve) => {
    crypto.randomFill(buffer65, 0, 10, (err, buf) => {
      resolve();
    });
  });
  const part1 = Buffer.from(buffer65.slice(0, 10));
  
  await new Promise((resolve) => {
    crypto.randomFill(buffer65, 10, 10, (err, buf) => {
      resolve();
    });
  });
  const part2 = Buffer.from(buffer65.slice(10, 20));
  
  await new Promise((resolve) => {
    crypto.randomFill(buffer65, 20, 10, (err, buf) => {
      resolve();
    });
  });
  const part3 = Buffer.from(buffer65.slice(20, 30));
  
  const allPartsFilled = isBufferFilled(part1) && isBufferFilled(part2) && isBufferFilled(part3);
  const allPartsDifferent = !part1.equals(part2) && !part2.equals(part3) && !part1.equals(part3);
  
  addTest('连续部分填充 (各部分独立且随机)', allPartsFilled && allPartsDifferent, {
    part1Filled: isBufferFilled(part1),
    part2Filled: isBufferFilled(part2),
    part3Filled: isBufferFilled(part3),
    allPartsDifferent,
    passed: allPartsFilled && allPartsDifferent
  });

  // ==================== 打印测试结果 ====================
  console.log('\n========================================');
  console.log('测试结果汇总');
  console.log('========================================');
  console.log(`总测试数: ${testResults.totalTests}`);
  console.log(`通过: ${testResults.passedTests} ✅`);
  console.log(`失败: ${testResults.failedTests} ❌`);
  console.log(`成功率: ${((testResults.passedTests / testResults.totalTests) * 100).toFixed(2)}%`);
  console.log('========================================\n');

  console.log('详细测试结果:\n');
  testResults.tests.forEach((test, index) => {
    console.log(`${index + 1}. ${test.status} ${test.name}`);
    const details = { ...test };
    delete details.name;
    delete details.status;
    if (Object.keys(details).length > 0) {
      console.log(`   ${JSON.stringify(details, null, 2).split('\n').join('\n   ')}`);
    }
  });

  return testResults;
}

// 执行测试并返回结果
return Promise.resolve()
  .then(async () => {
    try {
      const results = await runTests();
      console.log('\n\n========================================');
      console.log('测试完成!');
      console.log('========================================');
      return results;
    } catch (err) {
      console.error('测试执行出错:', err);
      return {
        success: false,
        error: err.message,
        stack: err.stack
      };
    }
  });
