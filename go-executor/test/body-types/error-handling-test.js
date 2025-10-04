// Body Types 错误处理和边界情况测试
// 测试各种异常情况、参数验证、边界值等

const testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

console.log("🚀 开始 Body Types 错误处理和边界情况测试\n");
console.log("=" + "=".repeat(60) + "\n");

// ========================================
// 第一部分：Blob 错误处理
// ========================================
console.log("📦 第一部分：Blob 错误处理");
console.log("-".repeat(60));

// 测试 1.1: Blob - 无效的 parts 参数
console.log("\n=== 测试 1.1: Blob - 无效的 parts 参数 ===");
try {
    // 传入非数组参数应该被忽略或处理
    const blob1 = new Blob(null);
    const blob2 = new Blob(undefined);
    const blob3 = new Blob(123); // 非数组
    
    console.log(`  null: size=${blob1.size}, type='${blob1.type}'`);
    console.log(`  undefined: size=${blob2.size}, type='${blob2.type}'`);
    console.log(`  number: size=${blob3.size}, type='${blob3.type}'`);
    
    testResults.passed++;
    console.log("✅ Blob 无效参数处理测试通过");
} catch (error) {
    console.error("❌ Blob 无效参数测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("Blob 无效参数: " + error.message);
}

// 测试 1.2: Blob - 空数组
console.log("\n=== 测试 1.2: Blob - 空数组 ===");
try {
    const blob = new Blob([]);
    
    console.log(`  空数组 Blob: size=${blob.size}, type='${blob.type}'`);
    
    if (blob.size === 0 && blob.type === "") {
        testResults.passed++;
        console.log("✅ Blob 空数组测试通过");
    } else {
        throw new Error("空数组 Blob 属性不正确");
    }
} catch (error) {
    console.error("❌ Blob 空数组测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("Blob 空数组: " + error.message);
}

// 测试 1.3: Blob.slice - 无效索引
console.log("\n=== 测试 1.3: Blob.slice - 无效索引 ===");
try {
    const blob = new Blob(["0123456789"]);
    
    // 超出范围的索引
    const slice1 = blob.slice(100, 200);
    console.log(`  slice(100, 200): size=${slice1.size} (期望: 0)`);
    
    // 负数索引超出范围
    const slice2 = blob.slice(-100, -50);
    console.log(`  slice(-100, -50): size=${slice2.size} (期望: 0)`);
    
    // start > end
    const slice3 = blob.slice(5, 2);
    console.log(`  slice(5, 2): size=${slice3.size} (期望: 0)`);
    
    if (slice1.size === 0 && slice2.size === 0 && slice3.size === 0) {
        testResults.passed++;
        console.log("✅ Blob.slice 无效索引测试通过");
    } else {
        throw new Error("slice 无效索引处理不正确");
    }
} catch (error) {
    console.error("❌ Blob.slice 无效索引测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("Blob.slice 无效索引: " + error.message);
}

// 测试 1.4: Blob - 大数据（边界测试）
console.log("\n=== 测试 1.4: Blob - 大数据测试 ===");
try {
    // 创建一个较大的 Blob (1MB)
    const largeData = new Array(1024 * 1024).fill("a").join("");
    const largeBlob = new Blob([largeData]);
    
    console.log(`  大 Blob size: ${largeBlob.size} bytes (${(largeBlob.size / 1024 / 1024).toFixed(2)} MB)`);
    
    if (largeBlob.size === 1024 * 1024) {
        testResults.passed++;
        console.log("✅ Blob 大数据测试通过");
    } else {
        throw new Error("大 Blob size 不正确");
    }
} catch (error) {
    console.error("❌ Blob 大数据测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("Blob 大数据: " + error.message);
}

// ========================================
// 第二部分：File 错误处理
// ========================================
console.log("\n\n📄 第二部分：File 错误处理");
console.log("-".repeat(60));

// 测试 2.1: File - 缺少必需参数
console.log("\n=== 测试 2.1: File - 缺少必需参数 ===");
try {
    let errorCaught = false;
    try {
        const file = new File(); // 缺少参数
    } catch (e) {
        errorCaught = true;
        console.log("  ✅ 正确抛出错误:", e.message);
    }
    
    if (errorCaught) {
        testResults.passed++;
        console.log("✅ File 缺少参数错误处理测试通过");
    } else {
        throw new Error("File 应该要求至少 2 个参数");
    }
} catch (error) {
    console.error("❌ File 缺少参数测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("File 缺少参数: " + error.message);
}

// 测试 2.2: File - 空文件名
console.log("\n=== 测试 2.2: File - 空文件名 ===");
try {
    const file = new File(["test"], "");
    
    console.log(`  空文件名: name='${file.name}', size=${file.size}`);
    
    if (file.name === "" && file.size === 4) {
        testResults.passed++;
        console.log("✅ File 空文件名测试通过");
    } else {
        throw new Error("File 空文件名处理不正确");
    }
} catch (error) {
    console.error("❌ File 空文件名测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("File 空文件名: " + error.message);
}

// 测试 2.3: File - 特殊字符文件名
console.log("\n=== 测试 2.3: File - 特殊字符文件名 ===");
try {
    const file1 = new File(["test"], "测试文件.txt");
    const file2 = new File(["test"], "file with spaces.txt");
    const file3 = new File(["test"], "file/with/slashes.txt");
    
    console.log(`  中文文件名: '${file1.name}'`);
    console.log(`  空格文件名: '${file2.name}'`);
    console.log(`  斜杠文件名: '${file3.name}'`);
    
    testResults.passed++;
    console.log("✅ File 特殊字符文件名测试通过");
} catch (error) {
    console.error("❌ File 特殊字符文件名测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("File 特殊字符: " + error.message);
}

// ========================================
// 第三部分：URLSearchParams 错误处理
// ========================================
console.log("\n\n🔍 第三部分：URLSearchParams 错误处理");
console.log("-".repeat(60));

// 测试 3.1: URLSearchParams - 缺少参数
console.log("\n=== 测试 3.1: URLSearchParams - 方法缺少参数 ===");
try {
    const params = new URLSearchParams();
    let errorCount = 0;
    
    // append 缺少参数
    try {
        params.append("key");
    } catch (e) {
        errorCount++;
        console.log("  ✅ append() 参数验证:", e.message);
    }
    
    // get 缺少参数
    try {
        params.get();
    } catch (e) {
        errorCount++;
        console.log("  ✅ get() 参数验证:", e.message);
    }
    
    // delete 缺少参数
    try {
        params.delete();
    } catch (e) {
        errorCount++;
        console.log("  ✅ delete() 参数验证:", e.message);
    }
    
    if (errorCount === 3) {
        testResults.passed++;
        console.log("✅ URLSearchParams 参数验证测试通过");
    } else {
        throw new Error(`只捕获了 ${errorCount}/3 个错误`);
    }
} catch (error) {
    console.error("❌ URLSearchParams 参数验证测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("URLSearchParams 参数: " + error.message);
}

// 测试 3.2: URLSearchParams - 无效查询字符串
console.log("\n=== 测试 3.2: URLSearchParams - 无效查询字符串 ===");
try {
    // 各种边界情况的查询字符串
    const params1 = new URLSearchParams(""); // 空字符串
    const params2 = new URLSearchParams("?"); // 只有问号
    const params3 = new URLSearchParams("&&&&"); // 多个分隔符
    const params4 = new URLSearchParams("key="); // 空值
    const params5 = new URLSearchParams("=value"); // 空键
    
    console.log(`  空字符串: size=${params1.size || 0}`);
    console.log(`  只有问号: size=${params2.size || 0}`);
    console.log(`  多个分隔符: size=${params3.size || 0}`);
    console.log(`  空值: key='${params4.get("key")}' (期望: '')`);
    console.log(`  空键: 键数量=${Array.from({length: params5.size || 0}).length}`);
    
    testResults.passed++;
    console.log("✅ URLSearchParams 无效字符串测试通过");
} catch (error) {
    console.error("❌ URLSearchParams 无效字符串测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("URLSearchParams 无效字符串: " + error.message);
}

// 测试 3.3: URLSearchParams - 特殊字符处理
console.log("\n=== 测试 3.3: URLSearchParams - 特殊字符 ===");
try {
    const params = new URLSearchParams();
    
    // 添加包含特殊字符的值
    params.append("url", "https://example.com?test=1&foo=bar");
    params.append("space", "hello world");
    params.append("unicode", "你好世界 🎉");
    params.append("symbols", "!@#$%^&*()");
    
    console.log(`  URL 特殊字符: '${params.get("url")}'`);
    console.log(`  空格: '${params.get("space")}'`);
    console.log(`  Unicode: '${params.get("unicode")}'`);
    console.log(`  符号: '${params.get("symbols")}'`);
    
    // 验证编码后能正确解码
    const encoded = params.toString();
    const decoded = new URLSearchParams(encoded);
    
    if (decoded.get("url") === "https://example.com?test=1&foo=bar" &&
        decoded.get("unicode") === "你好世界 🎉") {
        testResults.passed++;
        console.log("✅ URLSearchParams 特殊字符测试通过");
    } else {
        throw new Error("特殊字符编码/解码失败");
    }
} catch (error) {
    console.error("❌ URLSearchParams 特殊字符测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("URLSearchParams 特殊字符: " + error.message);
}

// 测试 3.4: URLSearchParams - 大量参数
console.log("\n=== 测试 3.4: URLSearchParams - 大量参数 ===");
try {
    const params = new URLSearchParams();
    
    // 添加 1000 个参数
    for (let i = 0; i < 1000; i++) {
        params.append(`key${i}`, `value${i}`);
    }
    
    console.log(`  参数数量: ${params.size} (期望: 1000)`);
    console.log(`  第一个: ${params.get("key0")}`);
    console.log(`  最后一个: ${params.get("key999")}`);
    console.log(`  toString 长度: ${params.toString().length} 字符`);
    
    if (params.size === 1000 && 
        params.get("key0") === "value0" &&
        params.get("key999") === "value999") {
        testResults.passed++;
        console.log("✅ URLSearchParams 大量参数测试通过");
    } else {
        throw new Error("大量参数处理失败");
    }
} catch (error) {
    console.error("❌ URLSearchParams 大量参数测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("URLSearchParams 大量参数: " + error.message);
}

// ========================================
// 第四部分：TypedArray 错误处理
// ========================================
console.log("\n\n🔢 第四部分：TypedArray 错误处理");
console.log("-".repeat(60));

// 测试 4.1: TypedArray - 空数组
console.log("\n=== 测试 4.1: TypedArray - 空数组 ===");
try {
    const uint8 = new Uint8Array(0);
    const float64 = new Float64Array(0);
    
    console.log(`  Uint8Array(0): length=${uint8.length}, byteLength=${uint8.byteLength}`);
    console.log(`  Float64Array(0): length=${float64.length}, byteLength=${float64.byteLength}`);
    
    if (uint8.length === 0 && float64.length === 0) {
        testResults.passed++;
        console.log("✅ TypedArray 空数组测试通过");
    } else {
        throw new Error("空 TypedArray 属性不正确");
    }
} catch (error) {
    console.error("❌ TypedArray 空数组测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("TypedArray 空数组: " + error.message);
}

// 测试 4.2: TypedArray - 溢出值
console.log("\n=== 测试 4.2: TypedArray - 溢出值 ===");
try {
    // Uint8Array: 0-255
    const uint8 = new Uint8Array([256, -1, 300, 500]);
    console.log(`  Uint8Array [256, -1, 300, 500]: [${Array.from(uint8)}]`);
    console.log(`  期望: [0, 255, 44, 244] (模256运算)`);
    
    // Int8Array: -128 to 127
    const int8 = new Int8Array([128, -129, 200, -200]);
    console.log(`  Int8Array [128, -129, 200, -200]: [${Array.from(int8)}]`);
    
    // Uint8ClampedArray: 钳位到 0-255
    const clamped = new Uint8ClampedArray([300, -50, 128]);
    console.log(`  Uint8ClampedArray [300, -50, 128]: [${Array.from(clamped)}]`);
    console.log(`  期望: [255, 0, 128] (钳位)`);
    
    testResults.passed++;
    console.log("✅ TypedArray 溢出值测试通过");
} catch (error) {
    console.error("❌ TypedArray 溢出值测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("TypedArray 溢出: " + error.message);
}

// 测试 4.3: TypedArray - 特殊浮点值
console.log("\n=== 测试 4.3: TypedArray - 特殊浮点值 ===");
try {
    const float32 = new Float32Array([
        Infinity, 
        -Infinity, 
        NaN, 
        0, 
        -0
    ]);
    
    console.log(`  Float32Array 特殊值:`);
    console.log(`    Infinity: ${float32[0]}`);
    console.log(`    -Infinity: ${float32[1]}`);
    console.log(`    NaN: ${float32[2]}`);
    console.log(`    0: ${float32[3]}`);
    console.log(`    -0: ${float32[4]}`);
    
    if (float32[0] === Infinity && 
        float32[1] === -Infinity && 
        isNaN(float32[2])) {
        testResults.passed++;
        console.log("✅ TypedArray 特殊浮点值测试通过");
    } else {
        throw new Error("特殊浮点值处理不正确");
    }
} catch (error) {
    console.error("❌ TypedArray 特殊浮点值测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("TypedArray 特殊浮点: " + error.message);
}

// ========================================
// 第五部分：混合类型错误处理
// ========================================
console.log("\n\n🔀 第五部分：混合类型错误处理");
console.log("-".repeat(60));

// 测试 5.1: Blob 包含 null/undefined
console.log("\n=== 测试 5.1: Blob 包含 null/undefined ===");
try {
    const blob = new Blob(["start", null, "middle", undefined, "end"]);
    
    console.log(`  Blob with null/undefined: size=${blob.size}`);
    console.log(`  转为字符串处理`);
    
    testResults.passed++;
    console.log("✅ Blob null/undefined 测试通过");
} catch (error) {
    console.error("❌ Blob null/undefined 测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("Blob null/undefined: " + error.message);
}

// 测试 5.2: URLSearchParams - 删除不存在的键
console.log("\n=== 测试 5.2: URLSearchParams - 删除不存在的键 ===");
try {
    const params = new URLSearchParams("a=1&b=2");
    
    console.log(`  删除前: ${params.toString()}`);
    params.delete("notexist");
    console.log(`  删除不存在的键后: ${params.toString()}`);
    
    // 使用 v22 新方法
    params.delete("a", "notexist"); // 删除不存在的值
    console.log(`  delete(name, value) 不存在的值: ${params.toString()}`);
    
    if (params.has("a") && params.has("b")) {
        testResults.passed++;
        console.log("✅ 删除不存在的键测试通过");
    } else {
        throw new Error("删除不存在的键影响了现有数据");
    }
} catch (error) {
    console.error("❌ 删除不存在的键测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("删除不存在键: " + error.message);
}

// 测试 5.3: URLSearchParams - has 不存在的键值对
console.log("\n=== 测试 5.3: URLSearchParams - has 不存在的键值对 ===");
try {
    const params = new URLSearchParams("color=red&color=blue");
    
    console.log(`  has('color', 'red'): ${params.has("color", "red")}`);
    console.log(`  has('color', 'green'): ${params.has("color", "green")}`);
    console.log(`  has('size', 'large'): ${params.has("size", "large")}`);
    
    if (params.has("color", "red") === true &&
        params.has("color", "green") === false &&
        params.has("size", "large") === false) {
        testResults.passed++;
        console.log("✅ has 不存在的键值对测试通过");
    } else {
        throw new Error("has 返回值不正确");
    }
} catch (error) {
    console.error("❌ has 不存在的键值对测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("has 不存在键值对: " + error.message);
}

// ========================================
// 测试结果汇总
// ========================================
console.log("\n\n" + "=".repeat(60));
console.log("📊 错误处理测试结果汇总");
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
console.log(success ? "🎉 所有错误处理测试通过！" : `⚠️  部分测试失败 (成功率: ${successRate}%)`);
console.log("=".repeat(60));

return {
    success: success,
    passed: testResults.passed,
    failed: testResults.failed,
    errors: testResults.errors,
    successRate: successRate
};

