// Blob 和 File Body 类型测试

const testURL = "https://httpbin.org/post";

console.log("🚀 开始 Blob/File Body 类型测试\n");

// 测试 1: Blob 作为 body
console.log("=== 测试 1: Blob 作为 body ===");
const blob1 = new Blob(["Hello, World!"], { type: "text/plain" });
console.log(`Blob 创建成功: size=${blob1.size}, type=${blob1.type}`);

fetch(testURL, {
    method: "POST",
    body: blob1
})
.then(response => response.json())
.then(data => {
    console.log("✅ Blob 测试成功");
    console.log(`  Content-Type: ${data.headers["Content-Type"]}`);
    console.log(`  数据: ${data.data}`);
})
.catch(error => {
    console.error("❌ Blob 测试失败:", error.message);
});

// 测试 2: File 作为 body
console.log("\n=== 测试 2: File 作为 body ===");
const file1 = new File(["File content here"], "test.txt", { type: "text/plain" });
console.log(`File 创建成功: name=${file1.name}, size=${file1.size}, type=${file1.type}`);

fetch(testURL, {
    method: "POST",
    body: file1
})
.then(response => response.json())
.then(data => {
    console.log("✅ File 测试成功");
    console.log(`  Content-Type: ${data.headers["Content-Type"]}`);
    console.log(`  数据: ${data.data}`);
})
.catch(error => {
    console.error("❌ File 测试失败:", error.message);
});

// 测试 3: Blob 与二进制数据
console.log("\n=== 测试 3: Blob 二进制数据 ===");
const uint8Array = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
const blob2 = new Blob([uint8Array], { type: "application/octet-stream" });

fetch(testURL, {
    method: "POST",
    body: blob2
})
.then(response => response.json())
.then(data => {
    console.log("✅ Blob 二进制测试成功");
    console.log(`  Content-Type: ${data.headers["Content-Type"]}`);
})
.catch(error => {
    console.error("❌ Blob 二进制测试失败:", error.message);
});

// 测试 4: File 与 JSON 数据
console.log("\n=== 测试 4: File JSON 数据 ===");
const jsonData = JSON.stringify({ name: "test", value: 123 });
const file2 = new File([jsonData], "data.json", { type: "application/json" });

fetch(testURL, {
    method: "POST",
    body: file2
})
.then(response => response.json())
.then(data => {
    console.log("✅ File JSON 测试成功");
    console.log(`  Content-Type: ${data.headers["Content-Type"]}`);
    console.log(`  JSON 数据: ${data.json}`);
})
.catch(error => {
    console.error("❌ File JSON 测试失败:", error.message);
});

// 等待所有 Promise 完成
return new Promise(resolve => {
    setTimeout(() => {
        console.log("\n🎉 Blob/File 测试完成！");
        resolve({ success: true });
    }, 5000);
});









