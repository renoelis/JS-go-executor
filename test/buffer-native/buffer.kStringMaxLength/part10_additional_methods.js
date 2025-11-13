// buffer.kStringMaxLength - Part 10: Additional Buffer Methods and Encodings
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

// Buffer.byteLength 测试
test('Buffer.byteLength 计算字节长度', () => {
  try {
    const str = 'hello';
    const len = Buffer.byteLength(str);
    return len === 5 && str.length < kStringMaxLength;
  } catch (e) {
    return false;
  }
});

test('Buffer.byteLength UTF-8 多字节字符', () => {
  try {
    const str = '你好';
    const len = Buffer.byteLength(str, 'utf8');
    // '你好' 是2个字符，但UTF-8编码是6字节
    return len === 6 && str.length === 2;
  } catch (e) {
    return false;
  }
});

test('Buffer.byteLength 不同编码', () => {
  try {
    const str = 'hello';
    const utf8Len = Buffer.byteLength(str, 'utf8');
    const utf16Len = Buffer.byteLength(str, 'utf16le');
    const asciiLen = Buffer.byteLength(str, 'ascii');
    return utf8Len === 5 && utf16Len === 10 && asciiLen === 5;
  } catch (e) {
    return false;
  }
});

test('Buffer.byteLength 空字符串', () => {
  try {
    const len = Buffer.byteLength('');
    return len === 0;
  } catch (e) {
    return false;
  }
});

// Buffer.copy 测试
test('Buffer.copy 基本复制', () => {
  try {
    const src = Buffer.from('hello');
    const dst = Buffer.alloc(10);
    const copied = src.copy(dst);
    return copied === 5 && dst.toString('utf8', 0, 5) === 'hello';
  } catch (e) {
    return false;
  }
});

test('Buffer.copy 指定位置', () => {
  try {
    const src = Buffer.from('world');
    const dst = Buffer.from('hello_____');
    src.copy(dst, 5);
    return dst.toString() === 'helloworld';
  } catch (e) {
    return false;
  }
});

test('Buffer.copy 部分复制', () => {
  try {
    const src = Buffer.from('hello');
    const dst = Buffer.alloc(10);
    src.copy(dst, 0, 1, 4); // 复制 'ell'
    return dst.toString('utf8', 0, 3) === 'ell';
  } catch (e) {
    return false;
  }
});

test('Buffer.copy 到自身', () => {
  try {
    const buf = Buffer.from('hello world');
    buf.copy(buf, 6, 0, 5); // 复制 'hello' 到位置6
    return buf.toString() === 'hello hello';
  } catch (e) {
    return false;
  }
});

// Buffer.swap 方法测试
test('Buffer.swap16 字节交换', () => {
  try {
    const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    buf.swap16();
    return buf[0] === 0x02 && buf[1] === 0x01;
  } catch (e) {
    return false;
  }
});

test('Buffer.swap32 字节交换', () => {
  try {
    const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    buf.swap32();
    return buf[0] === 0x04 && buf[3] === 0x01;
  } catch (e) {
    return false;
  }
});

test('Buffer.swap64 字节交换', () => {
  try {
    const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
    buf.swap64();
    return buf[0] === 0x08 && buf[7] === 0x01;
  } catch (e) {
    return false;
  }
});

// Buffer.toJSON 测试
test('Buffer.toJSON 返回对象', () => {
  try {
    const buf = Buffer.from('test');
    const json = buf.toJSON();
    return json.type === 'Buffer' && Array.isArray(json.data);
  } catch (e) {
    return false;
  }
});

test('Buffer.toJSON 数据正确', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const json = buf.toJSON();
    return json.data[0] === 1 && json.data[1] === 2 && json.data[2] === 3;
  } catch (e) {
    return false;
  }
});

test('Buffer.toJSON 可序列化', () => {
  try {
    const buf = Buffer.from('hello');
    const str = JSON.stringify(buf);
    return str.includes('Buffer') && str.includes('data');
  } catch (e) {
    return false;
  }
});

// Buffer.lastIndexOf 测试
test('Buffer.lastIndexOf 找到最后一个', () => {
  try {
    const buf = Buffer.from('hello world hello');
    const idx = buf.lastIndexOf('hello');
    return idx === 12;
  } catch (e) {
    return false;
  }
});

test('Buffer.lastIndexOf 找不到返回 -1', () => {
  try {
    const buf = Buffer.from('hello world');
    const idx = buf.lastIndexOf('xyz');
    return idx === -1;
  } catch (e) {
    return false;
  }
});

test('Buffer.lastIndexOf Buffer参数', () => {
  try {
    const buf = Buffer.from('hello world hello');
    const search = Buffer.from('hello');
    const idx = buf.lastIndexOf(search);
    return idx === 12;
  } catch (e) {
    return false;
  }
});

test('Buffer.lastIndexOf 指定起始位置', () => {
  try {
    const buf = Buffer.from('hello world hello');
    const idx = buf.lastIndexOf('hello', 10);
    return idx === 0;
  } catch (e) {
    return false;
  }
});

// Buffer 迭代器测试
test('Buffer.keys 迭代器', () => {
  try {
    const buf = Buffer.from('abc');
    const keys = Array.from(buf.keys());
    return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
  } catch (e) {
    return false;
  }
});

test('Buffer.values 迭代器', () => {
  try {
    const buf = Buffer.from([65, 66, 67]); // ABC
    const values = Array.from(buf.values());
    return values[0] === 65 && values[1] === 66 && values[2] === 67;
  } catch (e) {
    return false;
  }
});

test('Buffer.entries 迭代器', () => {
  try {
    const buf = Buffer.from('ab');
    const entries = Array.from(buf.entries());
    return entries[0][0] === 0 && entries[0][1] === 97;
  } catch (e) {
    return false;
  }
});

test('Buffer 支持 for...of', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const values = [];
    for (const val of buf) {
      values.push(val);
    }
    return values.length === 3 && values[0] === 1;
  } catch (e) {
    return false;
  }
});

// utf16le 和 ucs2 编码测试
test('utf16le 编码创建 Buffer', () => {
  try {
    const str = 'test';
    const buf = Buffer.from(str, 'utf16le');
    // UTF-16LE: 每个字符2字节
    return buf.length === 8;
  } catch (e) {
    return false;
  }
});

test('utf16le 编码往返', () => {
  try {
    const str = 'hello';
    const buf = Buffer.from(str, 'utf16le');
    const back = buf.toString('utf16le');
    return back === str;
  } catch (e) {
    return false;
  }
});

test('ucs2 编码等价于 utf16le', () => {
  try {
    const str = 'test';
    const buf1 = Buffer.from(str, 'utf16le');
    const buf2 = Buffer.from(str, 'ucs2');
    return buf1.equals(buf2);
  } catch (e) {
    return false;
  }
});

test('utf16le 中文字符', () => {
  try {
    const str = '你好';
    const buf = Buffer.from(str, 'utf16le');
    const back = buf.toString('utf16le');
    return back === str;
  } catch (e) {
    return false;
  }
});

// Double 读写测试
test('Buffer.writeDoubleBE/readDoubleBE', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeDoubleBE(123.456, 0);
    const val = buf.readDoubleBE(0);
    return Math.abs(val - 123.456) < 0.001;
  } catch (e) {
    return false;
  }
});

test('Buffer.writeDoubleLE/readDoubleLE', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeDoubleLE(123.456, 0);
    const val = buf.readDoubleLE(0);
    return Math.abs(val - 123.456) < 0.001;
  } catch (e) {
    return false;
  }
});

test('Buffer Double 精度测试', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    const pi = Math.PI;
    buf.writeDoubleBE(pi, 0);
    const read = buf.readDoubleBE(0);
    return read === pi;
  } catch (e) {
    return false;
  }
});

// Buffer.subarray 测试
test('Buffer.subarray 存在', () => {
  try {
    const buf = Buffer.from('hello');
    return typeof buf.subarray === 'function';
  } catch (e) {
    return false;
  }
});

test('Buffer.subarray 创建视图', () => {
  try {
    const buf = Buffer.from('hello world');
    const sub = buf.subarray(0, 5);
    return sub.toString() === 'hello' && sub.length === 5;
  } catch (e) {
    return false;
  }
});

test('Buffer.subarray vs slice 修改影响', () => {
  try {
    const buf = Buffer.from('hello');
    const sub = buf.subarray(0, 3);
    sub[0] = 72; // 'H'
    // subarray 是视图，修改会影响原Buffer
    return buf[0] === 72;
  } catch (e) {
    return false;
  }
});

test('Buffer.subarray 负索引', () => {
  try {
    const buf = Buffer.from('hello');
    const sub = buf.subarray(-2);
    return sub.toString() === 'lo';
  } catch (e) {
    return false;
  }
});

test('Buffer.subarray 与 kStringMaxLength 无直接关系', () => {
  try {
    const buf = Buffer.from('test');
    const sub = buf.subarray(0, 2);
    return sub.toString().length < kStringMaxLength;
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
