// 调试失败的测试用例
const { Buffer } = require('buffer');

console.log("=== 测试 1: 非常接近整数的浮点数截断 ===");
const buf1 = Buffer.alloc(3);
console.log("99.99999999999999 →", 99.99999999999999);
buf1.writeUInt8(99.99999999999999, 0);
console.log("实际写入:", buf1[0]);

console.log("100.00000000000001 →", 100.00000000000001);
buf1.writeUInt8(100.00000000000001, 1);
console.log("实际写入:", buf1[1]);

console.log("127.99999999999999 →", 127.99999999999999);
buf1.writeUInt8(127.99999999999999, 2);
console.log("实际写入:", buf1[2]);

console.log("\n=== 测试 2: 十六进制字符串转换 ===");
const buf2 = Buffer.alloc(2);
console.log("'0xFF' →", Number('0xFF'));
buf2.writeUInt8('0xFF', 0);
console.log("实际写入:", buf2[0]);

console.log("'0x10' →", Number('0x10'));
buf2.writeUInt8('0x10', 1);
console.log("实际写入:", buf2[1]);

console.log("\n=== 测试 3: 二进制字符串转换 ===");
const buf3 = Buffer.alloc(2);
console.log("'0b11111111' →", Number('0b11111111'));
buf3.writeUInt8('0b11111111', 0);
console.log("实际写入:", buf3[0]);

console.log("'0b10000000' →", Number('0b10000000'));
buf3.writeUInt8('0b10000000', 1);
console.log("实际写入:", buf3[1]);

console.log("\n=== 验证 parseInt 行为 ===");
console.log("parseInt('0xFF'):", parseInt('0xFF'));
console.log("parseInt('0x10'):", parseInt('0x10'));
console.log("parseInt('0b11111111'):", parseInt('0b11111111'));
console.log("parseInt('0b10000000'):", parseInt('0b10000000'));
