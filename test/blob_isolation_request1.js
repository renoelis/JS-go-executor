// 测试 Runtime 隔离性 - 第 1 个请求
// 创建一个 Blob URL 并返回，用于验证第 2 个请求无法访问

const { Buffer } = require('buffer');

try {
    // 创建一个 Blob
    const secretData = 'This is secret data from request 1';
    const blob = new Blob([secretData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    console.log('Request 1: Created Blob URL:', url);

    // 验证当前请求可以访问
    const resolved = require('buffer').resolveObjectURL(url);
    if (!resolved) {
        throw new Error('Failed to resolve own Blob URL');
    }

    console.log('Request 1: Successfully resolved own Blob URL');

    const testResults = {
        success: true,
        blobUrl: url,
        message: 'Request 1 created Blob URL successfully',
        note: 'This URL should NOT be accessible from Request 2'
    };

    console.log(JSON.stringify(testResults, null, 2));
    return testResults;

} catch (error) {
    const testResults = {
        success: false,
        error: error.message,
        stack: error.stack
    };
    console.log(JSON.stringify(testResults, null, 2));
    return testResults;
}
