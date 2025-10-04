// URLSearchParams Node.js v22 新功能测试
// 测试 delete(name, value), has(name, value), sort(), size 属性

const testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

console.log("🚀 开始 URLSearchParams Node.js v22 新功能测试\n");
console.log("=" + "=".repeat(60) + "\n");

// ========================================
// 第一部分：delete(name, value) 测试
// ========================================
console.log("📦 第一部分：delete(name, value) 测试");
console.log("-".repeat(60));

// 测试 1.1: delete(name, value) - 删除指定键值对
console.log("\n=== 测试 1.1: delete(name, value) - 删除指定键值对 ===");
try {
    const params = new URLSearchParams();
    params.append("color", "red");
    params.append("color", "blue");
    params.append("color", "green");
    params.append("size", "large");
    
    console.log(`  添加前: ${params.toString()}`);
    console.log(`  color 的所有值: [${params.getAll("color")}]`);
    
    // 只删除 color=blue
    params.delete("color", "blue");
    
    console.log(`  删除 color=blue 后: ${params.toString()}`);
    const remainingColors = params.getAll("color");
    console.log(`  剩余 color 值: [${remainingColors}]`);
    
    if (remainingColors.length === 2 && 
        remainingColors.includes("red") && 
        remainingColors.includes("green") &&
        !remainingColors.includes("blue")) {
        testResults.passed++;
        console.log("✅ delete(name, value) 指定值删除测试通过");
    } else {
        throw new Error("delete(name, value) 未正确删除指定值");
    }
} catch (error) {
    console.error("❌ delete(name, value) 指定值删除测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("delete(name, value) 指定值: " + error.message);
}

// 测试 1.2: delete(name, value) - 删除最后一个值时清除键
console.log("\n=== 测试 1.2: delete(name, value) - 删除最后一个值 ===");
try {
    const params = new URLSearchParams();
    params.append("status", "active");
    
    console.log(`  删除前: ${params.toString()}`);
    console.log(`  has('status'): ${params.has("status")}`);
    
    params.delete("status", "active");
    
    console.log(`  删除 status=active 后: ${params.toString()}`);
    console.log(`  has('status'): ${params.has("status")}`);
    
    if (!params.has("status")) {
        testResults.passed++;
        console.log("✅ delete(name, value) 删除最后一个值测试通过");
    } else {
        throw new Error("delete(name, value) 删除最后一个值后键仍存在");
    }
} catch (error) {
    console.error("❌ delete(name, value) 删除最后一个值测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("delete(name, value) 最后值: " + error.message);
}

// 测试 1.3: delete(name) - 传统行为保持不变
console.log("\n=== 测试 1.3: delete(name) - 传统行为 ===");
try {
    const params = new URLSearchParams();
    params.append("tag", "a");
    params.append("tag", "b");
    params.append("tag", "c");
    
    console.log(`  删除前: ${params.toString()}`);
    console.log(`  tag 数量: ${params.getAll("tag").length}`);
    
    params.delete("tag"); // 不传第二个参数
    
    console.log(`  删除后: ${params.toString()}`);
    console.log(`  has('tag'): ${params.has("tag")}`);
    
    if (!params.has("tag")) {
        testResults.passed++;
        console.log("✅ delete(name) 传统行为测试通过");
    } else {
        throw new Error("delete(name) 未删除所有值");
    }
} catch (error) {
    console.error("❌ delete(name) 传统行为测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("delete(name) 传统: " + error.message);
}

// ========================================
// 第二部分：has(name, value) 测试
// ========================================
console.log("\n\n📊 第二部分：has(name, value) 测试");
console.log("-".repeat(60));

// 测试 2.1: has(name, value) - 检查指定键值对
console.log("\n=== 测试 2.1: has(name, value) - 检查指定键值对 ===");
try {
    const params = new URLSearchParams();
    params.append("fruit", "apple");
    params.append("fruit", "banana");
    params.append("fruit", "orange");
    
    console.log(`  参数: ${params.toString()}`);
    console.log(`  has('fruit', 'apple'): ${params.has("fruit", "apple")}`);
    console.log(`  has('fruit', 'banana'): ${params.has("fruit", "banana")}`);
    console.log(`  has('fruit', 'grape'): ${params.has("fruit", "grape")}`);
    
    if (params.has("fruit", "apple") === true &&
        params.has("fruit", "banana") === true &&
        params.has("fruit", "grape") === false) {
        testResults.passed++;
        console.log("✅ has(name, value) 检查键值对测试通过");
    } else {
        throw new Error("has(name, value) 返回值不正确");
    }
} catch (error) {
    console.error("❌ has(name, value) 检查键值对测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("has(name, value) 键值对: " + error.message);
}

// 测试 2.2: has(name) - 传统行为保持不变
console.log("\n=== 测试 2.2: has(name) - 传统行为 ===");
try {
    const params = new URLSearchParams("a=1&b=2&c=3");
    
    console.log(`  参数: ${params.toString()}`);
    console.log(`  has('a'): ${params.has("a")}`);
    console.log(`  has('b'): ${params.has("b")}`);
    console.log(`  has('d'): ${params.has("d")}`);
    
    if (params.has("a") === true &&
        params.has("b") === true &&
        params.has("d") === false) {
        testResults.passed++;
        console.log("✅ has(name) 传统行为测试通过");
    } else {
        throw new Error("has(name) 返回值不正确");
    }
} catch (error) {
    console.error("❌ has(name) 传统行为测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("has(name) 传统: " + error.message);
}

// ========================================
// 第三部分：sort() 测试
// ========================================
console.log("\n\n🔀 第三部分：sort() 测试");
console.log("-".repeat(60));

// 测试 3.1: sort() - 按键名排序
console.log("\n=== 测试 3.1: sort() - 按键名排序 ===");
try {
    const params = new URLSearchParams();
    params.append("zebra", "1");
    params.append("apple", "2");
    params.append("mango", "3");
    params.append("banana", "4");
    
    console.log(`  排序前: ${params.toString()}`);
    
    params.sort();
    
    const sortedStr = params.toString();
    console.log(`  排序后: ${sortedStr}`);
    
    // 检查顺序：apple, banana, mango, zebra
    const keys = [];
    params.forEach((value, key) => {
        if (!keys.includes(key)) keys.push(key);
    });
    console.log(`  键顺序: [${keys}]`);
    
    if (keys[0] === "apple" && 
        keys[1] === "banana" && 
        keys[2] === "mango" && 
        keys[3] === "zebra") {
        testResults.passed++;
        console.log("✅ sort() 排序测试通过");
    } else {
        throw new Error(`sort() 排序不正确: [${keys}]`);
    }
} catch (error) {
    console.error("❌ sort() 排序测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("sort() 排序: " + error.message);
}

// 测试 3.2: sort() - 稳定排序（相同键的值顺序不变）
console.log("\n=== 测试 3.2: sort() - 稳定排序 ===");
try {
    const params = new URLSearchParams();
    params.append("z", "first");
    params.append("z", "second");
    params.append("a", "alpha");
    params.append("z", "third");
    
    console.log(`  排序前: ${params.toString()}`);
    
    params.sort();
    
    console.log(`  排序后: ${params.toString()}`);
    
    const zValues = params.getAll("z");
    console.log(`  z 的值顺序: [${zValues}]`);
    
    if (zValues[0] === "first" && 
        zValues[1] === "second" && 
        zValues[2] === "third") {
        testResults.passed++;
        console.log("✅ sort() 稳定排序测试通过");
    } else {
        throw new Error(`sort() 值顺序改变: [${zValues}]`);
    }
} catch (error) {
    console.error("❌ sort() 稳定排序测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("sort() 稳定: " + error.message);
}

// ========================================
// 第四部分：size 属性测试
// ========================================
console.log("\n\n📏 第四部分：size 属性测试");
console.log("-".repeat(60));

// 测试 4.1: size - 空参数
console.log("\n=== 测试 4.1: size - 空参数 ===");
try {
    const params = new URLSearchParams();
    
    console.log(`  空参数 size: ${params.size} (期望: 0)`);
    
    if (params.size === 0) {
        testResults.passed++;
        console.log("✅ size 空参数测试通过");
    } else {
        throw new Error(`size 不正确: ${params.size}`);
    }
} catch (error) {
    console.error("❌ size 空参数测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("size 空: " + error.message);
}

// 测试 4.2: size - 单个值
console.log("\n=== 测试 4.2: size - 单个值 ===");
try {
    const params = new URLSearchParams("a=1&b=2&c=3");
    
    console.log(`  参数: ${params.toString()}`);
    console.log(`  size: ${params.size} (期望: 3)`);
    
    if (params.size === 3) {
        testResults.passed++;
        console.log("✅ size 单个值测试通过");
    } else {
        throw new Error(`size 不正确: ${params.size}`);
    }
} catch (error) {
    console.error("❌ size 单个值测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("size 单个值: " + error.message);
}

// 测试 4.3: size - 重复键（包括重复键的所有值）
console.log("\n=== 测试 4.3: size - 重复键 ===");
try {
    const params = new URLSearchParams();
    params.append("tag", "a");
    params.append("tag", "b");
    params.append("tag", "c");
    params.append("name", "test");
    
    console.log(`  参数: ${params.toString()}`);
    console.log(`  size: ${params.size} (期望: 4 - 3个tag + 1个name)`);
    
    if (params.size === 4) {
        testResults.passed++;
        console.log("✅ size 重复键测试通过");
    } else {
        throw new Error(`size 不正确: ${params.size}, 期望: 4`);
    }
} catch (error) {
    console.error("❌ size 重复键测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("size 重复键: " + error.message);
}

// 测试 4.4: size - 动态更新
console.log("\n=== 测试 4.4: size - 动态更新 ===");
try {
    const params = new URLSearchParams();
    
    console.log(`  初始 size: ${params.size}`);
    
    params.append("a", "1");
    console.log(`  append 后 size: ${params.size} (期望: 1)`);
    
    params.append("a", "2");
    console.log(`  再次 append 后 size: ${params.size} (期望: 2)`);
    
    params.delete("a", "1");
    console.log(`  delete(name, value) 后 size: ${params.size} (期望: 1)`);
    
    params.delete("a");
    console.log(`  delete(name) 后 size: ${params.size} (期望: 0)`);
    
    if (params.size === 0) {
        testResults.passed++;
        console.log("✅ size 动态更新测试通过");
    } else {
        throw new Error(`size 最终值不正确: ${params.size}`);
    }
} catch (error) {
    console.error("❌ size 动态更新测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("size 动态: " + error.message);
}

// ========================================
// 第五部分：综合测试
// ========================================
console.log("\n\n🔬 第五部分：综合功能测试");
console.log("-".repeat(60));

// 测试 5.1: 所有新功能组合使用
console.log("\n=== 测试 5.1: 所有新功能组合使用 ===");
try {
    const params = new URLSearchParams();
    
    // 添加数据
    params.append("z_last", "1");
    params.append("a_first", "2");
    params.append("color", "red");
    params.append("color", "blue");
    params.append("color", "green");
    
    console.log(`  初始: ${params.toString()}`);
    console.log(`  初始 size: ${params.size}`);
    console.log(`  has('color', 'blue'): ${params.has("color", "blue")}`);
    
    // 删除特定值
    params.delete("color", "blue");
    console.log(`  删除 color=blue 后 size: ${params.size}`);
    console.log(`  has('color', 'blue'): ${params.has("color", "blue")}`);
    
    // 排序
    params.sort();
    console.log(`  排序后: ${params.toString()}`);
    
    // 验证
    const firstKey = params.toString().split("&")[0].split("=")[0];
    console.log(`  第一个键: ${firstKey} (期望: a_first)`);
    
    if (firstKey === "a_first" && 
        !params.has("color", "blue") && 
        params.size === 4) {
        testResults.passed++;
        console.log("✅ 综合功能测试通过");
    } else {
        throw new Error("综合功能测试失败");
    }
} catch (error) {
    console.error("❌ 综合功能测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("综合功能: " + error.message);
}

// ========================================
// 测试结果汇总
// ========================================
console.log("\n\n" + "=".repeat(60));
console.log("📊 测试结果汇总");
console.log("=".repeat(60));
console.log(`✅ 通过: ${testResults.passed} 个测试`);
console.log(`❌ 失败: ${testResults.failed} 个测试`);

if (testResults.errors.length > 0) {
    console.log("\n❌ 错误详情:");
    testResults.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
    });
}

const success = testResults.failed === 0;
const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2);

console.log("\n" + "=".repeat(60));
console.log(success ? "🎉 所有 Node.js v22 新功能测试通过！" : `⚠️  部分测试失败 (成功率: ${successRate}%)`);
console.log("=".repeat(60));

return {
    success: success,
    passed: testResults.passed,
    failed: testResults.failed,
    errors: testResults.errors,
    successRate: successRate
};

