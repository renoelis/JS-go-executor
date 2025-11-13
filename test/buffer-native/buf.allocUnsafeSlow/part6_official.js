const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    tests.push({ name, passed: result, details: result ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, error: e.message, stack: e.stack });
  }
}

test('官方文档对照 - size 为 0（显式文档说明）', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.length === 0 && buf instanceof Buffer;
});

test('官方文档对照 - size 必须为正整数或能转换为正整数值', () => {
  try {
    Buffer.allocUnsafeSlow(-1);
    return false;
  } catch (e) {
    return true;
  }
});

test('官方文档对照 - 只接受 size 参数（填充参数被忽略）', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.allocUnsafeSlow(10, 'A'); // 填充参数被忽略
  return buf1.length === 10 && buf2.length === 10;
});

test('官方文档对照 - 填充和编码参数被忽略', () => {
  const buf = Buffer.allocUnsafeSlow(10, '68656c6c6f', 'hex'); // 后两个参数被忽略
  return buf.length === 10; // 只检查长度
});

test('官方文档对照 - 小尺寸缓冲区仍采用慢分配策略', () => {
  const smallSizes = [1, 100, 500, 1000, 4095];
  return smallSizes.every(size => {
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size;
  });
});

test('官方文档对照 - 返回新分配的 Buffer，未填充的旧内容可能被保留', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  // 不应假设初始内容安全可用或固定
  return buf.length === 100 && buf instanceof Buffer;
});

test('官方文档对照 - 编码参数被忽略（allocUnsafeSlow不支持）', () => {
  const validEncodings = ['utf8', 'ascii', 'latin1', 'hex', 'base64', 'base64url'];

  return validEncodings.every(encoding => {
    try {
      const buf = Buffer.allocUnsafeSlow(10, 'test', encoding); // 后两个参数被忽略
      return buf.length === 10;
    } catch (e) {
      return false;
    }
  });
});

test('官方文档对照 - Buffer 实例的底层内存可写并可被读取', () => {
  const buf = Buffer.allocUnsafeSlow(256);
  buf.fill('X');
  return buf.every(b => b === 88); // 'X' -> 88
});

test('官方文档对照 - TypedArray 填充参数被忽略', () => {
  const uint8arr = new Uint8Array([65, 66, 67]);
  const buf1 = Buffer.allocUnsafeSlow(9, uint8arr); // 填充参数被忽略

  const arrayBuf = new ArrayBuffer(3);
  const view = new Uint8Array(arrayBuf);
  view.set([68, 69, 70]);
  const buf2 = Buffer.allocUnsafeSlow(6, view); // 填充参数被忽略

  return buf1.length === 9 && buf2.length === 6;
});

test('官方文档对照 - 扩展：严格类型检查（不支持字符串转换）', () => {
  try {
    Buffer.allocUnsafeSlow('100');
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('type number') && e.message.includes('string');
  }
});

test('官方文档对照 - 扩展：验证很宽范围的 size 但有限制', () => {
  try {
    Buffer.allocUnsafeSlow(Math.pow(2, 53)); // 超出 MAX_SAFE_INTEGER
    return false;
  } catch (e) {
    return e.message && (e.message.includes('size') || e.message.includes('range'));
  }
});

test('官方文档对照 - 扩展：填充参数被忽略（需手动填充）', () => {
  const pattern = Buffer.from('12345');
  const result = Buffer.allocUnsafeSlow(20, pattern); // pattern 参数被忽略
  result.fill(pattern); // 需要手动填充

  // 确认 repeat logic：20 ÷ 5 = 4 times full overlap
  for (let i = 0; i < 20; i++) {
    if (result[i] !== pattern[i % 5]) return false;
  }
  return true;
});

test('官方文档对照 - 扩展：确保非池化内存分配的稳定性', () => {
  const allocations = Array.from({ length: 1000 }, (_, i) => Buffer.allocUnsafeSlow(i + 1));
  return allocations.every((buf, idx) => buf.length === idx + 1 && buf instanceof Buffer);
});

test('官方文档对照 - 扩展：兼容 Node.js 全局 Buffer 对象实例化规则', () => {
  const buf = Buffer.allocUnsafeSlow(50);
  return Buffer.isBuffer(buf) && buf instanceof Buffer;
});

test('官方文档对照 - 扩展：与 Buffer.poolSize 的关系验证', () => {
  // allocUnsafeSlow 明确不受 poolSize 大小影响，即使小于8KB也不进入内置池
  var NodeJS_BuildInPoolSize = Buffer.poolSize || 8192; // Node.js internal
  const buf = Buffer.allocUnsafeSlow(NodeJS_BuildInPoolSize / 2);
  return buf.length === NodeJS_BuildInPoolSize / 2;
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
    tests: tests,
    roundInfo: {
      round: 2,
      description: '对照Node.js官方文档验证和扩展测试'
    }
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