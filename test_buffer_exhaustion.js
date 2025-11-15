// 测试内存耗尽攻击
const buffers = [];
let count = 0;
let totalMB = 0;
let error = null;

try {
    // 尝试分配 30 个 100MB 的 Buffer (总共 3GB)
    for (let i = 0; i < 30; i++) {
        buffers.push(Buffer.alloc(100 * 1024 * 1024));
        count++;
        totalMB += 100;
    }
} catch (e) {
    error = e.message;
}

const result = {
    count: count,
    totalMB: totalMB,
    error: error,
    success: error === null
};

console.log(JSON.stringify(result));
return result;
