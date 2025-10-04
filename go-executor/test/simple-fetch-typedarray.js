// 简单的 fetch + TypedArray 测试
console.log("=== 测试 fetch + Uint8Array ===");

const uint8 = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
console.log("创建 Uint8Array:", uint8.length, "字节");

fetch("https://httpbin.org/post", {
    method: "POST",
    body: uint8
})
.then(response => {
    console.log("✅ Response 收到");
    return response.json();
})
.then(data => {
    console.log("✅ 数据解析成功");
    console.log("Content-Type:", data.headers["Content-Type"]);
    console.log("Data:", data.data);
    return { success: true };
})
.catch(error => {
    console.error("❌ 错误:", error.message);
    return { success: false, error: error.message };
});








