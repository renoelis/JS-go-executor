
// 测试不同的 BigInt 创建方式
console.log("=== 测试 BigInt 创建方式 ===");

const hex = "6ae8a0bd2530ced2b663757ac25a22e11685c86f412b5e0b4c5fad595856325c";

// 方法1: BigInt("0x" + hex)
console.log("\n1. BigInt('0x' + hex):");
const m1 = BigInt("0x" + hex);
console.log("   结果:", m1.toString(16));

// 方法2: 手动分段
console.log("\n2. 手动分段（每15个字符）:");
let result = BigInt(0);
for (let i = 0; i < hex.length; i += 15) {
  const chunk = hex.substring(i, Math.min(i + 15, hex.length));
  const chunkValue = BigInt("0x" + chunk);
  const remainingChars = hex.length - i - chunk.length;
  const shift = BigInt(remainingChars * 4);
  result = result + (chunkValue << shift);
  console.log(`   第${Math.floor(i/15)+1}段: chunk=${chunk}, value=${chunkValue.toString(16)}, shift=${shift}`);
}
console.log("   最终结果:", result.toString(16));

// 方法3: 更小的分段（每8个字符）
console.log("\n3. 更小分段（每8个字符）:");
let result2 = BigInt(0);
for (let i = 0; i < hex.length; i += 8) {
  const chunk = hex.substring(i, Math.min(i + 8, hex.length));
  const chunkValue = BigInt("0x" + chunk);
  const remainingChars = hex.length - i - chunk.length;
  const shift = BigInt(remainingChars * 4);
  result2 = result2 + (chunkValue << shift);
}
console.log("   最终结果:", result2.toString(16));

const res={ 
  method1: m1.toString(16),
  method2: result.toString(16),
  method3: result2.toString(16)
};

console.log(res);