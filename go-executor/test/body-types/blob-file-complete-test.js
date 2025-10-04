// Blob 和 File API 完整功能测试 - 符合 Web API 标准
// 基于 WHATWG File API 标准和 Node.js v22.2.0

const testURL = "https://httpbin.org/post";
const testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

console.log("🚀 开始 Blob/File API 完整功能测试\n");
console.log("=" + "=".repeat(60) + "\n");

// ========================================
// 第一部分：Blob 构造函数测试
// ========================================
console.log("📦 第一部分：Blob 构造函数测试");
console.log("-".repeat(60));

// 测试 1.1: 创建空 Blob
console.log("\n=== 测试 1.1: 创建空 Blob ===");
try {
    const emptyBlob = new Blob();
    console.log("✅ 空 Blob 创建成功");
    console.log(`  size: ${emptyBlob.size} (期望: 0)`);
    console.log(`  type: '${emptyBlob.type}' (期望: '')`);
    
    if (emptyBlob.size === 0 && emptyBlob.type === "") {
        testResults.passed++;
        console.log("  ✅ 空 Blob 属性验证通过");
    } else {
        throw new Error(`空 Blob 属性不符合预期: size=${emptyBlob.size}, type='${emptyBlob.type}'`);
    }
} catch (error) {
    console.error("❌ 空 Blob 创建失败:", error.message);
    testResults.failed++;
    testResults.errors.push("空 Blob: " + error.message);
}

// 测试 1.2: 使用字符串数组创建 Blob
console.log("\n=== 测试 1.2: 使用字符串数组创建 Blob ===");
try {
    const stringBlob = new Blob(["Hello, ", "World!"], { type: "text/plain" });
    console.log("✅ 字符串 Blob 创建成功");
    console.log(`  size: ${stringBlob.size} (期望: 13)`);
    console.log(`  type: '${stringBlob.type}' (期望: 'text/plain')`);
    
    if (stringBlob.size === 13 && stringBlob.type === "text/plain") {
        testResults.passed++;
        console.log("  ✅ 字符串 Blob 属性验证通过");
    } else {
        throw new Error(`字符串 Blob 属性不符合预期`);
    }
} catch (error) {
    console.error("❌ 字符串 Blob 创建失败:", error.message);
    testResults.failed++;
    testResults.errors.push("字符串 Blob: " + error.message);
}

// 测试 1.3: 使用 Uint8Array 创建 Blob
console.log("\n=== 测试 1.3: 使用 Uint8Array 创建 Blob ===");
try {
    const uint8Array = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const arrayBlob = new Blob([uint8Array], { type: "application/octet-stream" });
    console.log("✅ Uint8Array Blob 创建成功");
    console.log(`  size: ${arrayBlob.size} (期望: 5)`);
    console.log(`  type: '${arrayBlob.type}'`);
    
    if (arrayBlob.size === 5) {
        testResults.passed++;
        console.log("  ✅ Uint8Array Blob 属性验证通过");
    } else {
        throw new Error(`Uint8Array Blob size 不符合预期: ${arrayBlob.size}`);
    }
} catch (error) {
    console.error("❌ Uint8Array Blob 创建失败:", error.message);
    testResults.failed++;
    testResults.errors.push("Uint8Array Blob: " + error.message);
}

// 测试 1.4: 使用混合数组创建 Blob
console.log("\n=== 测试 1.4: 使用混合数组创建 Blob ===");
try {
    const uint8 = new Uint8Array([65, 66, 67]); // "ABC"
    const mixedBlob = new Blob(["Start-", uint8, "-End"], { type: "text/plain" });
    console.log("✅ 混合数组 Blob 创建成功");
    console.log(`  size: ${mixedBlob.size} (期望: 13)`);
    
    if (mixedBlob.size === 13) {
        testResults.passed++;
        console.log("  ✅ 混合数组 Blob 属性验证通过");
    } else {
        throw new Error(`混合数组 Blob size 不符合预期: ${mixedBlob.size}`);
    }
} catch (error) {
    console.error("❌ 混合数组 Blob 创建失败:", error.message);
    testResults.failed++;
    testResults.errors.push("混合数组 Blob: " + error.message);
}

// ========================================
// 第二部分：Blob 属性测试
// ========================================
console.log("\n\n📊 第二部分：Blob 属性测试");
console.log("-".repeat(60));

// 测试 2.1: size 属性
console.log("\n=== 测试 2.1: size 属性 ===");
try {
    const blob1 = new Blob(["12345"]);
    const blob2 = new Blob([new Uint8Array(100)]);
    
    console.log(`  字符串 Blob size: ${blob1.size} (期望: 5)`);
    console.log(`  100字节数组 Blob size: ${blob2.size} (期望: 100)`);
    
    if (blob1.size === 5 && blob2.size === 100) {
        testResults.passed++;
        console.log("✅ size 属性测试通过");
    } else {
        throw new Error("size 属性值不正确");
    }
} catch (error) {
    console.error("❌ size 属性测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("size 属性: " + error.message);
}

// 测试 2.2: type 属性
console.log("\n=== 测试 2.2: type 属性 ===");
try {
    const blob1 = new Blob(["test"], { type: "text/plain" });
    const blob2 = new Blob(["test"], { type: "application/json" });
    const blob3 = new Blob(["test"]); // 无 type
    
    console.log(`  text/plain type: '${blob1.type}'`);
    console.log(`  application/json type: '${blob2.type}'`);
    console.log(`  无 type: '${blob3.type}' (期望: '')`);
    
    if (blob1.type === "text/plain" && 
        blob2.type === "application/json" && 
        blob3.type === "") {
        testResults.passed++;
        console.log("✅ type 属性测试通过");
    } else {
        throw new Error("type 属性值不正确");
    }
} catch (error) {
    console.error("❌ type 属性测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("type 属性: " + error.message);
}

// ========================================
// 第三部分：Blob 方法测试
// ========================================
console.log("\n\n🔧 第三部分：Blob 方法测试");
console.log("-".repeat(60));

// 测试 3.1: slice() 方法 - 基本切片
console.log("\n=== 测试 3.1: slice() 方法 - 基本切片 ===");
try {
    const originalBlob = new Blob(["0123456789"], { type: "text/plain" });
    const slicedBlob = originalBlob.slice(2, 7);
    
    console.log(`  原始 Blob size: ${originalBlob.size}`);
    console.log(`  切片 Blob size: ${slicedBlob.size} (期望: 5)`);
    console.log(`  切片 Blob type: '${slicedBlob.type}' (应继承原 type)`);
    
    if (slicedBlob.size === 5 && slicedBlob.type === "text/plain") {
        testResults.passed++;
        console.log("✅ slice() 基本测试通过");
    } else {
        throw new Error(`slice() 结果不符合预期`);
    }
} catch (error) {
    console.error("❌ slice() 基本测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("slice() 基本: " + error.message);
}

// 测试 3.2: slice() 方法 - 负索引
console.log("\n=== 测试 3.2: slice() 方法 - 负索引 ===");
try {
    const blob = new Blob(["0123456789"]);
    const sliced1 = blob.slice(-5);      // 最后5个字节
    const sliced2 = blob.slice(0, -3);   // 除了最后3个
    const sliced3 = blob.slice(-7, -2);  // 从倒数第7到倒数第2
    
    console.log(`  slice(-5) size: ${sliced1.size} (期望: 5)`);
    console.log(`  slice(0, -3) size: ${sliced2.size} (期望: 7)`);
    console.log(`  slice(-7, -2) size: ${sliced3.size} (期望: 5)`);
    
    if (sliced1.size === 5 && sliced2.size === 7 && sliced3.size === 5) {
        testResults.passed++;
        console.log("✅ slice() 负索引测试通过");
    } else {
        throw new Error("slice() 负索引结果不符合预期");
    }
} catch (error) {
    console.error("❌ slice() 负索引测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("slice() 负索引: " + error.message);
}

// 测试 3.3: slice() 方法 - 覆盖 content type
console.log("\n=== 测试 3.3: slice() 方法 - 覆盖 content type ===");
try {
    const blob = new Blob(["test data"], { type: "text/plain" });
    const sliced = blob.slice(0, 4, "application/json");
    
    console.log(`  原始 type: '${blob.type}'`);
    console.log(`  切片后 type: '${sliced.type}' (期望: 'application/json')`);
    
    if (sliced.type === "application/json") {
        testResults.passed++;
        console.log("✅ slice() type 覆盖测试通过");
    } else {
        throw new Error("slice() type 覆盖失败");
    }
} catch (error) {
    console.error("❌ slice() type 覆盖测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("slice() type: " + error.message);
}

// 测试 3.4: arrayBuffer() 方法
console.log("\n=== 测试 3.4: arrayBuffer() 方法 ===");
const arrayBufferPromise = new Promise((resolve, reject) => {
    try {
        const blob = new Blob([new Uint8Array([1, 2, 3, 4, 5])]);
        const abPromise = blob.arrayBuffer();
        
        if (abPromise && typeof abPromise.then === 'function') {
            console.log("  ✅ arrayBuffer() 返回 Promise");
            
            abPromise.then(arrayBuffer => {
                console.log(`  ArrayBuffer byteLength: ${arrayBuffer.byteLength} (期望: 5)`);
                const view = new Uint8Array(arrayBuffer);
                console.log(`  数据内容: [${Array.from(view)}]`);
                
                if (arrayBuffer.byteLength === 5 && 
                    view[0] === 1 && view[4] === 5) {
                    testResults.passed++;
                    console.log("✅ arrayBuffer() 测试通过");
                    resolve();
                } else {
                    throw new Error("arrayBuffer() 数据不正确");
                }
            }).catch(error => {
                console.error("❌ arrayBuffer() Promise 失败:", error.message);
                testResults.failed++;
                testResults.errors.push("arrayBuffer(): " + error.message);
                reject(error);
            });
        } else {
            throw new Error("arrayBuffer() 未返回 Promise");
        }
    } catch (error) {
        console.error("❌ arrayBuffer() 测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("arrayBuffer(): " + error.message);
        reject(error);
    }
});

// 测试 3.5: text() 方法
console.log("\n=== 测试 3.5: text() 方法 ===");
const textPromise = new Promise((resolve, reject) => {
    try {
        const blob = new Blob(["Hello, World!"], { type: "text/plain" });
        const textPromise = blob.text();
        
        if (textPromise && typeof textPromise.then === 'function') {
            console.log("  ✅ text() 返回 Promise");
            
            textPromise.then(text => {
                console.log(`  文本内容: "${text}" (期望: "Hello, World!")`);
                
                if (text === "Hello, World!") {
                    testResults.passed++;
                    console.log("✅ text() 测试通过");
                    resolve();
                } else {
                    throw new Error(`text() 返回内容不正确: "${text}"`);
                }
            }).catch(error => {
                console.error("❌ text() Promise 失败:", error.message);
                testResults.failed++;
                testResults.errors.push("text(): " + error.message);
                reject(error);
            });
        } else {
            throw new Error("text() 未返回 Promise");
        }
    } catch (error) {
        console.error("❌ text() 测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("text(): " + error.message);
        reject(error);
    }
});

// ========================================
// 第四部分：File 构造函数测试
// ========================================
console.log("\n\n📄 第四部分：File 构造函数测试");
console.log("-".repeat(60));

// 测试 4.1: 基本 File 创建
console.log("\n=== 测试 4.1: 基本 File 创建 ===");
try {
    const file = new File(["file content"], "test.txt", { type: "text/plain" });
    
    console.log(`  name: '${file.name}' (期望: 'test.txt')`);
    console.log(`  size: ${file.size} (期望: 12)`);
    console.log(`  type: '${file.type}' (期望: 'text/plain')`);
    console.log(`  lastModified: ${file.lastModified} (时间戳)`);
    
    if (file.name === "test.txt" && 
        file.size === 12 && 
        file.type === "text/plain" &&
        typeof file.lastModified === "number") {
        testResults.passed++;
        console.log("✅ 基本 File 创建测试通过");
    } else {
        throw new Error("File 属性不符合预期");
    }
} catch (error) {
    console.error("❌ 基本 File 创建测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("基本 File: " + error.message);
}

// 测试 4.2: File 带 lastModified 选项
console.log("\n=== 测试 4.2: File 带 lastModified 选项 ===");
try {
    const customTime = 1609459200000; // 2021-01-01 00:00:00 UTC
    const file = new File(["test"], "file.txt", { 
        type: "text/plain",
        lastModified: customTime
    });
    
    console.log(`  lastModified: ${file.lastModified} (期望: ${customTime})`);
    
    if (file.lastModified === customTime) {
        testResults.passed++;
        console.log("✅ File lastModified 测试通过");
    } else {
        throw new Error(`lastModified 不符合预期: ${file.lastModified}`);
    }
} catch (error) {
    console.error("❌ File lastModified 测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("File lastModified: " + error.message);
}

// 测试 4.3: File 继承 Blob 的方法
console.log("\n=== 测试 4.3: File 继承 Blob 的方法 ===");
try {
    const file = new File(["0123456789"], "data.txt");
    
    // 测试 slice 方法
    const sliced = file.slice(0, 5);
    console.log(`  slice() size: ${sliced.size} (期望: 5)`);
    
    // 测试 text 方法（返回 Promise）
    const hasTextMethod = typeof file.text === 'function';
    const hasArrayBufferMethod = typeof file.arrayBuffer === 'function';
    
    console.log(`  text() 方法存在: ${hasTextMethod}`);
    console.log(`  arrayBuffer() 方法存在: ${hasArrayBufferMethod}`);
    
    if (sliced.size === 5 && hasTextMethod && hasArrayBufferMethod) {
        testResults.passed++;
        console.log("✅ File 继承 Blob 方法测试通过");
    } else {
        throw new Error("File 未正确继承 Blob 的方法");
    }
} catch (error) {
    console.error("❌ File 继承测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("File 继承: " + error.message);
}

// ========================================
// 第五部分：使用 Blob/File 作为 fetch body
// ========================================
console.log("\n\n🌐 第五部分：使用 Blob/File 作为 fetch body");
console.log("-".repeat(60));

const fetchTests = [];

// 测试 5.1: Blob 作为 fetch body
console.log("\n=== 测试 5.1: Blob 作为 fetch body ===");
const blob1 = new Blob(["Blob body content"], { type: "text/plain" });
fetchTests.push(
    fetch(testURL, {
        method: "POST",
        body: blob1
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ Blob 作为 body 发送成功");
        console.log(`  Content-Type: ${data.headers["Content-Type"]}`);
        console.log(`  接收数据: ${data.data}`);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ Blob fetch 失败:", error.message);
        testResults.failed++;
        testResults.errors.push("Blob fetch: " + error.message);
    })
);

// 测试 5.2: File 作为 fetch body
console.log("\n=== 测试 5.2: File 作为 fetch body ===");
const file1 = new File(["File body content"], "upload.txt", { type: "text/plain" });
fetchTests.push(
    fetch(testURL, {
        method: "POST",
        body: file1
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ File 作为 body 发送成功");
        console.log(`  Content-Type: ${data.headers["Content-Type"]}`);
        console.log(`  文件名: ${file1.name}`);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ File fetch 失败:", error.message);
        testResults.failed++;
        testResults.errors.push("File fetch: " + error.message);
    })
);

// 测试 5.3: 二进制 Blob 作为 fetch body
console.log("\n=== 测试 5.3: 二进制 Blob 作为 fetch body ===");
const binaryData = new Uint8Array([0xFF, 0xFE, 0xFD, 0xFC]);
const binaryBlob = new Blob([binaryData], { type: "application/octet-stream" });
fetchTests.push(
    fetch(testURL, {
        method: "POST",
        body: binaryBlob
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ 二进制 Blob 发送成功");
        console.log(`  Content-Type: ${data.headers["Content-Type"]}`);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ 二进制 Blob fetch 失败:", error.message);
        testResults.failed++;
        testResults.errors.push("二进制 Blob fetch: " + error.message);
    })
);

// ========================================
// 等待所有异步测试完成
// ========================================
return Promise.all([arrayBufferPromise, textPromise, ...fetchTests])
    .then(() => {
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
        console.log(success ? "🎉 所有测试通过！" : `⚠️  部分测试失败 (成功率: ${successRate}%)`);
        console.log("=".repeat(60));
        
        return {
            success: success,
            passed: testResults.passed,
            failed: testResults.failed,
            errors: testResults.errors,
            successRate: successRate
        };
    })
    .catch(error => {
        console.error("\n❌ 测试执行过程中发生严重错误:", error);
        return {
            success: false,
            error: error.message
        };
    });

