// Web API 迭代器完整功能测试

console.log("🎯 Web API 迭代器完整功能测试\n");

let testsPassed = 0;
let testsFailed = 0;

// ==================== URLSearchParams 测试 ====================
console.log("📦 1. URLSearchParams 迭代器测试");
console.log("─".repeat(50));

const params = new URLSearchParams();
params.append("key1", "value1");
params.append("key1", "value2"); // 重复 key
params.append("key2", "value3");

// 测试 1.1: keys() 包含重复
try {
    const keys = [...params.keys()];
    if (keys.length === 3 && keys[0] === "key1" && keys[1] === "key1") {
        console.log("✅ 1.1 keys() 正确包含重复 key");
        testsPassed++;
    } else {
        console.log("❌ 1.1 keys() 重复 key 错误");
        testsFailed++;
    }
} catch (e) {
    console.log("❌ 1.1 keys() 失败:", e.message);
    testsFailed++;
}

// 测试 1.2: for...of 遍历 params.entries()
try {
    let count = 0;
    for (const [key, value] of params.entries()) {
        count++;
    }
    if (count === 3) {
        console.log("✅ 1.2 params.entries() 支持 for...of");
        testsPassed++;
    } else {
        console.log("❌ 1.2 params.entries() 迭代次数错误");
        testsFailed++;
    }
} catch (e) {
    console.log("❌ 1.2 params.entries() 失败:", e.message);
    testsFailed++;
}

// 测试 1.3: for...of 直接遍历 params
try {
    let count = 0;
    for (const [key, value] of params) {
        count++;
    }
    if (count === 3) {
        console.log("✅ 1.3 URLSearchParams 本身支持 for...of");
        testsPassed++;
    } else {
        console.log("❌ 1.3 URLSearchParams 迭代次数错误");
        testsFailed++;
    }
} catch (e) {
    console.log("❌ 1.3 URLSearchParams 不支持 for...of:", e.message);
    testsFailed++;
}

// 测试 1.4: values() 方法
try {
    const values = [...params.values()];
    if (values.length === 3) {
        console.log("✅ 1.4 params.values() 工作正常");
        testsPassed++;
    } else {
        console.log("❌ 1.4 params.values() 返回数量错误");
        testsFailed++;
    }
} catch (e) {
    console.log("❌ 1.4 params.values() 失败:", e.message);
    testsFailed++;
}

console.log("");

// ==================== FormData 测试 ====================
console.log("📦 2. FormData 迭代器测试");
console.log("─".repeat(50));

const formData = new FormData();
formData.append("username", "alice");
formData.append("email", "alice@example.com");
formData.append("username", "bob"); // 重复 key

// 测试 2.1: entries() 方法存在
try {
    const entries = formData.entries();
    if (entries && entries.length > 0) {
        console.log("✅ 2.1 formData.entries() 方法存在");
        testsPassed++;
    } else {
        console.log("❌ 2.1 formData.entries() 返回为空");
        testsFailed++;
    }
} catch (e) {
    console.log("❌ 2.1 formData.entries() 不存在:", e.message);
    testsFailed++;
}

// 测试 2.2: keys() 包含重复
try {
    const keys = [...formData.keys()];
    if (keys.length === 3) {
        console.log(`✅ 2.2 formData.keys() 正确包含重复 key (${keys.length} 个)`);
        testsPassed++;
    } else {
        console.log(`❌ 2.2 formData.keys() 数量错误: ${keys.length}`);
        testsFailed++;
    }
} catch (e) {
    console.log("❌ 2.2 formData.keys() 失败:", e.message);
    testsFailed++;
}

// 测试 2.3: values() 方法
try {
    const values = [...formData.values()];
    if (values.length === 3) {
        console.log("✅ 2.3 formData.values() 工作正常");
        testsPassed++;
    } else {
        console.log(`❌ 2.3 formData.values() 数量错误: ${values.length}`);
        testsFailed++;
    }
} catch (e) {
    console.log("❌ 2.3 formData.values() 失败:", e.message);
    testsFailed++;
}

// 测试 2.4: for...of 遍历 formData.entries()
try {
    let count = 0;
    for (const [name, value] of formData.entries()) {
        count++;
    }
    if (count === 3) {
        console.log("✅ 2.4 formData.entries() 支持 for...of");
        testsPassed++;
    } else {
        console.log("❌ 2.4 formData.entries() 迭代次数错误");
        testsFailed++;
    }
} catch (e) {
    console.log("❌ 2.4 formData.entries() 失败:", e.message);
    testsFailed++;
}

// 测试 2.5: for...of 直接遍历 formData
try {
    let count = 0;
    for (const [name, value] of formData) {
        count++;
    }
    if (count === 3) {
        console.log("✅ 2.5 FormData 本身支持 for...of");
        testsPassed++;
    } else {
        console.log("❌ 2.5 FormData 迭代次数错误");
        testsFailed++;
    }
} catch (e) {
    console.log("❌ 2.5 FormData 不支持 for...of:", e.message);
    testsFailed++;
}

console.log("");

// ==================== 一致性测试 ====================
console.log("📦 3. API 一致性测试");
console.log("─".repeat(50));

// 测试 3.1: URLSearchParams forEach 与 for...of 一致性
try {
    let forEachCount = 0;
    let forOfCount = 0;
    
    params.forEach(() => forEachCount++);
    for (const _ of params) forOfCount++;
    
    if (forEachCount === forOfCount) {
        console.log(`✅ 3.1 URLSearchParams forEach 与 for...of 一致 (${forEachCount})`);
        testsPassed++;
    } else {
        console.log("❌ 3.1 URLSearchParams forEach 与 for...of 不一致");
        testsFailed++;
    }
} catch (e) {
    console.log("❌ 3.1 一致性测试失败:", e.message);
    testsFailed++;
}

// 测试 3.2: FormData forEach 与 for...of 一致性
try {
    let forEachCount = 0;
    let forOfCount = 0;
    
    formData.forEach(() => forEachCount++);
    for (const _ of formData) forOfCount++;
    
    if (forEachCount === forOfCount) {
        console.log(`✅ 3.2 FormData forEach 与 for...of 一致 (${forEachCount})`);
        testsPassed++;
    } else {
        console.log("❌ 3.2 FormData forEach 与 for...of 不一致");
        testsFailed++;
    }
} catch (e) {
    console.log("❌ 3.2 一致性测试失败:", e.message);
    testsFailed++;
}

console.log("");

// ==================== 测试总结 ====================
console.log("═".repeat(50));
console.log("📊 测试结果总结");
console.log("═".repeat(50));
console.log(`✅ 通过: ${testsPassed}`);
console.log(`❌ 失败: ${testsFailed}`);
console.log(`📈 成功率: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

if (testsFailed === 0) {
    console.log("\n🎉 所有测试通过！Web API 迭代器功能完整！");
} else {
    console.log(`\n⚠️  有 ${testsFailed} 个测试失败，需要检查`);
}

return {
    success: testsFailed === 0,
    passed: testsPassed,
    failed: testsFailed,
    total: testsPassed + testsFailed
};


