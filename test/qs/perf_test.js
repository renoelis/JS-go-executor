// 性能测试
const startTime = Date.now();

// 模拟 test/qs/1.js 的测试
const iterations = 1000;

for (let i = 0; i < iterations; i++) {
    // 简单 parse
    qs.parse("a=1&b=2&c=3");
    
    // 简单 stringify
    qs.stringify({a: "1", b: "2", c: "3"});
    
    // 嵌套对象
    qs.parse("user[name]=John&user[age]=30");
    qs.stringify({user: {name: "John", age: 30}});
}

const endTime = Date.now();
const totalTime = endTime - startTime;

({
    success: true,
    iterations: iterations,
    totalTime: totalTime,
    avgTime: totalTime / iterations,
    opsPerSec: (iterations * 4) / (totalTime / 1000)
});
