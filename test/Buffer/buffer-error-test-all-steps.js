// Buffer 错误处理完整测试（1-53）
// 将所有已验证通过的分段测试合并

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

// 静态方法错误（测试 1-4）
expectError('测试 1: Buffer.alloc(-1)', function() { Buffer.alloc(-1); });
expectError('测试 2: Buffer.allocUnsafe(-1)', function() { Buffer.allocUnsafe(-1); });
expectError('测试 3: Buffer.from(null)', function() { Buffer.from(null); });
expectError('测试 4: Buffer.from(undefined)', function() { Buffer.from(undefined); });

const testBuf = Buffer.alloc(20);

// 整数范围检查（测试 5-12）
expectError('测试 5: writeInt16BE(40000)', function() { testBuf.writeInt16BE(40000, 0); });
expectError('测试 6: writeInt16LE(-40000)', function() { testBuf.writeInt16LE(-40000, 0); });
expectError('测试 7: writeUInt16BE(-1)', function() { testBuf.writeUInt16BE(-1, 0); });
expectError('测试 8: writeUInt16LE(70000)', function() { testBuf.writeUInt16LE(70000, 0); });
expectError('测试 9: writeInt32BE(3000000000)', function() { testBuf.writeInt32BE(3000000000, 0); });
expectError('测试 10: writeInt32LE(-0x87654321)', function() { testBuf.writeInt32LE(-0x87654321, 0); });
expectError('测试 11: writeUInt32BE(-1)', function() { testBuf.writeUInt32BE(-1, 0); });
expectError('测试 12: writeUInt32LE(0x100000000)', function() { testBuf.writeUInt32LE(0x100000000, 0); });

// 读取越界（测试 13-24）
expectError('测试 13: readInt8(30)', function() { testBuf.readInt8(30); });
expectError('测试 14: readUInt8(25)', function() { testBuf.readUInt8(25); });
expectError('测试 15: readInt16BE(20)', function() { testBuf.readInt16BE(20); });
expectError('测试 16: readInt16LE(19)', function() { testBuf.readInt16LE(19); });
expectError('测试 17: readInt32BE(18)', function() { testBuf.readInt32BE(18); });
expectError('测试 18: readInt32LE(17)', function() { testBuf.readInt32LE(17); });
expectError('测试 19: readFloatBE(18)', function() { testBuf.readFloatBE(18); });
expectError('测试 20: readFloatLE(17)', function() { testBuf.readFloatLE(17); });
expectError('测试 21: readDoubleBE(15)', function() { testBuf.readDoubleBE(15); });
expectError('测试 22: readDoubleLE(13)', function() { testBuf.readDoubleLE(13); });
expectError('测试 23: readBigInt64BE(15)', function() { testBuf.readBigInt64BE(15); });
expectError('测试 24: readBigUInt64LE(13)', function() { testBuf.readBigUInt64LE(13); });

// 写入越界（测试 25-30）
expectError('测试 25: writeInt8(10, 25)', function() { testBuf.writeInt8(10, 25); });
expectError('测试 26: writeInt16BE(100, 20)', function() { testBuf.writeInt16BE(100, 20); });
expectError('测试 27: writeInt32LE(100, 17)', function() { testBuf.writeInt32LE(100, 17); });
expectError('测试 28: writeFloatBE(1.0, 18)', function() { testBuf.writeFloatBE(1.0, 18); });
expectError('测试 29: writeDoubleBE(1.0, 15)', function() { testBuf.writeDoubleBE(1.0, 15); });
expectError('测试 30: writeBigInt64BE(BigInt(123), 15)', function() { testBuf.writeBigInt64BE(BigInt(123), 15); });

// 字节交换（测试 31-33）
expectError('测试 31: swap16() 奇数长度', function() { Buffer.alloc(3).swap16(); });
expectError('测试 32: swap32() 长度不是4的倍数', function() { Buffer.alloc(5).swap32(); });
expectError('测试 33: swap64() 长度不是8的倍数', function() { Buffer.alloc(10).swap64(); });

// 缺少参数（测试 34-38）
expectError('测试 34: writeInt8() 无值', function() { testBuf.writeInt8(); });
expectError('测试 35: writeInt16BE() 无值', function() { testBuf.writeInt16BE(); });
expectError('测试 36: writeInt32BE() 无值', function() { testBuf.writeInt32BE(); });
expectError('测试 37: writeFloatBE() 无值', function() { testBuf.writeFloatBE(); });
expectError('测试 38: writeDoubleBE() 无值', function() { testBuf.writeDoubleBE(); });

// 可变长度参数（测试 39-43）
expectError('测试 39: readIntBE(0, 7)', function() { testBuf.readIntBE(0, 7); });
expectError('测试 40: readIntBE(0, 0)', function() { testBuf.readIntBE(0, 0); });
expectError('测试 41: readUIntLE(0, 7)', function() { testBuf.readUIntLE(0, 7); });
expectError('测试 42: writeIntBE(100, 0, 7)', function() { testBuf.writeIntBE(100, 0, 7); });
expectError('测试 43: writeUIntLE(100, 0, 0)', function() { testBuf.writeUIntLE(100, 0, 0); });

// 边界情况（测试 44-52）
expectNoError('测试 44: Buffer.isBuffer(null)', function() { 
  const r = Buffer.isBuffer(null); 
  if (r !== false) throw new Error('应返回 false');
});
expectNoError('测试 45: Buffer.isBuffer(undefined)', function() { 
  const r = Buffer.isBuffer(undefined); 
  if (r !== false) throw new Error('应返回 false');
});
expectNoError('测试 46: Buffer.isBuffer("string")', function() { 
  const r = Buffer.isBuffer("string"); 
  if (r !== false) throw new Error('应返回 false');
});
expectNoError('测试 47: Buffer.concat([])', function() { 
  const r = Buffer.concat([]);
  if (!Buffer.isBuffer(r) || r.length !== 0) throw new Error('应返回空Buffer');
});
expectNoError('测试 48: slice(20, 10)', function() { 
  const s = testBuf.slice(20, 10);
  if (!Buffer.isBuffer(s)) throw new Error('应返回Buffer');
});
expectNoError('测试 49: writeFloatBE(NaN)', function() { 
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(NaN, 0);
  const val = buf.readFloatBE(0);
  if (val === val) throw new Error('NaN !== NaN');
});
expectNoError('测试 50: writeDoubleBE(Infinity)', function() { 
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Infinity, 0);
  const val = buf.readDoubleBE(0);
  if (val !== Infinity) throw new Error('应该是Infinity');
});
expectNoError('测试 51: 索引越界', function() { 
  if (testBuf[100] !== undefined || testBuf[-1] !== undefined) {
    throw new Error('越界应返回undefined');
  }
});
expectNoError('测试 52: 值自动取模', function() { 
  const buf = Buffer.alloc(1);
  buf[0] = 300;
  if (buf[0] !== 44) throw new Error('应该自动取模');
});

// BigInt类型错误（测试 53）
try {
  testBuf.writeBigInt64BE(123, 0);
  addResult('测试 53: writeBigInt64BE(123)', false, '应该要求BigInt类型');
} catch (error) {
  const passed = error.message.toLowerCase().indexOf('bigint') !== -1 || 
                 error.message.toLowerCase().indexOf('type') !== -1;
  addResult('测试 53: writeBigInt64BE(123)', passed, 
            passed ? '正确要求BigInt类型' : '未正确检测类型');
}

return {
  success: results.failed === 0,
  executionMode: 'Complete Error Handling Tests',
  timestamp: new Date().toISOString(),
  summary: {
    total: results.passed + results.failed,
    passed: results.passed,
    failed: results.failed,
    passRate: ((results.passed / (results.passed + results.failed)) * 100).toFixed(1) + '%'
  },
  note: 'Buffer模块完整错误处理测试 - 53个测试用例'
};










