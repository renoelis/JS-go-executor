// 测试 Node.js 写方法的错误码
const { Buffer } = require('buffer');

console.log('=== 测试 writeFloatBE 错误码 ===\n');

// 测试 1: Buffer 长度不足
try {
  const buf = Buffer.alloc(3); // 只有 3 字节，需要 4 字节
  buf.writeFloatBE(3.14, 0);
} catch (e) {
  console.log('测试 1: Buffer 长度不足');
  console.log('  错误类型:', e.name);
  console.log('  错误码:', e.code);
  console.log('  错误消息:', e.message);
  console.log();
}

// 测试 2: offset 越界
try {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(3.14, 1); // offset=1 会越界
} catch (e) {
  console.log('测试 2: offset 越界');
  console.log('  错误类型:', e.name);
  console.log('  错误码:', e.code);
  console.log('  错误消息:', e.message);
  console.log();
}

// 测试 3: offset 为字符串
try {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(3.14, 'invalid');
} catch (e) {
  console.log('测试 3: offset 为字符串');
  console.log('  错误类型:', e.name);
  console.log('  错误码:', e.code);
  console.log('  错误消息:', e.message);
  console.log();
}

// 测试 4: offset 为小数
try {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(3.14, 0.5);
} catch (e) {
  console.log('测试 4: offset 为小数');
  console.log('  错误类型:', e.name);
  console.log('  错误码:', e.code);
  console.log('  错误消息:', e.message);
  console.log();
}
