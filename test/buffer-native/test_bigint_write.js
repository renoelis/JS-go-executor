/**
 * 测试 BigInt 写入方法优化
 */

const { Buffer } = require('buffer');

try {
  const buf = Buffer.allocUnsafe(32);
  const results = [];

  // 测试 writeBigInt64BE
  const val1 = 0x0102030405060708n;
  buf.writeBigInt64BE(val1, 0);
  const read1 = buf.readBigInt64BE(0);
  results.push({
    method: 'writeBigInt64BE',
    written: val1.toString(16),
    read: read1.toString(16),
    match: val1 === read1
  });

  // 测试 writeBigInt64LE
  const val2 = 0x0102030405060708n;
  buf.writeBigInt64LE(val2, 8);
  const read2 = buf.readBigInt64LE(8);
  results.push({
    method: 'writeBigInt64LE',
    written: val2.toString(16),
    read: read2.toString(16),
    match: val2 === read2
  });

  // 测试 writeBigUInt64BE
  const val3 = 0xFFFFFFFFFFFFFFFFn;
  buf.writeBigUInt64BE(val3, 16);
  const read3 = buf.readBigUInt64BE(16);
  results.push({
    method: 'writeBigUInt64BE',
    written: val3.toString(16),
    read: read3.toString(16),
    match: val3 === read3
  });

  // 测试 writeBigUInt64LE
  const val4 = 0xFFFFFFFFFFFFFFFFn;
  buf.writeBigUInt64LE(val4, 24);
  const read4 = buf.readBigUInt64LE(24);
  results.push({
    method: 'writeBigUInt64LE',
    written: val4.toString(16),
    read: read4.toString(16),
    match: val4 === read4
  });

  // 测试负数
  const val5 = -1n;
  buf.writeBigInt64BE(val5, 0);
  const read5 = buf.readBigInt64BE(0);
  results.push({
    method: 'writeBigInt64BE (negative)',
    written: val5.toString(),
    read: read5.toString(),
    match: val5 === read5
  });

  const allPassed = results.every(r => r.match);

  const testResults = {
    success: allPassed,
    results: results,
    summary: `${results.filter(r => r.match).length}/${results.length} passed`
  };

  console.log(JSON.stringify(testResults, null, 2));
  return testResults;

} catch (error) {
  const testResults = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(testResults, null, 2));
  return testResults;
}
