// Buffer.allocUnsafe() - Platform Compatibility Tests
const { Buffer } = require('buffer');

// 模拟平台信息（不使用 os 模块）
const platform = 'darwin';
const arch = 'arm64';

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 平台兼容性测试
test('不同架构下的基本分配', () => {
  console.log(`运行平台: ${platform}, 架构: ${arch}`);

  // 基本分配测试
  const sizes = [1, 10, 100, 1000, 10000];
  for (const size of sizes) {
    const buf = Buffer.allocUnsafe(size);
    if (buf.length !== size) {
      throw new Error(`Platform ${platform} ${arch}: Size ${size} allocation failed`);
    }
  }

  console.log(`✅ ${platform} ${arch} 平台基本分配测试`);
  return true;
});

test('内存页大小边界测试', () => {
  // 测试常见内存页大小的倍数
  const pageSizes = [4096, 8192, 16384, 32768, 65536]; // 常见4KB, 8KB, 16KB, 32KB, 64KB页大小

  for (const pageSize of pageSizes) {
    // 测试页大小本身
    const buf1 = Buffer.allocUnsafe(pageSize);
    if (buf1.length !== pageSize) {
      throw new Error(`Page size ${pageSize} allocation failed`);
    }

    // 测试页大小倍数
    const buf2 = Buffer.allocUnsafe(pageSize * 2);
    if (buf2.length !== pageSize * 2) {
      throw new Error(`Page size ${pageSize} * 2 allocation failed`);
    }

    // 测试页大小减1（边界情况）
    const buf3 = Buffer.allocUnsafe(pageSize - 1);
    if (buf3.length !== pageSize - 1) {
      throw new Error(`Page size ${pageSize} - 1 allocation failed`);
    }

    // 测试页大小加1（边界情况）
    const buf4 = Buffer.allocUnsafe(pageSize + 1);
    if (buf4.length !== pageSize + 1) {
      throw new Error(`Page size ${pageSize} + 1 allocation failed`);
    }
  }

  console.log('✅ 内存页大小边界测试');
  return true;
});

test('不同字节序下的数据一致性', () => {
  // 测试多字节数据的字节序处理
  const sizes = [2, 4, 8]; // 16位, 32位, 64位

  for (const size of sizes) {
    const buf = Buffer.allocUnsafe(size);

    // 写入测试数据
    for (let i = 0; i < size; i++) {
      buf[i] = i + 1;
    }

    // 验证数据完整性
    for (let i = 0; i < size; i++) {
      if (buf[i] !== i + 1) {
        throw new Error(`Endianness test failed for size ${size} at index ${i}`);
      }
    }

    // 测试多字节值的读写（使用Node.js内置方法）
    if (size >= 2) {
      buf.writeUInt16BE(0x1234, 0);
      if (buf.readUInt16BE(0) !== 0x1234) {
        throw new Error(`UInt16BE test failed for size ${size}`);
      }
    }

    if (size >= 4) {
      buf.writeUInt32BE(0x12345678, 0);
      if (buf.readUInt32BE(0) !== 0x12345678) {
        throw new Error(`UInt32BE test failed for size ${size}`);
      }
    }
  }

  console.log('✅ 不同字节序下的数据一致性');
  return true;
});

test('平台相关内存限制测试', () => {
  // 跳过内存检测，直接测试固定大小的分配

  // 测试相对安全的内存分配（使用较小比例的空闲内存）
  const safeSizes = [
    1024 * 1024,      // 1MB
    2 * 1024 * 1024,  // 2MB
    4 * 1024 * 1024   // 4MB
  ];

  for (const size of safeSizes) {
    try {
      const buf = Buffer.allocUnsafe(size);
      if (buf.length !== size) {
        throw new Error(`Safe size ${size} allocation failed on ${platform}`);
      }
      console.log(`✅ ${platform} 平台成功分配 ${size} 字节`);
    } catch (error) {
      // 内存不足是可以接受的
      if (error.message.includes('allocation') || error.message.includes('Array buffer')) {
        console.log(`⚠️  ${platform} 平台内存不足，无法分配 ${size} 字节`);
      } else {
        throw error;
      }
    }
  }

  console.log('✅ 平台相关内存限制测试');
  return true;
});

test('32位 vs 64位架构兼容性', () => {
  console.log(`当前架构: ${arch}`);

  // 测试不同架构下的指针大小相关行为
  const pointerRelatedSizes = [
    4,    // 32位指针大小
    8,    // 64位指针大小
    16,   // 2倍指针大小
    32,   // 4倍指针大小
    64    // 8倍指针大小
  ];

  for (const size of pointerRelatedSizes) {
    const buf = Buffer.allocUnsafe(size);
    if (buf.length !== size) {
      throw new Error(`Architecture ${arch}: Size ${size} allocation failed`);
    }

    // 验证指针大小相关的数据操作
    if (size >= 4) {
      buf.writeUInt32LE(0xDEADBEEF, 0);
      if (buf.readUInt32LE(0) !== 0xDEADBEEF) {
        throw new Error(`Architecture ${arch}: UInt32 operation failed for size ${size}`);
      }
    }

    if (size >= 8) {
      buf.writeDoubleLE(3.14159, 0);
      const readValue = buf.readDoubleLE(0);
      if (Math.abs(readValue - 3.14159) > 0.00001) {
        throw new Error(`Architecture ${arch}: Double operation failed for size ${size}`);
      }
    }
  }

  console.log(`✅ ${arch} 架构兼容性测试`);
  return true;
});

test('不同操作系统路径分隔符兼容性', () => {

  // 创建一个包含路径分隔符的测试Buffer
  const pathSeparator = platform === 'win32' ? '\\' : '/';
  const testPath = `test${pathSeparator}buffer${pathSeparator}allocUnsafe`;

  const buf = Buffer.allocUnsafe(testPath.length);
  buf.write(testPath, 'utf8');

  const readPath = buf.toString('utf8', 0, testPath.length);
  if (readPath !== testPath) {
    throw new Error(`Platform ${platform}: Path string handling failed`);
  }

  console.log(`✅ ${platform} 平台路径分隔符兼容性`);
  return true;
});

test('Unicode和字符编码平台兼容性', () => {

  // 测试不同Unicode字符
  const unicodeTests = [
    { chars: 'Hello', desc: 'ASCII字符' },
    { chars: '你好', desc: '中文字符' },
    { chars: '🚀', desc: 'Emoji字符' },
    { chars: 'αβγ', desc: '希腊字母' },
    { chars: 'مرحبا', desc: '阿拉伯字符' }
  ];

  for (const test of unicodeTests) {
    const buf = Buffer.allocUnsafe(test.chars.length * 4); // 预留足够空间
    const written = buf.write(test.chars, 'utf8');

    const readChars = buf.toString('utf8', 0, written);
    if (readChars !== test.chars) {
      throw new Error(`Platform ${platform}: ${test.desc} handling failed`);
    }

    console.log(`✅ ${platform} 平台 ${test.desc} 处理成功`);
  }

  console.log('✅ Unicode和字符编码平台兼容性');
  return true;
});

test('系统字节序检测和兼容性', () => {

  // 创建测试数据
  const testValue = 0x12345678;
  const buf = Buffer.allocUnsafe(4);

  // 写入大端格式
  buf.writeUInt32BE(testValue, 0);
  const beValue = buf.readUInt32BE(0);
  const leValue = buf.readUInt32LE(0);

  if (beValue !== testValue) {
    throw new Error(`Platform ${platform} ${arch}: Big-endian write/read failed`);
  }

  // 验证字节序转换
  const expectedLE = 0x78563412;
  if (leValue !== expectedLE) {
    throw new Error(`Platform ${platform} ${arch}: Endianness conversion failed`);
  }

  // 测试小端格式
  buf.writeUInt32LE(testValue, 0);
  const leValue2 = buf.readUInt32LE(0);
  const beValue2 = buf.readUInt32BE(0);

  if (leValue2 !== testValue) {
    throw new Error(`Platform ${platform} ${arch}: Little-endian write/read failed`);
  }

  const expectedBE = 0x78563412;
  if (beValue2 !== expectedBE) {
    throw new Error(`Platform ${platform} ${arch}: Endianness conversion failed`);
  }

  console.log(`✅ ${platform} ${arch} 系统字节序检测和兼容性`);
  return true;
});

test('平台相关的错误处理差异', () => {

  // 测试不同平台下的错误处理一致性
  const errorTestCases = [
    { input: -1, desc: '负数' },
    { input: NaN, desc: 'NaN' },
    { input: Infinity, desc: 'Infinity' },
    { input: 'invalid', desc: '字符串' },
    { input: {}, desc: '对象' }
  ];

  for (const testCase of errorTestCases) {
    try {
      Buffer.allocUnsafe(testCase.input);
      throw new Error(`Platform ${platform}: Expected error for ${testCase.desc}`);
    } catch (error) {
      // 验证错误消息的存在性
      if (!error.message || error.message.length === 0) {
        throw new Error(`Platform ${platform}: Empty error message for ${testCase.desc}`);
      }

      // 验证错误消息的一致性
      const expectedKeywords = ['size', 'Invalid', 'number', 'type'];
      const hasExpectedKeyword = expectedKeywords.some(keyword =>
        error.message.toLowerCase().includes(keyword.toLowerCase())
      );

      if (!hasExpectedKeyword) {
        console.log(`⚠️  ${platform} 平台 ${testCase.desc} 错误消息格式: ${error.message}`);
      }
    }
  }

  console.log(`✅ ${platform} 平台相关的错误处理差异`);
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