// 测试实际写入内存（触发物理分配）
const buffers = [];
let count = 0;
let totalMB = 0;
let error = null;

try {
    // 尝试分配并写入 50 个 100MB 的 Buffer (总共 5GB)
    for (let i = 0; i < 50; i++) {
        const buf = Buffer.alloc(100 * 1024 * 1024);

        // 实际写入数据，触发物理内存分配
        for (let j = 0; j < buf.length; j += 4096) {
            buf[j] = i % 256;
        }

        buffers.push(buf);
        count++;
        totalMB += 100;

        if (count % 5 === 0) {
            console.log(`已分配并写入: ${count} 个 Buffer, 总计 ${totalMB} MB`);
        }
    }
} catch (e) {
    error = e.message;
    console.log(`错误在第 ${count} 次分配: ${e.message}`);
}

const result = {
    count: count,
    totalMB: totalMB,
    totalGB: (totalMB / 1024).toFixed(2),
    error: error
};

console.log(JSON.stringify(result));
return result;
