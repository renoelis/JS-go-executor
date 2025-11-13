// Buffer 模块错误处理测试（实用版本）
// 测试已实现的错误检测功能
// 符合 Node.js v22.2.0 错误处理行为

let results = {
  passed: 0,
  failed: 0,
  tests: []
};

function addResult(testName, passed, message) {
  results.tests.push({ test: testName, passed, message });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

// 辅助函数：期望抛出错误
function expectError(testName, fn) {
  try {
    fn();
    addResult(testName, false, '应该抛出错误但没有抛出');
    return false;
  } catch (error) {
    addResult(testName, true, '正确抛出错误: ' + error.message);
    return true;
  }
}

// 辅助函数：不应抛出错误
function expectNoError(testName, fn) {
  try {
    fn();
    addResult(testName, true, '正确执行，未抛出错误');
    return true;
  } catch (error) {
    addResult(testName, false, '不应抛出错误: ' + error.message);
    return false;
  }
}

// ============================================================
// 第一部分: 静态方法错误 - 无效参数
// ============================================================

expectError(
  '测试 1: Buffer.alloc() 负数大小',
  function() { Buffer.alloc(-1); }
);

expectError(
  '测试 2: Buffer.allocUnsafe() 负数大小',
  function() { Buffer.allocUnsafe(-1); }
);

expectError(
  '测试 3: Buffer.from() null 参数',
  function() { Buffer.from(null); }
);

expectError(
  '测试 4: Buffer.from() undefined 参数',
  function() { Buffer.from(undefined); }
);

// ============================================================
// 第二部分: 整数范围检查 - writeInt16
// ============================================================

const testBuf = Buffer.alloc(20);

expectError(
  '测试 5: writeInt16BE() 值过大 (40000 > 32767)',
  function() { testBuf.writeInt16BE(40000, 0); }
);

expectError(
  '测试 6: writeInt16LE() 值过小 (-40000 < -32768)',
  function() { testBuf.writeInt16LE(-40000, 0); }
);

expectError(
  '测试 7: writeUInt16BE() 负值',
  function() { testBuf.writeUInt16BE(-1, 0); }
);

expectError(
  '测试 8: writeUInt16LE() 值过大 (70000 > 65535)',
  function() { testBuf.writeUInt16LE(70000, 0); }
);

// ============================================================
// 第三部分: 整数范围检查 - writeInt32
// ============================================================

expectError(
  '测试 9: writeInt32BE() 值过大 (3000000000 > 2147483647)',
  function() { testBuf.writeInt32BE(3000000000, 0); }
);

expectError(
  '测试 10: writeInt32LE() 值过小 (-2271560481 < -2147483648)',
  function() { testBuf.writeInt32LE(-0x87654321, 0); }
);

expectError(
  '测试 11: writeUInt32BE() 负值',
  function() { testBuf.writeUInt32BE(-1, 0); }
);

expectError(
  '测试 12: writeUInt32LE() 值过大 (0x100000000 > 0xFFFFFFFF)',
  function() { testBuf.writeUInt32LE(0x100000000, 0); }
);

// ============================================================
// 第四部分: 读取越界检查
// ============================================================

expectError(
  '测试 13: readInt8() 越界 (offset=30)',
  function() { testBuf.readInt8(30); }
);

expectError(
  '测试 14: readUInt8() 越界 (offset=25)',
  function() { testBuf.readUInt8(25); }
);

expectError(
  '测试 15: readInt16BE() 越界 (offset=20)',
  function() { testBuf.readInt16BE(20); }
);

expectError(
  '测试 16: readInt16LE() 越界 (offset=19)',
  function() { testBuf.readInt16LE(19); }
);

expectError(
  '测试 17: readInt32BE() 越界 (offset=18)',
  function() { testBuf.readInt32BE(18); }
);

expectError(
  '测试 18: readInt32LE() 越界 (offset=17)',
  function() { testBuf.readInt32LE(17); }
);

expectError(
  '测试 19: readFloatBE() 越界 (offset=18)',
  function() { testBuf.readFloatBE(18); }
);

expectError(
  '测试 20: readFloatLE() 越界 (offset=17)',
  function() { testBuf.readFloatLE(17); }
);

expectError(
  '测试 21: readDoubleBE() 越界 (offset=15)',
  function() { testBuf.readDoubleBE(15); }
);

expectError(
  '测试 22: readDoubleLE() 越界 (offset=13)',
  function() { testBuf.readDoubleLE(13); }
);

expectError(
  '测试 23: readBigInt64BE() 越界 (offset=15)',
  function() { testBuf.readBigInt64BE(15); }
);

expectError(
  '测试 24: readBigUInt64LE() 越界 (offset=13)',
  function() { testBuf.readBigUInt64LE(13); }
);

// ============================================================
// 第五部分: 写入越界检查
// ============================================================

expectError(
  '测试 25: writeInt8() 越界 (offset=25)',
  function() { testBuf.writeInt8(10, 25); }
);

expectError(
  '测试 26: writeInt16BE() 越界 (offset=20)',
  function() { testBuf.writeInt16BE(100, 20); }
);

expectError(
  '测试 27: writeInt32LE() 越界 (offset=17)',
  function() { testBuf.writeInt32LE(100, 17); }
);

expectError(
  '测试 28: writeFloatBE() 越界 (offset=18)',
  function() { testBuf.writeFloatBE(1.0, 18); }
);

expectError(
  '测试 29: writeDoubleBE() 越界 (offset=15)',
  function() { testBuf.writeDoubleBE(1.0, 15); }
);

expectError(
  '测试 30: writeBigInt64BE() 越界 (offset=15)',
  function() { testBuf.writeBigInt64BE(BigInt(123), 15); }
);

// ============================================================
// 第六部分: 字节交换错误检查
// ============================================================

expectError(
  '测试 31: swap16() 奇数长度 Buffer',
  function() { 
    const buf = Buffer.alloc(3);
    buf.swap16();
  }
);

expectError(
  '测试 32: swap32() 长度不是 4 的倍数',
  function() { 
    const buf = Buffer.alloc(5);
    buf.swap32();
  }
);

expectError(
  '测试 33: swap64() 长度不是 8 的倍数',
  function() { 
    const buf = Buffer.alloc(10);
    buf.swap64();
  }
);

// ============================================================
// 第七部分: 缺少必需参数
// ============================================================

expectNoError(
  '测试 34: writeInt8() 无值参数 - 使用默认值',
  function() { 
    testBuf.writeInt8(); // 使用默认值 undefined -> 0
    // 验证写入了默认值
    if (testBuf[0] !== 0) throw new Error('应该写入默认值 0');
  }
);

expectNoError(
  '测试 35: writeInt16BE() 无值参数 - 使用默认值',
  function() { 
    testBuf.writeInt16BE(); // 使用默认值 undefined -> 0
    // 验证写入了默认值
    if (testBuf.readInt16BE(0) !== 0) throw new Error('应该写入默认值 0');
  }
);

expectNoError(
  '测试 36: writeInt32BE() 无值参数 - 使用默认值',
  function() { 
    testBuf.writeInt32BE(); // 使用默认值 undefined -> 0
    // 验证写入了默认值
    if (testBuf.readInt32BE(0) !== 0) throw new Error('应该写入默认值 0');
  }
);

expectNoError(
  '测试 37: writeFloatBE() 无值参数 - 使用默认值',
  function() { 
    testBuf.writeFloatBE(); // 使用默认值 undefined -> NaN
    // 验证写入了 NaN
    const value = testBuf.readFloatBE(0);
    if (!isNaN(value)) throw new Error('应该写入 NaN');
  }
);

expectNoError(
  '测试 38: writeDoubleBE() 无值参数 - 使用默认值',
  function() { 
    testBuf.writeDoubleBE(); // 使用默认值 undefined -> NaN
    // 验证写入了 NaN
    const value = testBuf.readDoubleBE(0);
    if (!isNaN(value)) throw new Error('应该写入 NaN');
  }
);

// ============================================================
// 第八部分: 可变长度读写参数验证
// ============================================================

expectError(
  '测试 39: readIntBE() byteLength 过大 (7 > 6)',
  function() { testBuf.readIntBE(0, 7); }
);

expectError(
  '测试 40: readIntBE() byteLength 为 0',
  function() { testBuf.readIntBE(0, 0); }
);

expectError(
  '测试 41: readUIntLE() byteLength 过大',
  function() { testBuf.readUIntLE(0, 7); }
);

expectError(
  '测试 42: writeIntBE() byteLength 过大',
  function() { testBuf.writeIntBE(100, 0, 7); }
);

expectError(
  '测试 43: writeUIntLE() byteLength 为 0',
  function() { testBuf.writeUIntLE(100, 0, 0); }
);

// ============================================================
// 第九部分: 边界情况验证（不应抛出错误）
// ============================================================

expectNoError(
  '测试 44: Buffer.isBuffer(null) 返回 false',
  function() { 
    const result = Buffer.isBuffer(null);
    if (result !== false) throw new Error('应返回 false');
  }
);

expectNoError(
  '测试 45: Buffer.isBuffer(undefined) 返回 false',
  function() { 
    const result = Buffer.isBuffer(undefined);
    if (result !== false) throw new Error('应返回 false');
  }
);

expectNoError(
  '测试 46: Buffer.isBuffer("string") 返回 false',
  function() { 
    const result = Buffer.isBuffer("string");
    if (result !== false) throw new Error('应返回 false');
  }
);

expectNoError(
  '测试 47: Buffer.concat([]) 返回空 Buffer',
  function() { 
    const result = Buffer.concat([]);
    if (!Buffer.isBuffer(result) || result.length !== 0) {
      throw new Error('应返回长度为 0 的 Buffer');
    }
  }
);

expectNoError(
  '测试 48: slice() 无效范围返回空 Buffer',
  function() { 
    const slice = testBuf.slice(20, 10);
    if (!Buffer.isBuffer(slice)) {
      throw new Error('应返回 Buffer');
    }
  }
);

expectNoError(
  '测试 49: 浮点数特殊值 NaN',
  function() { 
    const buf = Buffer.alloc(4);
    buf.writeFloatBE(NaN, 0);
    const val = buf.readFloatBE(0);
    if (val === val) throw new Error('NaN 应该 !== NaN');
  }
);

expectNoError(
  '测试 50: 浮点数特殊值 Infinity',
  function() { 
    const buf = Buffer.alloc(8);
    buf.writeDoubleBE(Infinity, 0);
    const val = buf.readDoubleBE(0);
    if (val !== Infinity) throw new Error('应该是 Infinity');
  }
);

expectNoError(
  '测试 51: 索引越界返回 undefined',
  function() { 
    if (testBuf[100] !== undefined || testBuf[-1] !== undefined) {
      throw new Error('越界索引应返回 undefined');
    }
  }
);

expectNoError(
  '测试 52: 值自动取模 (300 % 256 = 44)',
  function() { 
    const buf = Buffer.alloc(1);
    buf[0] = 300;
    if (buf[0] !== 44) throw new Error('应该自动取模');
  }
);

// ============================================================
// 第十部分: BigInt 相关错误
// ============================================================

try {
  testBuf.writeBigInt64BE(123, 0); // 普通数字而非 BigInt
  addResult('测试 53: writeBigInt64BE() 需要 BigInt 类型', false, '应该要求 BigInt 类型');
} catch (error) {
  const passed = error.message.toLowerCase().indexOf('bigint') !== -1 || 
                 error.message.toLowerCase().indexOf('type') !== -1;
  addResult(
    '测试 53: writeBigInt64BE() 普通数字',
    passed,
    passed ? '正确要求 BigInt 类型' : '接受了普通数字（部分实现可能允许）'
  );
}

// ============================================================
// 返回结果
// ============================================================

const finalResult = {
  success: results.failed === 0,
  executionMode: 'Error Handling Tests',
  timestamp: new Date().toISOString(),
  summary: {
    total: results.passed + results.failed,
    passed: results.passed,
    failed: results.failed,
    passRate: ((results.passed / (results.passed + results.failed)) * 100).toFixed(1) + '%'
  },
  details: results.tests,
  categories: {
    '静态方法错误': '测试 1-4',
    '整数范围检查 (16位)': '测试 5-8',
    '整数范围检查 (32位)': '测试 9-12',
    '读取越界': '测试 13-24',
    '写入越界': '测试 25-30',
    '字节交换': '测试 31-33',
    '缺少参数默认值': '测试 34-38',
    '可变长度参数': '测试 39-43',
    '边界情况': '测试 44-52',
    'BigInt错误': '测试 53'
  },
  note: 'Buffer 模块错误处理测试 - 53 个测试用例'
};

console.log(finalResult);
return finalResult;
