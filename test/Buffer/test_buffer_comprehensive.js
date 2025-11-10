const Buffer = require('buffer').Buffer;

console.log('========================================');
console.log('  Buffer API 全面修复验证测试');
console.log('========================================\n');

let testCount = 0;
let passCount = 0;
let failCount = 0;
const testResults = [];

function test(name, fn) {
  testCount++;
  const testNumber = testCount;
  try {
    console.log(`\n[测试 ${testNumber}] ${name}`);
    fn();
    passCount++;
    console.log('✓ 通过');
    testResults.push({ number: testNumber, name: name, status: 'passed', error: null });
  } catch (e) {
    failCount++;
    console.log('✗ 失败:', e.message);
    testResults.push({ number: testNumber, name: name, status: 'failed', error: e.message });
  }
}

// ============ P0-1: UTF-16 码元处理 ============
console.log('\n--- P0-1: UTF-16 码元处理 ---');

test('1.1 非 BMP 字符 - byteLength', () => {
  const str = '𠮷';  // U+20BB7
  const len = Buffer.byteLength(str, 'latin1');
  if (len !== 2) {
    throw new Error(`应该是 2，实际是 ${len}`);
  }
  console.log(`    '𠮷' latin1 长度: ${len}`);
});

test('1.2 非 BMP 字符 - Buffer.from', () => {
  const str = '𠮷';  // U+20BB7, UTF-16: [0xD842, 0xDFB7]
  const buf = Buffer.from(str, 'latin1');
  
  if (buf.length !== 2) {
    throw new Error(`长度应该是 2，实际是 ${buf.length}`);
  }
  if (buf[0] !== 0x42 || buf[1] !== 0xB7) {
    throw new Error(`内容错误: [0x${buf[0].toString(16)}, 0x${buf[1].toString(16)}]`);
  }
  console.log(`    Buffer: <Buffer ${buf[0].toString(16)} ${buf[1].toString(16)}>`);
});

test('1.3 混合字符 - latin1', () => {
  const str = 'A𠮷B';  // 'A' + surrogate pair + 'B'
  const len = Buffer.byteLength(str, 'latin1');
  if (len !== 4) {
    throw new Error(`应该是 4，实际是 ${len}`);
  }
  console.log(`    'A𠮷B' latin1 长度: ${len}`);
});

test('1.4 ascii 编码 - 非 BMP', () => {
  const str = '𠮷';
  const buf = Buffer.from(str, 'ascii');
  // ascii 取低 7 位: 0xD842 & 0x7F = 0x42, 0xDFB7 & 0x7F = 0x37
  if (buf.length !== 2) {
    throw new Error(`长度应该是 2，实际是 ${buf.length}`);
  }
  console.log(`    Buffer: <Buffer ${buf[0].toString(16)} ${buf[1].toString(16)}>`);
});

// ============ P0-2: write() 默认 length ============
console.log('\n--- P0-2: write() 默认 length ---');

test('2.1 write() 无 offset', () => {
  const buf = Buffer.alloc(100);
  const written = buf.write('hello');
  if (written !== 5) {
    throw new Error(`应该写入 5 字节，实际 ${written}`);
  }
  console.log(`    写入: ${written} 字节`);
});

test('2.2 write() 有 offset', () => {
  const buf = Buffer.alloc(100);
  const written = buf.write('hello', 50);
  if (written !== 5) {
    throw new Error(`应该写入 5 字节，实际 ${written}`);
  }
  console.log(`    从 offset 50 写入: ${written} 字节`);
});

test('2.3 write() 超长字符串', () => {
  const buf = Buffer.alloc(10);
  const longStr = 'hello world this is a very long string';
  const written = buf.write(longStr);
  if (written !== 10) {
    throw new Error(`应该写入 10 字节，实际 ${written}`);
  }
  console.log(`    写入: ${written} 字节 (截断)`);
});

// ============ P1-2: compare 范围参数 ============
console.log('\n--- P1-2: compare 范围参数 ---');

test('3.1 compare 全 buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2);
  if (result !== 0) {
    throw new Error(`应该相等，结果: ${result}`);
  }
  console.log(`    比较结果: ${result}`);
});

test('3.2 compare 范围参数', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([3, 4]);
  const result = buf1.compare(buf2, 0, 2, 2, 4);
  if (result !== 0) {
    throw new Error(`应该相等，结果: ${result}`);
  }
  console.log(`    buf1[2:4] vs buf2[0:2]: ${result}`);
});

test('3.3 compare 部分不等', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([3, 5]);
  const result = buf1.compare(buf2, 0, 2, 2, 4);
  if (result >= 0) {
    throw new Error(`应该小于 0，结果: ${result}`);
  }
  console.log(`    buf1[2:4] vs buf2[0:2]: ${result}`);
});

// ============ P1-3: copy 重叠安全 ============
console.log('\n--- P1-3: copy 重叠安全 ---');

test('4.1 copy 向后重叠', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.copy(buf, 2, 0, 3);
  
  const expected = [1, 2, 1, 2, 3];
  for (let i = 0; i < 5; i++) {
    if (buf[i] !== expected[i]) {
      throw new Error(`位置 ${i}: 应该是 ${expected[i]}，实际是 ${buf[i]}`);
    }
  }
  console.log(`    结果: [${Array.from(buf).join(', ')}]`);
});

test('4.2 copy 向前重叠', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.copy(buf, 0, 2, 5);
  
  const expected = [3, 4, 5, 4, 5];
  for (let i = 0; i < 5; i++) {
    if (buf[i] !== expected[i]) {
      throw new Error(`位置 ${i}: 应该是 ${expected[i]}，实际是 ${buf[i]}`);
    }
  }
  console.log(`    结果: [${Array.from(buf).join(', ')}]`);
});

// ============ P1-4: 可变字长范围检查 ============
console.log('\n--- P1-4: 可变字长范围检查 ---');

test('5.1 writeUIntBE - byteLength 范围', () => {
  const buf = Buffer.alloc(10);
  
  let errorThrown = false;
  try {
    buf.writeUIntBE(0, 0, 0);
  } catch (e) {
    errorThrown = true;
  }
  
  if (!errorThrown) {
    throw new Error('byteLength=0 应该抛出错误');
  }
  console.log(`    byteLength=0 正确抛出错误`);
});

test('5.2 writeUIntBE - value 范围', () => {
  const buf = Buffer.alloc(10);
  
  let errorThrown = false;
  try {
    buf.writeUIntBE(256, 0, 1);  // 1 字节最大 255
  } catch (e) {
    errorThrown = true;
  }
  
  if (!errorThrown) {
    throw new Error('value=256 (1字节) 应该抛出错误');
  }
  console.log(`    value=256 (1字节) 正确抛出错误`);
});

test('5.3 writeIntBE - 有符号范围', () => {
  const buf = Buffer.alloc(10);
  
  let errorThrown = false;
  try {
    buf.writeIntBE(128, 0, 1);  // 1 字节有符号范围 -128 到 127
  } catch (e) {
    errorThrown = true;
  }
  
  if (!errorThrown) {
    throw new Error('value=128 (1字节有符号) 应该抛出错误');
  }
  console.log(`    value=128 (1字节有符号) 正确抛出错误`);
});

test('5.4 writeUIntBE - offset 范围', () => {
  const buf = Buffer.alloc(10);
  
  let errorThrown = false;
  try {
    buf.writeUIntBE(100, 9, 2);  // offset 9 + 2 bytes > 10
  } catch (e) {
    errorThrown = true;
  }
  
  if (!errorThrown) {
    throw new Error('offset 越界应该抛出错误');
  }
  console.log(`    offset 越界正确抛出错误`);
});

// ============ P2-3: swap 错误消息 ============
console.log('\n--- P2-3: swap 错误消息 ---');

test('6.1 swap16 错误消息', () => {
  const buf = Buffer.alloc(3);
  
  let errorMessage = '';
  try {
    buf.swap16();
  } catch (e) {
    errorMessage = e.message;
  }
  
  if (!errorMessage.includes('RangeError') || !errorMessage.includes('16-bits')) {
    throw new Error(`错误消息不正确: ${errorMessage}`);
  }
  console.log(`    错误消息: ${errorMessage}`);
});

// ============ P2-5: isEncoding 大小写 ============
console.log('\n--- P2-5: isEncoding 大小写 ---');

test('7.1 isEncoding 大写', () => {
  if (!Buffer.isEncoding('UTF8')) {
    throw new Error('UTF8 应该被识别');
  }
  if (!Buffer.isEncoding('HEX')) {
    throw new Error('HEX 应该被识别');
  }
  console.log(`    UTF8, HEX 正确识别`);
});

test('7.2 isEncoding 混合大小写', () => {
  if (!Buffer.isEncoding('Base64')) {
    throw new Error('Base64 应该被识别');
  }
  if (!Buffer.isEncoding('Utf16LE')) {
    throw new Error('Utf16LE 应该被识别');
  }
  console.log(`    Base64, Utf16LE 正确识别`);
});

// ============ P1-1: indexOf/lastIndexOf 完整实现 ============
console.log('\n--- P1-1: indexOf/lastIndexOf 完整实现 ---');

test('8.1 indexOf - 字符串搜索', () => {
  const buf = Buffer.from('hello world');
  const index = buf.indexOf('world');
  if (index !== 6) {
    throw new Error(`应该是 6，实际是 ${index}`);
  }
  console.log(`    'world' 位置: ${index}`);
});

test('8.2 indexOf - 数字搜索', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const index = buf.indexOf(3);
  if (index !== 2) {
    throw new Error(`应该是 2，实际是 ${index}`);
  }
  console.log(`    数字 3 位置: ${index}`);
});

test('8.3 indexOf - Buffer 搜索', () => {
  const buf = Buffer.from('hello world');
  const search = Buffer.from('world');
  const index = buf.indexOf(search);
  if (index !== 6) {
    throw new Error(`应该是 6，实际是 ${index}`);
  }
  console.log(`    Buffer 'world' 位置: ${index}`);
});

test('8.4 indexOf - 负 offset', () => {
  const buf = Buffer.from('hello hello');
  const index = buf.indexOf('hello', -6);
  if (index !== 6) {
    throw new Error(`应该是 6，实际是 ${index}`);
  }
  console.log(`    负 offset 搜索位置: ${index}`);
});

test('8.5 indexOf - encoding 参数', () => {
  const buf = Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f]);  // 'hello'
  const index = buf.indexOf('68656c', 0, 'hex');
  if (index !== 0) {
    throw new Error(`应该是 0，实际是 ${index}`);
  }
  console.log(`    hex 编码搜索位置: ${index}`);
});

test('8.6 lastIndexOf - 字符串搜索', () => {
  const buf = Buffer.from('hello hello');
  const index = buf.lastIndexOf('hello');
  if (index !== 6) {
    throw new Error(`应该是 6，实际是 ${index}`);
  }
  console.log(`    最后一个 'hello' 位置: ${index}`);
});

test('8.7 lastIndexOf - 负 offset', () => {
  const buf = Buffer.from('hello hello');
  const index = buf.lastIndexOf('hello', -6);
  if (index !== 0) {
    throw new Error(`应该是 0，实际是 ${index}`);
  }
  console.log(`    负 offset 反向搜索位置: ${index}`);
});

test('8.8 lastIndexOf - Buffer 搜索', () => {
  const buf = Buffer.from('hello hello');
  const search = Buffer.from('hello');
  const index = buf.lastIndexOf(search);
  if (index !== 6) {
    throw new Error(`应该是 6，实际是 ${index}`);
  }
  console.log(`    Buffer 反向搜索位置: ${index}`);
});

// ============ 测试总结 ============
console.log('\n========================================');
console.log('测试总结:');
console.log(`  总计: ${testCount} 个测试`);
console.log(`  通过: ${passCount} 个`);
console.log(`  失败: ${failCount} 个`);
console.log('========================================');

if (failCount > 0) {
  console.log('\n失败的测试:');
  testResults.filter(t => t.status === 'failed').forEach(t => {
    console.log(`  [${t.number}] ${t.name}`);
    console.log(`      错误: ${t.error}`);
  });
}

// 返回测试结果
return {
  total: testCount,
  passed: passCount,
  failed: failCount,
  successRate: ((passCount / testCount) * 100).toFixed(1) + '%',
  results: {
    passed: testResults.filter(t => t.status === 'passed').map(t => `[${t.number}] ${t.name}`),
    failed: testResults.filter(t => t.status === 'failed').map(t => ({
      test: `[${t.number}] ${t.name}`,
      error: t.error
    }))
  }
};
