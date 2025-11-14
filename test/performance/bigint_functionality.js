const { Buffer } = require('buffer');

// 功能完整性测试
function testBigIntFunctionality() {
  const tests = [];

  // Test 1: BigInt 构造
  tests.push({
    name: 'BigInt构造',
    fn: () => {
      const a = BigInt(100);
      const b = BigInt("0xFFFFFFFFFFFFFFFF");
      return typeof a === 'bigint' && typeof b === 'bigint';
    }
  });

  // Test 2: Buffer 写入读取
  tests.push({
    name: 'Buffer写入读取',
    fn: () => {
      const buf = Buffer.alloc(8);
      buf.writeBigInt64BE(123n, 0);
      const val = buf.readBigInt64BE(0);
      return val === 123n;
    }
  });

  // Test 3: asIntN 操作
  tests.push({
    name: 'asIntN操作',
    fn: () => {
      const result = BigInt.asIntN(8, 128n);
      return result === -128n;
    }
  });

  // Test 4: typeof 检测
  tests.push({
    name: 'typeof检测',
    fn: () => {
      return typeof 100n === 'bigint' && typeof BigInt(200) === 'bigint';
    }
  });

  // Test 5: Symbol 错误
  tests.push({
    name: 'Symbol错误处理',
    fn: () => {
      try {
        const buf = Buffer.alloc(8);
        buf.writeBigInt64BE(Symbol('test'), 0);
        return false;
      } catch (e) {
        return e.message.includes('Symbol');
      }
    }
  });

  const results = tests.map(test => {
    try {
      const pass = test.fn();
      return { name: test.name, status: pass ? '✅' : '❌', pass };
    } catch (error) {
      return { name: test.name, status: '❌', pass: false, error: error.message };
    }
  });

  const allPass = results.every(r => r.pass);

  return {
    success: allPass,
    results,
    summary: `${results.filter(r => r.pass).length}/${results.length} 测试通过`
  };
}

try {
  const result = testBigIntFunctionality();
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
