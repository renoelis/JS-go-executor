// 简单的 Buffer 测试
try {
    const buf = Buffer.alloc(100 * 1024 * 1024);
    const result = {
        success: true,
        length: buf.length
    };
    console.log(JSON.stringify(result));
    return result;
} catch (e) {
    const result = {
        success: false,
        error: e.message,
        stack: e.stack
    };
    console.log(JSON.stringify(result));
    return result;
}
