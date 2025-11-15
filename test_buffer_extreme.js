// 测试更极端的内存耗尽攻击
const buffers = [];
let count = 0;
let totalMB = 0;
let error = null;

try {
    // 尝试分配 100 个 100MB 的 Buffer (总共 10GB)
    for (let i = 0; i < 100; i++) {
        buffers.push(Buffer.alloc(100 * 1024 * 1024));
        count++;
        totalMB += 100;

        // 每 10 次打印进度
        if (count % 10 === 0) {
            console.log(`已分配: ${count} 个 Buffer, 总计 ${totalMB} MB`);
        }
    }
} catch (e) {
    error = e.message;
}

const result = {
    count: count,
    totalMB: totalMB,
    totalGB: (totalMB / 1024).toFixed(2),
    error: error,
    success: error === null
};

console.log(JSON.stringify(result));
return result;
