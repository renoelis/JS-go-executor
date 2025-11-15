// 测试小 Buffer 累积攻击
const buffers = [];
let count = 0;
let totalMB = 0;
let error = null;

try {
    // 尝试分配 1000 个 10MB 的 Buffer (总共 10GB)
    for (let i = 0; i < 1000; i++) {
        buffers.push(Buffer.alloc(10 * 1024 * 1024));
        count++;
        totalMB += 10;

        if (count % 100 === 0) {
            console.log(`已分配: ${count} 个 10MB Buffer, 总计 ${totalMB} MB`);
        }
    }
} catch (e) {
    error = e.message;
}

const result = {
    count: count,
    totalMB: totalMB,
    totalGB: (totalMB / 1024).toFixed(2),
    error: error
};

console.log(JSON.stringify(result));
return result;
