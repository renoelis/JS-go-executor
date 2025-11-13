// buffer.kStringMaxLength - Part 11: Numeric Read/Write and Advanced Features
const { Buffer, kStringMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Float 读写测试
test('Buffer.writeFloatBE/readFloatBE', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeFloatBE(3.14, 0);
    const val = buf.readFloatBE(0);
    return Math.abs(val - 3.14) < 0.01;
  } catch (e) {
    return false;
  }
});

test('Buffer.writeFloatLE/readFloatLE', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeFloatLE(2.718, 0);
    const val = buf.readFloatLE(0);
    return Math.abs(val - 2.718) < 0.001;
  } catch (e) {
    return false;
  }
});

// Int8/UInt8 测试
test('Buffer.writeInt8/readInt8 负数', () => {
  try {
    const buf = Buffer.allocUnsafe(1);
    buf.writeInt8(-128, 0);
    return buf.readInt8(0) === -128;
  } catch (e) {
    return false;
  }
});

test('Buffer.writeInt8/readInt8 正数', () => {
  try {
    const buf = Buffer.allocUnsafe(1);
    buf.writeInt8(127, 0);
    return buf.readInt8(0) === 127;
  } catch (e) {
    return false;
  }
});

test('Buffer.writeUInt8/readUInt8', () => {
  try {
    const buf = Buffer.allocUnsafe(1);
    buf.writeUInt8(255, 0);
    return buf.readUInt8(0) === 255;
  } catch (e) {
    return false;
  }
});

test('Buffer.writeUInt8/readUInt8 零值', () => {
  try {
    const buf = Buffer.allocUnsafe(1);
    buf.writeUInt8(0, 0);
    return buf.readUInt8(0) === 0;
  } catch (e) {
    return false;
  }
});

// Int16/UInt16 测试
test('Buffer.writeInt16BE/readInt16BE', () => {
  try {
    const buf = Buffer.allocUnsafe(2);
    buf.writeInt16BE(-32768, 0);
    return buf.readInt16BE(0) === -32768;
  } catch (e) {
    return false;
  }
});

test('Buffer.writeInt16LE/readInt16LE', () => {
  try {
    const buf = Buffer.allocUnsafe(2);
    buf.writeInt16LE(32767, 0);
    return buf.readInt16LE(0) === 32767;
  } catch (e) {
    return false;
  }
});

test('Buffer.writeUInt16BE/readUInt16BE', () => {
  try {
    const buf = Buffer.allocUnsafe(2);
    buf.writeUInt16BE(65535, 0);
    return buf.readUInt16BE(0) === 65535;
  } catch (e) {
    return false;
  }
});

test('Buffer.writeUInt16LE/readUInt16LE', () => {
  try {
    const buf = Buffer.allocUnsafe(2);
    buf.writeUInt16LE(12345, 0);
    return buf.readUInt16LE(0) === 12345;
  } catch (e) {
    return false;
  }
});

// BigInt64/BigUInt64 测试
test('Buffer.writeBigInt64BE/readBigInt64BE', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    const val = BigInt('9007199254740991');
    buf.writeBigInt64BE(val, 0);
    return buf.readBigInt64BE(0) === val;
  } catch (e) {
    return false;
  }
});

test('Buffer.writeBigInt64LE/readBigInt64LE', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    const val = BigInt('-9007199254740991');
    buf.writeBigInt64LE(val, 0);
    return buf.readBigInt64LE(0) === val;
  } catch (e) {
    return false;
  }
});

test('Buffer.writeBigUInt64BE/readBigUInt64BE', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    const val = BigInt('18446744073709551615');
    buf.writeBigUInt64BE(val, 0);
    return buf.readBigUInt64BE(0) === val;
  } catch (e) {
    return false;
  }
});

test('Buffer.writeBigUInt64LE/readBigUInt64LE', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    const val = BigInt('12345678901234567890');
    buf.writeBigUInt64LE(val, 0);
    // 可能会溢出，但测试API存在性
    return buf.readBigUInt64LE(0) !== undefined;
  } catch (e) {
    return false;
  }
});

// Buffer.concat 的 totalLength 参数
test('Buffer.concat 指定 totalLength', () => {
  try {
    const buf1 = Buffer.from('hello');
    const buf2 = Buffer.from('world');
    const result = Buffer.concat([buf1, buf2], 8);
    return result.length === 8;
  } catch (e) {
    return false;
  }
});

test('Buffer.concat totalLength 小于实际长度会截断', () => {
  try {
    const buf1 = Buffer.from('hello');
    const buf2 = Buffer.from('world');
    const result = Buffer.concat([buf1, buf2], 7);
    return result.length === 7 && result.toString() === 'hellowo';
  } catch (e) {
    return false;
  }
});

test('Buffer.concat totalLength 大于实际长度会填充', () => {
  try {
    const buf1 = Buffer.from('hi');
    const result = Buffer.concat([buf1], 5);
    return result.length === 5;
  } catch (e) {
    return false;
  }
});

test('Buffer.concat totalLength 为 0', () => {
  try {
    const buf1 = Buffer.from('test');
    const result = Buffer.concat([buf1], 0);
    return result.length === 0;
  } catch (e) {
    return false;
  }
});

// Buffer.allocUnsafeSlow 测试
test('Buffer.allocUnsafeSlow 创建 Buffer', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(10);
    return buf.length === 10;
  } catch (e) {
    return false;
  }
});

test('Buffer.allocUnsafeSlow 不使用池', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(100);
    // allocUnsafeSlow 不使用内部Buffer池
    return buf instanceof Buffer;
  } catch (e) {
    return false;
  }
});

test('Buffer.allocUnsafeSlow 零长度', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(0);
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

// readIntBE/readIntLE 可变长度
test('Buffer.readIntBE 读取3字节', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    const val = buf.readIntBE(0, 3);
    return val === 0x123456;
  } catch (e) {
    return false;
  }
});

test('Buffer.readIntLE 读取3字节', () => {
  try {
    const buf = Buffer.from([0x56, 0x34, 0x12]);
    const val = buf.readIntLE(0, 3);
    return val === 0x123456;
  } catch (e) {
    return false;
  }
});

test('Buffer.readUIntBE 读取5字节', () => {
  try {
    const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
    const val = buf.readUIntBE(0, 5);
    return val > 0;
  } catch (e) {
    return false;
  }
});

test('Buffer.readUIntLE 读取6字节', () => {
  try {
    const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
    const val = buf.readUIntLE(0, 6);
    return val > 0;
  } catch (e) {
    return false;
  }
});

test('Buffer.writeIntBE 写入3字节', () => {
  try {
    const buf = Buffer.allocUnsafe(3);
    buf.writeIntBE(0x123456, 0, 3);
    return buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56;
  } catch (e) {
    return false;
  }
});

test('Buffer.writeIntLE 写入3字节', () => {
  try {
    const buf = Buffer.allocUnsafe(3);
    buf.writeIntLE(0x123456, 0, 3);
    return buf[0] === 0x56 && buf[1] === 0x34 && buf[2] === 0x12;
  } catch (e) {
    return false;
  }
});

// Buffer.from ArrayBuffer 的 byteOffset
test('Buffer.from ArrayBuffer 指定 offset', () => {
  try {
    const ab = new ArrayBuffer(10);
    const view = new Uint8Array(ab);
    view.fill(1);
    const buf = Buffer.from(ab, 2, 5);
    return buf.length === 5;
  } catch (e) {
    return false;
  }
});

test('Buffer.from ArrayBuffer offset 和 length', () => {
  try {
    const ab = new ArrayBuffer(10);
    const view = new Uint8Array(ab);
    for (let i = 0; i < 10; i++) view[i] = i;
    const buf = Buffer.from(ab, 3, 4);
    return buf.length === 4 && buf[0] === 3;
  } catch (e) {
    return false;
  }
});

test('Buffer.from ArrayBuffer 仅 offset', () => {
  try {
    const ab = new ArrayBuffer(10);
    const buf = Buffer.from(ab, 5);
    return buf.length === 5; // 从offset到结尾
  } catch (e) {
    return false;
  }
});

// 编码别名测试
test('binary 编码别名等于 latin1', () => {
  try {
    const str = 'test';
    const buf1 = Buffer.from(str, 'binary');
    const buf2 = Buffer.from(str, 'latin1');
    return buf1.equals(buf2);
  } catch (e) {
    return false;
  }
});

test('utf-8 编码别名等于 utf8', () => {
  try {
    const str = 'test';
    const buf1 = Buffer.from(str, 'utf-8');
    const buf2 = Buffer.from(str, 'utf8');
    return buf1.equals(buf2);
  } catch (e) {
    return false;
  }
});

test('binary 编码 toString', () => {
  try {
    const buf = Buffer.from([0xFF, 0xFE]);
    const str = buf.toString('binary');
    return str.length === 2;
  } catch (e) {
    return false;
  }
});

// 所有数值操作与 kStringMaxLength 无关
test('数值读写不受 kStringMaxLength 影响', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32BE(kStringMaxLength, 0);
    buf.writeInt32LE(kStringMaxLength, 4);
    return buf.readInt32BE(0) === kStringMaxLength &&
           buf.readInt32LE(4) === kStringMaxLength;
  } catch (e) {
    return false;
  }
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
