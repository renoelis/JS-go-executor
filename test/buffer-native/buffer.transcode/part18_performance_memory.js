// buffer.transcode() - Part 18: Performance and Memory Tests
const { Buffer, transcode } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 性能测试（适度规模，避免超时）
test('中等大小数据转码 (32KB UTF-8)', () => {
  const size = 32 * 1024;
  const data = 'A'.repeat(size);
  const source = Buffer.from(data, 'utf8');
  const start = Date.now();
  const result = transcode(source, 'utf8', 'utf16le');
  const duration = Date.now() - start;
  return result.length === size * 2 && duration < 5000; // 5秒内完成
});

test('中等大小数据转码 (64KB UTF-8 to Latin1)', () => {
  const size = 64 * 1024;
  const data = 'B'.repeat(size);
  const source = Buffer.from(data, 'utf8');
  const start = Date.now();
  const result = transcode(source, 'utf8', 'latin1');
  const duration = Date.now() - start;
  return result.length === size && duration < 5000;
});

test('中等大小数据转码 (16KB Latin1 to UTF-8)', () => {
  const size = 16 * 1024;
  const bytes = [];
  for (let i = 0; i < size; i++) {
    bytes.push(i % 256);
  }
  const source = Buffer.from(bytes);
  const start = Date.now();
  const result = transcode(source, 'latin1', 'utf8');
  const duration = Date.now() - start;
  return result.length >= size && duration < 5000;
});

// 重复调用性能测试
test('重复调用 100 次 - 小数据', () => {
  const source = Buffer.from('Test', 'utf8');
  const start = Date.now();
  
  for (let i = 0; i < 100; i++) {
    const result = transcode(source, 'utf8', 'utf16le');
    if (!result || result.length !== 8) return false;
  }
  
  const duration = Date.now() - start;
  return duration < 3000; // 3秒内完成
});

test('重复调用 50 次 - 中等数据 (1KB)', () => {
  const source = Buffer.from('X'.repeat(1024), 'utf8');
  const start = Date.now();
  
  for (let i = 0; i < 50; i++) {
    const result = transcode(source, 'utf8', 'utf16le');
    if (!result || result.length !== 2048) return false;
  }
  
  const duration = Date.now() - start;
  return duration < 5000; // 5秒内完成
});

// 连续不同编码转换
test('连续多种编码转换链 (10次)', () => {
  let current = Buffer.from('Hello World', 'utf8');
  const start = Date.now();
  
  for (let i = 0; i < 10; i++) {
    current = transcode(current, 'utf8', 'utf16le');
    current = transcode(current, 'utf16le', 'utf8');
    current = transcode(current, 'utf8', 'latin1');
    current = transcode(current, 'latin1', 'utf8');
  }
  
  const duration = Date.now() - start;
  return current.toString('utf8') === 'Hello World' && duration < 3000;
});

// 内存使用测试
test('多个并行转码操作', () => {
  const sources = [];
  for (let i = 0; i < 20; i++) {
    sources.push(Buffer.from(`Data${i}`.repeat(100), 'utf8'));
  }
  
  const start = Date.now();
  const results = sources.map(src => transcode(src, 'utf8', 'utf16le'));
  const duration = Date.now() - start;
  
  return results.every(r => r instanceof Buffer) && duration < 3000;
});

test('大量小 Buffer 转码', () => {
  const start = Date.now();
  
  for (let i = 0; i < 500; i++) {
    const source = Buffer.from(`${i}`, 'utf8');
    const result = transcode(source, 'utf8', 'utf16le');
    if (!result || result.length < 2) return false;
  }
  
  const duration = Date.now() - start;
  return duration < 5000;
});

// 内存边界测试
test('接近 8MB Buffer (分段测试)', () => {
  try {
    // 分成 8 个 1MB 的 Buffer
    for (let i = 0; i < 8; i++) {
      const size = 1024 * 1024; // 1MB
      const source = Buffer.alloc(size, 0x41); // 填充 'A'
      const result = transcode(source, 'utf8', 'utf16le');
      if (!result || result.length !== size * 2) return false;
    }
    return true;
  } catch (e) {
    return e.message.includes('Cannot create') || e.message.includes('Invalid');
  }
});

// 不同长度的边界测试
test('2的幂次方长度测试 - 1024', () => {
  const source = Buffer.alloc(1024, 0x42);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2048;
});

test('2的幂次方长度测试 - 2048', () => {
  const source = Buffer.alloc(2048, 0x43);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 4096;
});

test('2的幂次方长度测试 - 4096', () => {
  const source = Buffer.alloc(4096, 0x44);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 8192;
});

test('2的幂次方长度测试 - 8192', () => {
  const source = Buffer.alloc(8192, 0x45);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 16384;
});

// 奇数长度测试
test('奇数长度 1001', () => {
  const source = Buffer.alloc(1001, 0x46);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2002;
});

test('奇数长度 1003', () => {
  const source = Buffer.alloc(1003, 0x47);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2006;
});

test('质数长度 1009', () => {
  const source = Buffer.alloc(1009, 0x48);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2018;
});

// UTF-16LE 奇数字节长度处理
// 注意：Node.js v25.0.0 会截断最后一个字节，而不是抛出错误
test('UTF-16LE 奇数字节长度 - 截断处理', () => {
  const source = Buffer.from([0x41, 0x00, 0x42]); // 3字节
  const result = transcode(source, 'utf16le', 'utf8');
  // 应该只转换前 2 个字节（一个字符 'A'），最后一个字节被截断
  return result.length === 1 && result[0] === 0x41; // 'A'
});

// 压力测试 - 快速连续调用
test('快速连续调用 200 次', () => {
  const source = Buffer.from('Quick', 'utf8');
  const start = Date.now();
  
  for (let i = 0; i < 200; i++) {
    transcode(source, 'utf8', 'utf16le');
  }
  
  const duration = Date.now() - start;
  return duration < 3000;
});

// 内存分配模式测试
test('递增大小的 Buffer 转码', () => {
  const start = Date.now();
  
  for (let size = 100; size <= 1000; size += 100) {
    const source = Buffer.alloc(size, 0x50);
    const result = transcode(source, 'utf8', 'utf16le');
    if (!result || result.length !== size * 2) return false;
  }
  
  const duration = Date.now() - start;
  return duration < 5000;
});

// 混合编码性能测试
test('混合编码序列转换', () => {
  const encodings = ['utf8', 'latin1', 'ascii', 'utf16le', 'ucs2'];
  const source = Buffer.from('Mixed', 'utf8');
  let current = source;
  const start = Date.now();
  
  for (let i = 0; i < 10; i++) {
    const fromEnc = encodings[i % encodings.length];
    const toEnc = encodings[(i + 1) % encodings.length];
    try {
      current = transcode(current, fromEnc, toEnc);
    } catch (e) {
      // 某些转换可能不支持，这是正常的
      continue;
    }
  }
  
  const duration = Date.now() - start;
  return current instanceof Buffer && duration < 3000;
});

// 内存回收测试
test('大量临时 Buffer 创建和回收', () => {
  const start = Date.now();
  
  for (let i = 0; i < 100; i++) {
    const temp = Buffer.from(`Temp${i}`.repeat(50), 'utf8');
    transcode(temp, 'utf8', 'utf16le');
    // temp 应该可以被垃圾回收
  }
  
  const duration = Date.now() - start;
  return duration < 5000;
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
