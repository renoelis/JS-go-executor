// Buffer.allocUnsafeSlow - 兼容性和特殊场景测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 与其他Buffer方法的兼容性
test('与Buffer.from兼容性', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  buf1.write('hello');
  const buf2 = Buffer.from(buf1);
  return buf2.toString('utf8', 0, 5) === 'hello';
});

test('与Buffer.concat兼容性', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  buf1.write('hello');
  const buf2 = Buffer.allocUnsafeSlow(5);
  buf2.write('world');
  const concat = Buffer.concat([buf1, buf2]);
  return concat.toString() === 'helloworld';
});

test('与Buffer.compare兼容性', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  const buf2 = Buffer.allocUnsafeSlow(5);
  buf1.fill(1);
  buf2.fill(2);
  return Buffer.compare(buf1, buf2) < 0;
});

test('与Buffer.equals兼容性', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  const buf2 = Buffer.allocUnsafeSlow(5);
  buf1.fill(0x55);
  buf2.fill(0x55);
  return buf1.equals(buf2);
});

test('与Buffer.isBuffer兼容性', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return Buffer.isBuffer(buf) === true;
});

test('与Buffer.byteLength兼容性', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('hello', 0, 'utf8');
  return Buffer.byteLength('hello', 'utf8') === 5;
});

// JSON序列化兼容性
test('JSON.stringify兼容性', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  const json = JSON.stringify(buf);
  const parsed = JSON.parse(json);
  return parsed.type === 'Buffer' && parsed.data[0] === 1;
});

test('JSON往返转换', () => {
  const original = Buffer.allocUnsafeSlow(5);
  original.write('test');
  const json = JSON.stringify(original);
  const restored = Buffer.from(JSON.parse(json));
  return original.equals(restored);
});

// 编码转换兼容性
test('base64编码兼容性', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('hello');
  const base64 = buf.toString('base64');
  const decoded = Buffer.from(base64, 'base64');
  return decoded.toString('utf8', 0, 5) === 'hello';
});

test('hex编码兼容性', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.write('hello');
  const hex = buf.toString('hex');
  const decoded = Buffer.from(hex, 'hex');
  return decoded.toString('utf8') === 'hello';
});

test('utf16le编码兼容性', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('hello', 0, 'utf16le');
  const result = buf.toString('utf16le');
  return result.includes('hello');
});

// Web标准兼容性模拟
test('类似ArrayBuffer接口', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.buffer instanceof ArrayBuffer &&
         buf.byteLength === 10 &&
         buf.byteOffset === 0;
});

test('TypedArray视图兼容性', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  buf.writeInt32LE(0x12345678, 0);
  buf.writeInt32LE(0x12345678, 4); // 使用相同的值避免溢出
  const view = new Uint32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  return view.length === 2;
});

test('DataView兼容性', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  const dataView = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  dataView.setUint32(0, 0x12345678, true);
  return buf.readUInt32LE(0) === 0x12345678;
});

// 实际应用场景模拟
test('网络数据包处理模拟', () => {
  const packet = Buffer.allocUnsafeSlow(20);
  
  // 模拟协议头
  packet.writeUInt16BE(0x1234, 0); // 魔术字
  packet.writeUInt16BE(16, 2); // 数据长度
  packet.writeUInt32BE(Date.now() & 0xFFFFFFFF, 4); // 时间戳
  
  // 模拟数据
  packet.write('hello world!', 8);
  
  return packet.readUInt16BE(0) === 0x1234 && packet.readUInt16BE(2) === 16;
});

test('文件头处理模拟', () => {
  const header = Buffer.allocUnsafeSlow(16);
  
  // 模拟文件签名
  header.write('MYFILE', 0, 'ascii');
  header.writeUInt16LE(1, 6); // 版本号
  header.writeUInt32LE(1024, 8); // 文件大小
  header.writeUInt32LE(0, 12); // 保留字段
  
  return header.toString('ascii', 0, 6) === 'MYFILE' && 
         header.readUInt16LE(6) === 1 &&
         header.readUInt32LE(8) === 1024;
});

test('密码学应用模拟', () => {
  const key = Buffer.allocUnsafeSlow(32); // 256位密钥
  const iv = Buffer.allocUnsafeSlow(16);  // 128位IV
  
  // 填充随机数据（模拟）
  for (let i = 0; i < key.length; i++) {
    key[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < iv.length; i++) {
    iv[i] = Math.floor(Math.random() * 256);
  }
  
  return key.length === 32 && iv.length === 16 && key !== iv;
});

// 内存安全性测试
test('避免信息泄露 - 独立内存空间', () => {
  const buf1 = Buffer.allocUnsafeSlow(1000);
  buf1.fill(0x42);
  
  const buf2 = Buffer.allocUnsafeSlow(1000);
  // 不清零buf2，但它应该与buf1完全独立
  
  // 修改buf1不应该影响buf2的内容检查
  buf1.fill(0x24);
  
  return buf1[0] === 0x24 && buf1.buffer !== buf2.buffer;
});

test('递归深度保护', () => {
  function createBuffersRecursively(depth) {
    if (depth <= 0) {
      return 0;
    }
    const buf = Buffer.allocUnsafeSlow(10);
    return buf.length + createBuffersRecursively(depth - 1);
  }
  
  try {
    const result = createBuffersRecursively(10); // 限制递归深度
    return result === 100; // 10个Buffer，每个10字节
  } catch (e) {
    return false;
  }
});

// 极端参数组合测试
test('参数边界值组合', () => {
  const tests = [
    { size: 1, expected: 1 },
    { size: 2, expected: 2 },
    { size: 3, expected: 3 },
    { size: 7, expected: 7 },
    { size: 8, expected: 8 },
    { size: 15, expected: 15 },
    { size: 16, expected: 16 },
    { size: 31, expected: 31 },
    { size: 32, expected: 32 }
  ];
  
  return tests.every(({ size, expected }) => {
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === expected;
  });
});

test('2的幂次大小测试', () => {
  const powers = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
  return powers.every(size => {
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size && buf instanceof Buffer;
  });
});

test('奇数偶数大小对比', () => {
  const oddSizes = [1, 3, 5, 7, 9, 11, 13, 15];
  const evenSizes = [2, 4, 6, 8, 10, 12, 14, 16];
  
  const oddResults = oddSizes.map(size => Buffer.allocUnsafeSlow(size).length);
  const evenResults = evenSizes.map(size => Buffer.allocUnsafeSlow(size).length);
  
  return oddResults.every((length, i) => length === oddSizes[i]) &&
         evenResults.every((length, i) => length === evenSizes[i]);
});

// 多进制数值测试
test('不同进制大小参数', () => {
  const decimal = Buffer.allocUnsafeSlow(10);   // 十进制
  const hex = Buffer.allocUnsafeSlow(0xA);      // 十六进制
  const octal = Buffer.allocUnsafeSlow(0o12);   // 八进制
  const binary = Buffer.allocUnsafeSlow(0b1010); // 二进制
  
  return decimal.length === 10 && 
         hex.length === 10 && 
         octal.length === 10 && 
         binary.length === 10;
});

// 国际化兼容性测试
test('Unicode字符串写入兼容性', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  buf.write('Hello 世界 🌍', 0, 'utf8');
  const content = buf.toString('utf8');
  return content.includes('Hello') && content.includes('世界');
});

test('多字节字符边界处理', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  const written = buf.write('你好世界', 0, 'utf8');
  return written <= 10 && written >= 9; // 中文字符可能被截断
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
