// 测试失败用例在 Node.js 中的真实行为
const { Buffer } = require('buffer');

console.log("=== 测试 1: 写入浮点数 255.1 ===");
try {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(255.1, 0);
  console.log("结果: 写入成功，buf[0] =", buf[0]);
} catch (e) {
  console.log("结果: 抛出错误");
  console.log("错误信息:", e.message);
}

console.log("\n=== 测试 2: 写入浮点数 -0.5 ===");
try {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(-0.5, 0);
  console.log("结果: 写入成功，buf[0] =", buf[0]);
} catch (e) {
  console.log("结果: 抛出错误");
  console.log("错误信息:", e.message);
}

console.log("\n=== 测试 3: 缺少 value 参数 ===");
try {
  const buf = Buffer.alloc(4);
  buf.writeUInt8();
  console.log("结果: 写入成功，buf[0] =", buf[0]);
} catch (e) {
  console.log("结果: 抛出错误");
  console.log("错误信息:", e.message);
}

console.log("\n=== 测试 4: offset 为带 valueOf 的对象 ===");
try {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(100, { valueOf: () => 1 });
  console.log("结果: 写入成功，buf[1] =", buf[1]);
} catch (e) {
  console.log("结果: 抛出错误");
  console.log("错误信息:", e.message);
}

console.log("\n=== 测试 5: offset 为带 toString 的对象 ===");
try {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(100, { toString: () => '1' });
  console.log("结果: 写入成功");
} catch (e) {
  console.log("结果: 抛出错误");
  console.log("错误信息:", e.message);
}

console.log("\n=== 测试 6: offset 为 BigInt ===");
try {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(100, 1n);
  console.log("结果: 写入成功");
} catch (e) {
  console.log("结果: 抛出错误");
  console.log("错误信息:", e.message);
}

console.log("\n=== 测试 7: offset 为 Set ===");
try {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(100, new Set([1]));
  console.log("结果: 写入成功");
} catch (e) {
  console.log("结果: 抛出错误");
  console.log("错误信息:", e.message);
}
