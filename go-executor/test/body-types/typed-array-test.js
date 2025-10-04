// TypedArray Body 类型测试 - 完善版

const testURL = "https://httpbin.org/post";
const tests = [];
const testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

console.log("🚀 开始 TypedArray Body 类型测试\n");

// 测试 1: Uint8Array (手动设置 Content-Type)
console.log("=== 测试 1: Uint8Array (手动设置 Content-Type) ===");
const uint8 = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
tests.push(
    fetch(testURL, {
        method: "POST",
        body: uint8,
        headers: {
            "Content-Type": "application/octet-stream"
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ Uint8Array 测试成功");
        console.log("  发送的数据:", data.data);
        console.log("  Content-Type:", data.headers["Content-Type"]);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ Uint8Array 测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("Uint8Array: " + error.message);
    })
);

// 测试 2: Uint8Array (自动设置 Content-Type)
console.log("\n=== 测试 2: Uint8Array (自动设置 Content-Type) ===");
const uint8Auto = new Uint8Array([65, 66, 67, 68]); // "ABCD"
tests.push(
    fetch(testURL, {
        method: "POST",
        body: uint8Auto
        // 不设置 Content-Type，让系统自动设置
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ Uint8Array 自动 Content-Type 测试成功");
        console.log("  自动设置的 Content-Type:", data.headers["Content-Type"]);
        if (data.headers["Content-Type"] === "application/octet-stream") {
            console.log("  ✅ Content-Type 自动设置正确");
        }
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ Uint8Array 自动 Content-Type 测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("Uint8Array Auto: " + error.message);
    })
);

// 测试 3: Int16Array
console.log("\n=== 测试 3: Int16Array ===");
const int16 = new Int16Array([256, 512, 1024]);
tests.push(
    fetch(testURL, {
        method: "POST",
        body: int16
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ Int16Array 测试成功");
        console.log("  发送的数据长度:", data.data.length);
        console.log("  字节数:", int16.byteLength, "bytes");
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ Int16Array 测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("Int16Array: " + error.message);
    })
);

// 测试 4: Uint32Array
console.log("\n=== 测试 4: Uint32Array ===");
const uint32 = new Uint32Array([1000, 2000, 3000, 4000]);
tests.push(
    fetch(testURL, {
        method: "POST",
        body: uint32
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ Uint32Array 测试成功");
        console.log("  Content-Length:", data.headers["Content-Length"]);
        console.log("  预期字节数:", uint32.byteLength);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ Uint32Array 测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("Uint32Array: " + error.message);
    })
);

// 测试 5: Float32Array
console.log("\n=== 测试 5: Float32Array ===");
const float32 = new Float32Array([3.14159, 2.71828, 1.41421]);
tests.push(
    fetch(testURL, {
        method: "POST",
        body: float32
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ Float32Array 测试成功");
        console.log("  Float 数据已发送，字节数:", float32.byteLength);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ Float32Array 测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("Float32Array: " + error.message);
    })
);

// 测试 6: Float64Array
console.log("\n=== 测试 6: Float64Array ===");
const float64 = new Float64Array([Math.PI, Math.E, Math.SQRT2]);
tests.push(
    fetch(testURL, {
        method: "POST",
        body: float64
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ Float64Array 测试成功");
        console.log("  Double 数据已发送，字节数:", float64.byteLength);
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ Float64Array 测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("Float64Array: " + error.message);
    })
);

// 测试 7: Int8Array
console.log("\n=== 测试 7: Int8Array ===");
const int8 = new Int8Array([-128, -1, 0, 1, 127]);
tests.push(
    fetch(testURL, {
        method: "POST",
        body: int8
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ Int8Array 测试成功");
        console.log("  有符号字节数组已发送");
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ Int8Array 测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("Int8Array: " + error.message);
    })
);

// 测试 8: Uint8ClampedArray
console.log("\n=== 测试 8: Uint8ClampedArray ===");
const uint8Clamped = new Uint8ClampedArray([255, 256, -1, 0, 128]);
tests.push(
    fetch(testURL, {
        method: "POST",
        body: uint8Clamped
    })
    .then(response => response.json())
    .then(data => {
        console.log("✅ Uint8ClampedArray 测试成功");
        console.log("  Clamped 数组已发送（值被限制在 0-255）");
        testResults.passed++;
    })
    .catch(error => {
        console.error("❌ Uint8ClampedArray 测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("Uint8ClampedArray: " + error.message);
    })
);

// 等待所有测试完成并返回结果
return Promise.all(tests).then(() => {
    console.log("\n" + "=".repeat(50));
    console.log("📊 测试结果汇总:");
    console.log(`  ✅ 通过: ${testResults.passed} 个测试`);
    console.log(`  ❌ 失败: ${testResults.failed} 个测试`);

    if (testResults.errors.length > 0) {
        console.log("\n❌ 错误详情:");
        testResults.errors.forEach(error => {
            console.log(`  - ${error}`);
        });
    }

    const success = testResults.failed === 0;
    console.log("\n" + (success ? "🎉" : "⚠️") +
                " TypedArray 测试" +
                (success ? "全部通过！" : "部分失败"));

    return {
        success: success,
        passed: testResults.passed,
        failed: testResults.failed,
        errors: testResults.errors,
        message: success ?
            "所有 TypedArray 类型测试通过" :
            `${testResults.failed} 个测试失败，请检查错误日志`
    };
});

