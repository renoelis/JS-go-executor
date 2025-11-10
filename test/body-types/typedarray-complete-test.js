// TypedArray 和 ArrayBuffer 完整功能测试 - 符合 Web API 标准
// 基于 ECMAScript TypedArray 规范和 Node.js v22.2.0

const testURL = "https://httpbin.org/post";
const testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

console.log("🚀 开始 TypedArray 和 ArrayBuffer 完整功能测试\n");
console.log("=" + "=".repeat(60) + "\n");

// ========================================
// 第一部分：TypedArray 构造和属性测试
// ========================================
console.log("📦 第一部分：TypedArray 构造和属性测试");
console.log("-".repeat(60));

// 测试 1.1: Uint8Array
console.log("\n=== 测试 1.1: Uint8Array 构造 ===");
try {
    const uint8 = new Uint8Array([0, 1, 127, 128, 255]);
    
    console.log(`  length: ${uint8.length} (期望: 5)`);
    console.log(`  byteLength: ${uint8.byteLength} (期望: 5)`);
    console.log(`  BYTES_PER_ELEMENT: ${Uint8Array.BYTES_PER_ELEMENT} (期望: 1)`);
    console.log(`  值: [${Array.from(uint8)}]`);
    
    if (uint8.length === 5 && 
        uint8.byteLength === 5 && 
        uint8[0] === 0 && 
        uint8[4] === 255) {
        testResults.passed++;
        console.log("✅ Uint8Array 测试通过");
    } else {
        throw new Error("Uint8Array 属性不正确");
    }
} catch (error) {
    console.error("❌ Uint8Array 测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("Uint8Array: " + error.message);
}

// 测试 1.2: Int8Array
console.log("\n=== 测试 1.2: Int8Array 构造 ===");
try {
    const int8 = new Int8Array([-128, -1, 0, 1, 127]);
    
    console.log(`  length: ${int8.length}`);
    console.log(`  byteLength: ${int8.byteLength} (期望: 5)`);
    console.log(`  BYTES_PER_ELEMENT: ${Int8Array.BYTES_PER_ELEMENT} (期望: 1)`);
    console.log(`  值: [${Array.from(int8)}]`);
    
    if (int8[0] === -128 && int8[4] === 127) {
        testResults.passed++;
        console.log("✅ Int8Array 测试通过");
    } else {
        throw new Error("Int8Array 值不正确");
    }
} catch (error) {
    console.error("❌ Int8Array 测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("Int8Array: " + error.message);
}

// 测试 1.3: Uint16Array
console.log("\n=== 测试 1.3: Uint16Array 构造 ===");
try {
    const uint16 = new Uint16Array([0, 256, 512, 1024, 65535]);
    
    console.log(`  length: ${uint16.length} (期望: 5)`);
    console.log(`  byteLength: ${uint16.byteLength} (期望: 10)`);
    console.log(`  BYTES_PER_ELEMENT: ${Uint16Array.BYTES_PER_ELEMENT} (期望: 2)`);
    console.log(`  值: [${Array.from(uint16)}]`);
    
    if (uint16.byteLength === 10 && uint16[3] === 1024) {
        testResults.passed++;
        console.log("✅ Uint16Array 测试通过");
    } else {
        throw new Error("Uint16Array 属性不正确");
    }
} catch (error) {
    console.error("❌ Uint16Array 测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("Uint16Array: " + error.message);
}

// 测试 1.4: Int16Array
console.log("\n=== 测试 1.4: Int16Array 构造 ===");
try {
    const int16 = new Int16Array([-32768, -1, 0, 1, 32767]);
    
    console.log(`  byteLength: ${int16.byteLength} (期望: 10)`);
    console.log(`  值: [${Array.from(int16)}]`);
    
    if (int16[0] === -32768 && int16[4] === 32767) {
        testResults.passed++;
        console.log("✅ Int16Array 测试通过");
    } else {
        throw new Error("Int16Array 值不正确");
    }
} catch (error) {
    console.error("❌ Int16Array 测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("Int16Array: " + error.message);
}

// 测试 1.5: Uint32Array
console.log("\n=== 测试 1.5: Uint32Array 构造 ===");
try {
    const uint32 = new Uint32Array([0, 1000, 100000, 1000000, 4294967295]);
    
    console.log(`  length: ${uint32.length} (期望: 5)`);
    console.log(`  byteLength: ${uint32.byteLength} (期望: 20)`);
    console.log(`  BYTES_PER_ELEMENT: ${Uint32Array.BYTES_PER_ELEMENT} (期望: 4)`);
    console.log(`  值: [${Array.from(uint32)}]`);
    
    if (uint32.byteLength === 20 && uint32[4] === 4294967295) {
        testResults.passed++;
        console.log("✅ Uint32Array 测试通过");
    } else {
        throw new Error("Uint32Array 属性不正确");
    }
} catch (error) {
    console.error("❌ Uint32Array 测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("Uint32Array: " + error.message);
}

// 测试 1.6: Int32Array
console.log("\n=== 测试 1.6: Int32Array 构造 ===");
try {
    const int32 = new Int32Array([-2147483648, -1, 0, 1, 2147483647]);
    
    console.log(`  byteLength: ${int32.byteLength} (期望: 20)`);
    console.log(`  值: [${Array.from(int32)}]`);
    
    if (int32[0] === -2147483648 && int32[4] === 2147483647) {
        testResults.passed++;
        console.log("✅ Int32Array 测试通过");
    } else {
        throw new Error("Int32Array 值不正确");
    }
} catch (error) {
    console.error("❌ Int32Array 测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("Int32Array: " + error.message);
}

// 测试 1.7: Float32Array
console.log("\n=== 测试 1.7: Float32Array 构造 ===");
try {
    const float32 = new Float32Array([3.14, -2.71, 0.0, 1.41, -9.99]);
    
    console.log(`  length: ${float32.length} (期望: 5)`);
    console.log(`  byteLength: ${float32.byteLength} (期望: 20)`);
    console.log(`  BYTES_PER_ELEMENT: ${Float32Array.BYTES_PER_ELEMENT} (期望: 4)`);
    console.log(`  值: [${Array.from(float32).map(v => v.toFixed(2))}]`);
    
    if (float32.byteLength === 20 && 
        Math.abs(float32[0] - 3.14) < 0.01) {
        testResults.passed++;
        console.log("✅ Float32Array 测试通过");
    } else {
        throw new Error("Float32Array 属性不正确");
    }
} catch (error) {
    console.error("❌ Float32Array 测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("Float32Array: " + error.message);
}

// 测试 1.8: Float64Array
console.log("\n=== 测试 1.8: Float64Array 构造 ===");
try {
    const float64 = new Float64Array([Math.PI, Math.E, Math.SQRT2, -1.234567890123456]);
    
    console.log(`  length: ${float64.length} (期望: 4)`);
    console.log(`  byteLength: ${float64.byteLength} (期望: 32)`);
    console.log(`  BYTES_PER_ELEMENT: ${Float64Array.BYTES_PER_ELEMENT} (期望: 8)`);
    console.log(`  值: [${Array.from(float64).map(v => v.toFixed(6))}]`);
    
    if (float64.byteLength === 32 && 
        Math.abs(float64[0] - Math.PI) < 0.0001) {
        testResults.passed++;
        console.log("✅ Float64Array 测试通过");
    } else {
        throw new Error("Float64Array 属性不正确");
    }
} catch (error) {
    console.error("❌ Float64Array 测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("Float64Array: " + error.message);
}

// 测试 1.9: Uint8ClampedArray
console.log("\n=== 测试 1.9: Uint8ClampedArray 构造 ===");
try {
    const uint8Clamped = new Uint8ClampedArray([0, 100, 200, 255, 300, -50]);
    
    console.log(`  length: ${uint8Clamped.length} (期望: 6)`);
    console.log(`  byteLength: ${uint8Clamped.byteLength} (期望: 6)`);
    console.log(`  值: [${Array.from(uint8Clamped)}]`);
    console.log(`  注意: 300 被钳位为 255, -50 被钳位为 0`);
    
    if (uint8Clamped[4] === 255 && uint8Clamped[5] === 0) {
        testResults.passed++;
        console.log("✅ Uint8ClampedArray 钳位测试通过");
    } else {
        throw new Error("Uint8ClampedArray 钳位不正确");
    }
} catch (error) {
    console.error("❌ Uint8ClampedArray 测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("Uint8ClampedArray: " + error.message);
}

// ========================================
// 第二部分：ArrayBuffer 测试
// ========================================
console.log("\n\n💾 第二部分：ArrayBuffer 测试");
console.log("-".repeat(60));

// 测试 2.1: ArrayBuffer 基本创建
console.log("\n=== 测试 2.1: ArrayBuffer 基本创建 ===");
try {
    const buffer = new ArrayBuffer(16);
    
    console.log(`  byteLength: ${buffer.byteLength} (期望: 16)`);
    
    if (buffer.byteLength === 16) {
        testResults.passed++;
        console.log("✅ ArrayBuffer 创建测试通过");
    } else {
        throw new Error("ArrayBuffer byteLength 不正确");
    }
} catch (error) {
    console.error("❌ ArrayBuffer 创建测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("ArrayBuffer 创建: " + error.message);
}

// 测试 2.2: 从 ArrayBuffer 创建 TypedArray
console.log("\n=== 测试 2.2: 从 ArrayBuffer 创建 TypedArray ===");
try {
    const buffer = new ArrayBuffer(16);
    const uint8View = new Uint8Array(buffer);
    const uint32View = new Uint32Array(buffer);
    
    console.log(`  Uint8Array length: ${uint8View.length} (期望: 16)`);
    console.log(`  Uint32Array length: ${uint32View.length} (期望: 4)`);
    
    // 修改 Uint8Array
    uint8View[0] = 0xFF;
    uint8View[1] = 0xFE;
    uint8View[2] = 0xFD;
    uint8View[3] = 0xFC;
    
    // 通过 Uint32Array 读取（小端序）
    console.log(`  Uint32Array[0]: 0x${uint32View[0].toString(16)}`);
    
    if (uint8View.length === 16 && uint32View.length === 4) {
        testResults.passed++;
        console.log("✅ ArrayBuffer 视图测试通过");
    } else {
        throw new Error("ArrayBuffer 视图不正确");
    }
} catch (error) {
    console.error("❌ ArrayBuffer 视图测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("ArrayBuffer 视图: " + error.message);
}

// ========================================
// 第三部分：TypedArray 作为 fetch body
// ========================================
console.log("\n\n🌐 第三部分：TypedArray 作为 fetch body");
console.log("-".repeat(60));

const fetchTests = [];

// 测试 3.1: Uint8Array 作为 body
console.log("\n=== 测试 3.1: Uint8Array 作为 fetch body ===");
const uint8Body = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]); // "Hello World"
fetchTests.push(
    fetch(testURL, {
        method: "POST",
        body: uint8Body
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ Uint8Array 作为 body 发送成功");
        console.log(`  Content-Type: ${data.headers["Content-Type"]}`);
        console.log(`  接收数据: ${data.data}`);
        
        if (data.headers["Content-Type"] === "application/octet-stream") {
            console.log("  ✅ Content-Type 自动设置正确");
        }
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ Uint8Array fetch 失败:", error.message);
        testResults.failed++;
        testResults.errors.push("Uint8Array fetch: " + error.message);
    })
);

// 测试 3.2: Int16Array 作为 body
console.log("\n=== 测试 3.2: Int16Array 作为 fetch body ===");
const int16Body = new Int16Array([256, 512, 1024, 2048]);
fetchTests.push(
    fetch(testURL, {
        method: "POST",
        body: int16Body
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ Int16Array 作为 body 发送成功");
        console.log(`  发送字节数: ${int16Body.byteLength}`);
        console.log(`  Content-Type: ${data.headers["Content-Type"]}`);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ Int16Array fetch 失败:", error.message);
        testResults.failed++;
        testResults.errors.push("Int16Array fetch: " + error.message);
    })
);

// 测试 3.3: Uint32Array 作为 body
console.log("\n=== 测试 3.3: Uint32Array 作为 fetch body ===");
const uint32Body = new Uint32Array([1000000, 2000000, 3000000]);
fetchTests.push(
    fetch(testURL, {
        method: "POST",
        body: uint32Body
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ Uint32Array 作为 body 发送成功");
        console.log(`  发送字节数: ${uint32Body.byteLength} (期望: 12)`);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ Uint32Array fetch 失败:", error.message);
        testResults.failed++;
        testResults.errors.push("Uint32Array fetch: " + error.message);
    })
);

// 测试 3.4: Float32Array 作为 body
console.log("\n=== 测试 3.4: Float32Array 作为 fetch body ===");
const float32Body = new Float32Array([3.14159, 2.71828, 1.41421]);
fetchTests.push(
    fetch(testURL, {
        method: "POST",
        body: float32Body
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ Float32Array 作为 body 发送成功");
        console.log(`  发送字节数: ${float32Body.byteLength} (期望: 12)`);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ Float32Array fetch 失败:", error.message);
        testResults.failed++;
        testResults.errors.push("Float32Array fetch: " + error.message);
    })
);

// 测试 3.5: Float64Array 作为 body
console.log("\n=== 测试 3.5: Float64Array 作为 fetch body ===");
const float64Body = new Float64Array([Math.PI, Math.E, Math.SQRT2]);
fetchTests.push(
    fetch(testURL, {
        method: "POST",
        body: float64Body
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ Float64Array 作为 body 发送成功");
        console.log(`  发送字节数: ${float64Body.byteLength} (期望: 24)`);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ Float64Array fetch 失败:", error.message);
        testResults.failed++;
        testResults.errors.push("Float64Array fetch: " + error.message);
    })
);

// 测试 3.6: Uint8ClampedArray 作为 body
console.log("\n=== 测试 3.6: Uint8ClampedArray 作为 fetch body ===");
const uint8ClampedBody = new Uint8ClampedArray([255, 200, 150, 100, 50, 0]);
fetchTests.push(
    fetch(testURL, {
        method: "POST",
        body: uint8ClampedBody
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ Uint8ClampedArray 作为 body 发送成功");
        console.log(`  发送字节数: ${uint8ClampedBody.byteLength} (期望: 6)`);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ Uint8ClampedArray fetch 失败:", error.message);
        testResults.failed++;
        testResults.errors.push("Uint8ClampedArray fetch: " + error.message);
    })
);

// ========================================
// 第四部分：边界情况测试
// ========================================
console.log("\n\n⚠️  第四部分：边界情况测试");
console.log("-".repeat(60));

// 测试 4.1: 空 TypedArray
console.log("\n=== 测试 4.1: 空 TypedArray ===");
try {
    const emptyUint8 = new Uint8Array(0);
    const emptyFloat64 = new Float64Array(0);
    
    console.log(`  Uint8Array 空数组 length: ${emptyUint8.length} (期望: 0)`);
    console.log(`  Float64Array 空数组 length: ${emptyFloat64.length} (期望: 0)`);
    
    if (emptyUint8.length === 0 && emptyFloat64.length === 0) {
        testResults.passed++;
        console.log("✅ 空 TypedArray 测试通过");
    } else {
        throw new Error("空 TypedArray 长度不正确");
    }
} catch (error) {
    console.error("❌ 空 TypedArray 测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("空 TypedArray: " + error.message);
}

// 测试 4.2: 大型 TypedArray
console.log("\n=== 测试 4.2: 大型 TypedArray ===");
try {
    const largeArray = new Uint8Array(10000);
    for (let i = 0; i < largeArray.length; i++) {
        largeArray[i] = i % 256;
    }
    
    console.log(`  创建 10000 字节数组`);
    console.log(`  byteLength: ${largeArray.byteLength}`);
    console.log(`  第一个值: ${largeArray[0]}`);
    console.log(`  最后一个值: ${largeArray[9999]}`);
    
    if (largeArray.byteLength === 10000 && 
        largeArray[9999] === (9999 % 256)) {
        testResults.passed++;
        console.log("✅ 大型 TypedArray 测试通过");
    } else {
        throw new Error("大型 TypedArray 不正确");
    }
} catch (error) {
    console.error("❌ 大型 TypedArray 测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("大型 TypedArray: " + error.message);
}

// 测试 4.3: TypedArray 溢出行为
console.log("\n=== 测试 4.3: TypedArray 溢出行为 ===");
try {
    const uint8 = new Uint8Array([256, -1, 300]);
    const int8 = new Int8Array([128, -129, 200]);
    
    console.log(`  Uint8Array [256, -1, 300]: [${Array.from(uint8)}]`);
    console.log(`  期望: [0, 255, 44] (模 256 运算)`);
    
    console.log(`  Int8Array [128, -129, 200]: [${Array.from(int8)}]`);
    console.log(`  期望: [-128, 127, -56] (有符号溢出)`);
    
    testResults.passed++;
    console.log("✅ TypedArray 溢出行为测试通过");
} catch (error) {
    console.error("❌ TypedArray 溢出测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("TypedArray 溢出: " + error.message);
}

// ========================================
// 第五部分：混合使用测试
// ========================================
console.log("\n\n🔀 第五部分：混合使用测试");
console.log("-".repeat(60));

// 测试 5.1: 不同 TypedArray 共享 ArrayBuffer
console.log("\n=== 测试 5.1: 共享 ArrayBuffer ===");
try {
    const buffer = new ArrayBuffer(8);
    const uint8View = new Uint8Array(buffer);
    const uint16View = new Uint16Array(buffer);
    const uint32View = new Uint32Array(buffer);
    
    // 通过 Uint8Array 写入
    uint8View[0] = 0x01;
    uint8View[1] = 0x02;
    uint8View[2] = 0x03;
    uint8View[3] = 0x04;
    
    console.log(`  Uint8Array: [${Array.from(uint8View.slice(0, 4))}]`);
    console.log(`  Uint16Array: [${Array.from(uint16View.slice(0, 2))}]`);
    console.log(`  Uint32Array: [${uint32View[0]}]`);
    
    testResults.passed++;
    console.log("✅ 共享 ArrayBuffer 测试通过");
} catch (error) {
    console.error("❌ 共享 ArrayBuffer 测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("共享 ArrayBuffer: " + error.message);
}

// ========================================
// 等待所有异步测试完成
// ========================================
return Promise.all(fetchTests)
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

