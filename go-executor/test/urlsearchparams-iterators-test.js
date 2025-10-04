// URLSearchParams 迭代器方法测试

console.log("🚀 URLSearchParams 迭代器方法测试\n");

// 创建测试实例
const params = new URLSearchParams();
params.append("key1", "value1");
params.append("key1", "value2");  // 重复的 key
params.append("key2", "value3");

console.log("初始状态:");
console.log(`  toString: ${params.toString()}`);

// 测试 1: entries() 方法
console.log("\n=== 测试 1: entries() ===");
const entries = params.entries();
console.log("entries 类型:", typeof entries);
console.log("entries 是数组?", Array.isArray(entries));

// 由于返回的是数组，直接遍历
console.log("遍历 entries:");
for (let i = 0; i < entries.length; i++) {
    const pair = entries[i];
    console.log(`  [${pair[0]}, ${pair[1]}]`);
}

// 测试 2: keys() 方法（修复后应该包含重复的 key）
console.log("\n=== 测试 2: keys() ===");
const keys = params.keys();
console.log("keys 数组:", keys);
console.log("keys 长度:", keys.length);
console.log("预期: 3 (key1, key1, key2)");

// 验证 keys 内容
let keyCount = 0;
for (let i = 0; i < keys.length; i++) {
    console.log(`  keys[${i}] = ${keys[i]}`);
    keyCount++;
}

if (keyCount === 3) {
    console.log("✅ keys() 测试通过 - 包含重复 key");
} else {
    console.log(`❌ keys() 测试失败 - 预期 3 个 key，实际 ${keyCount} 个`);
}

// 测试 3: values() 方法
console.log("\n=== 测试 3: values() ===");
const values = params.values();
console.log("values 数组:", values);
console.log("values 长度:", values.length);

for (let i = 0; i < values.length; i++) {
    console.log(`  values[${i}] = ${values[i]}`);
}

// 测试 4: 对比 forEach
console.log("\n=== 测试 4: 对比 forEach ===");
console.log("forEach 遍历:");
let forEachCount = 0;
params.forEach((value, name) => {
    console.log(`  ${name} = ${value}`);
    forEachCount++;
});

console.log(`forEach 迭代次数: ${forEachCount}`);
console.log(`keys() 返回数量: ${keys.length}`);

if (forEachCount === keys.length) {
    console.log("✅ forEach 和 keys() 数量一致");
} else {
    console.log("❌ forEach 和 keys() 数量不一致");
}

// 测试 5: 使用展开运算符
console.log("\n=== 测试 5: 展开运算符 ===");
try {
    const entriesArray = [...entries];
    console.log("✅ 展开运算符可用于 entries");
    console.log(`  展开后数量: ${entriesArray.length}`);
} catch (e) {
    console.log("❌ 展开运算符失败:", e.message);
}

// 测试 6: Array.from
console.log("\n=== 测试 6: Array.from ===");
try {
    const keysArray = Array.from(keys);
    console.log("✅ Array.from 可用于 keys");
    console.log(`  转换后数量: ${keysArray.length}`);
} catch (e) {
    console.log("❌ Array.from 失败:", e.message);
}

console.log("\n🎉 测试完成！");

return {
    success: true,
    entriesCount: entries.length,
    keysCount: keys.length,
    valuesCount: values.length,
    forEachCount: forEachCount
};


