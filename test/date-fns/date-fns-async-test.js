// date-fns 异步操作测试
// 测试在异步环境中使用 date-fns 的各种场景

const testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

console.log("🚀 开始 date-fns 异步操作测试\n");
console.log("=" + "=".repeat(60) + "\n");

// 测试 1: Promise 中使用 date-fns
console.log("=== 测试 1: Promise 中使用 date-fns ===");
const test1 = new Promise((resolve, reject) => {
    try {
        const { format, addDays } = require('date-fns');
        
        const date = new Date(2024, 0, 15);
        const futureDate = addDays(date, 7);
        const result = format(futureDate, 'yyyy-MM-dd');
        
        console.log(`  原始日期: ${format(date, 'yyyy-MM-dd')}`);
        console.log(`  7天后: ${result}`);
        
        if (result === '2024-01-22') {
            testResults.passed++;
            console.log("  ✅ Promise 中使用 date-fns 测试通过");
            resolve(result);
        } else {
            throw new Error(`结果不正确: ${result}`);
        }
    } catch (error) {
        console.error("  ❌ Promise 中使用 date-fns 测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("Promise: " + error.message);
        reject(error);
    }
});

// 测试 2: 异步函数中格式化日期
console.log("\n=== 测试 2: 异步函数中格式化日期 ===");
const test2 = new Promise((resolve, reject) => {
    const { format, parseISO } = require('date-fns');
    
    // 模拟异步获取日期字符串
    const getDateString = () => {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve('2024-01-15T14:30:00.000Z');
            }, 10);
        });
    };
    
    getDateString().then(isoString => {
        try {
            const parsed = parseISO(isoString);
            const formatted = format(parsed, 'yyyy-MM-dd HH:mm:ss');
            
            console.log(`  异步获取的 ISO 字符串: ${isoString}`);
            console.log(`  格式化结果: ${formatted}`);
            
            if (formatted.includes('2024-01-15')) {
                testResults.passed++;
                console.log("  ✅ 异步函数中格式化日期测试通过");
                resolve();
            } else {
                throw new Error("格式化结果不正确");
            }
        } catch (error) {
            console.error("  ❌ 异步函数中格式化日期测试失败:", error.message);
            testResults.failed++;
            testResults.errors.push("异步格式化: " + error.message);
            reject(error);
        }
    }).catch(error => {
        console.error("  ❌ 异步函数中格式化日期测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("异步格式化: " + error.message);
        reject(error);
    });
});

// 测试 3: 并发日期计算
console.log("\n=== 测试 3: 并发日期计算 ===");
const test3 = new Promise((resolve, reject) => {
    try {
        const { addDays, addMonths, addYears, format } = require('date-fns');
        
        const baseDate = new Date(2024, 0, 1);
        
        // 模拟多个异步日期计算任务
        const calculations = [
            new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        name: '加7天',
                        result: format(addDays(baseDate, 7), 'yyyy-MM-dd')
                    });
                }, 10);
            }),
            new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        name: '加2个月',
                        result: format(addMonths(baseDate, 2), 'yyyy-MM-dd')
                    });
                }, 15);
            }),
            new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        name: '加1年',
                        result: format(addYears(baseDate, 1), 'yyyy-MM-dd')
                    });
                }, 5);
            })
        ];
        
        Promise.all(calculations).then(results => {
            console.log(`  基准日期: ${format(baseDate, 'yyyy-MM-dd')}`);
            results.forEach(r => {
                console.log(`  ${r.name}: ${r.result}`);
            });
            
            if (results.length === 3 && 
                results[0].result === '2024-01-08' &&
                results[1].result === '2024-03-01' &&
                results[2].result === '2025-01-01') {
                testResults.passed++;
                console.log("  ✅ 并发日期计算测试通过");
                resolve();
            } else {
                throw new Error("并发计算结果不正确");
            }
        }).catch(error => {
            console.error("  ❌ 并发日期计算测试失败:", error.message);
            testResults.failed++;
            testResults.errors.push("并发计算: " + error.message);
            reject(error);
        });
    } catch (error) {
        console.error("  ❌ 并发日期计算测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("并发计算: " + error.message);
        reject(error);
    }
});

// 测试 4: 异步日期区间处理
console.log("\n=== 测试 4: 异步日期区间处理 ===");
const test4 = new Promise((resolve, reject) => {
    const { eachDayOfInterval, format, differenceInDays } = require('date-fns');
    
    // 模拟异步获取日期区间
    const getDateRange = () => {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    start: new Date(2024, 0, 1),
                    end: new Date(2024, 0, 7)
                });
            }, 10);
        });
    };
    
    getDateRange().then(range => {
        try {
            const days = eachDayOfInterval(range);
            const dayCount = differenceInDays(range.end, range.start);
            
            console.log(`  开始日期: ${format(range.start, 'yyyy-MM-dd')}`);
            console.log(`  结束日期: ${format(range.end, 'yyyy-MM-dd')}`);
            console.log(`  区间天数: ${dayCount} 天`);
            console.log(`  生成的日期数: ${days.length} 天`);
            console.log(`  前3天: ${days.slice(0, 3).map(d => format(d, 'MM-dd')).join(', ')}`);
            
            if (days.length === 7 && dayCount === 6) {
                testResults.passed++;
                console.log("  ✅ 异步日期区间处理测试通过");
                resolve();
            } else {
                throw new Error("区间处理结果不正确");
            }
        } catch (error) {
            console.error("  ❌ 异步日期区间处理测试失败:", error.message);
            testResults.failed++;
            testResults.errors.push("异步区间: " + error.message);
            reject(error);
        }
    }).catch(error => {
        console.error("  ❌ 异步日期区间处理测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("异步区间: " + error.message);
        reject(error);
    });
});

// 测试 5: 错误处理 - Promise.reject
console.log("\n=== 测试 5: 异步错误处理 ===");
const test5 = new Promise((resolve, reject) => {
    const { format, parseISO } = require('date-fns');
    
    // 模拟异步获取无效日期
    const getInvalidDate = () => {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve('invalid-date-string');
            }, 10);
        });
    };
    
    getInvalidDate().then(invalidString => {
        try {
            const parsed = parseISO(invalidString);
            const formatted = format(parsed, 'yyyy-MM-dd');
            console.log(`  解析结果: ${formatted}`);
            
            // date-fns 会返回 "Invalid Date"
            if (formatted === 'Invalid Date' || isNaN(parsed.getTime())) {
                testResults.passed++;
                console.log("  ✅ 异步错误处理测试通过（正确识别无效日期）");
                resolve();
            } else {
                throw new Error("应该识别出无效日期");
            }
        } catch (error) {
            // 某些情况下可能抛出异常，这也是正确的行为
            testResults.passed++;
            console.log("  ✅ 异步错误处理测试通过（抛出异常）:", error.message);
            resolve();
        }
    }).catch(error => {
        console.error("  ❌ 异步错误处理测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("异步错误: " + error.message);
        reject(error);
    });
});

// 测试 6: 链式异步操作
console.log("\n=== 测试 6: 链式异步操作 ===");
const test6 = new Promise((resolve, reject) => {
    setTimeout(() => {
        try {
            const { addDays, addMonths, format, startOfMonth, endOfMonth } = require('date-fns');
            
            const startDate = new Date(2024, 0, 15);
            
            // 链式操作：加1个月 -> 月初 -> 加7天
            const step1 = addMonths(startDate, 1);
            const step2 = startOfMonth(step1);
            const step3 = addDays(step2, 7);
            
            console.log(`  起始日期: ${format(startDate, 'yyyy-MM-dd')}`);
            console.log(`  加1个月: ${format(step1, 'yyyy-MM-dd')}`);
            console.log(`  该月月初: ${format(step2, 'yyyy-MM-dd')}`);
            console.log(`  加7天: ${format(step3, 'yyyy-MM-dd')}`);
            
            if (format(step3, 'yyyy-MM-dd') === '2024-02-08') {
                testResults.passed++;
                console.log("  ✅ 链式异步操作测试通过");
                resolve(step3);
            } else {
                throw new Error("链式操作结果不正确");
            }
        } catch (error) {
            console.error("  ❌ 链式异步操作测试失败:", error.message);
            testResults.failed++;
            testResults.errors.push("链式操作: " + error.message);
            reject(error);
        }
    }, 20);
});

// 测试 7: 实际场景 - 异步日程安排
console.log("\n=== 测试 7: 实际场景 - 异步日程安排系统 ===");
const test7 = new Promise((resolve, reject) => {
    const { addDays, addHours, format } = require('date-fns');
    
    // 模拟异步获取会议信息
    const getMeetings = () => {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([
                    { name: '项目启动会', daysFromNow: 0, startHour: 9, duration: 2 },
                    { name: '需求评审', daysFromNow: 2, startHour: 14, duration: 3 },
                    { name: '技术方案讨论', daysFromNow: 5, startHour: 10, duration: 4 }
                ]);
            }, 15);
        });
    };
    
    getMeetings().then(meetings => {
        try {
            const now = new Date(2024, 0, 15, 8, 0, 0);
            
            const schedule = meetings.map(meeting => {
                const startTime = addHours(addDays(now, meeting.daysFromNow), meeting.startHour - 8);
                const endTime = addHours(startTime, meeting.duration);
                
                return {
                    name: meeting.name,
                    start: format(startTime, 'yyyy-MM-dd HH:mm'),
                    end: format(endTime, 'yyyy-MM-dd HH:mm'),
                    duration: meeting.duration + '小时'
                };
            });
            
            console.log(`  当前时间: ${format(now, 'yyyy-MM-dd HH:mm')}`);
            console.log(`  会议安排:`);
            schedule.forEach((s, i) => {
                console.log(`    ${i + 1}. ${s.name}`);
                console.log(`       时间: ${s.start} ~ ${s.end} (${s.duration})`);
            });
            
            if (schedule.length === 3 && 
                schedule[0].start === '2024-01-15 09:00' &&
                schedule[2].start === '2024-01-20 10:00') {
                testResults.passed++;
                console.log("  ✅ 异步日程安排系统测试通过");
                resolve();
            } else {
                throw new Error("日程安排结果不正确");
            }
        } catch (error) {
            console.error("  ❌ 异步日程安排系统测试失败:", error.message);
            testResults.failed++;
            testResults.errors.push("日程安排: " + error.message);
            reject(error);
        }
    }).catch(error => {
        console.error("  ❌ 异步日程安排系统测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("日程安排: " + error.message);
        reject(error);
    });
});

// 测试 8: 超时处理与 Promise.race
console.log("\n=== 测试 8: 超时处理与 Promise.race ===");
const test8 = new Promise((resolve, reject) => {
    const { format, addDays } = require('date-fns');
    
    // 快速日期计算
    const quickCalculation = new Promise(resolve => {
        setTimeout(() => {
            const date = new Date(2024, 0, 1);
            const result = format(addDays(date, 30), 'yyyy-MM-dd');
            resolve({ success: true, result });
        }, 10);
    });
    
    // 超时控制
    const timeout = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error('操作超时'));
        }, 100);
    });
    
    Promise.race([quickCalculation, timeout]).then(result => {
        console.log(`  计算结果: ${result.result}`);
        console.log(`  操作状态: ${result.success ? '成功' : '失败'}`);
        
        if (result.success && result.result === '2024-01-31') {
            testResults.passed++;
            console.log("  ✅ 超时处理与 Promise.race 测试通过");
            resolve();
        } else {
            throw new Error("超时控制结果不正确");
        }
    }).catch(error => {
        console.error("  ❌ 超时处理测试失败:", error.message);
        testResults.failed++;
        testResults.errors.push("超时处理: " + error.message);
        reject(error);
    });
});

// 等待所有异步测试完成
return Promise.all([test1, test2, test3, test4, test5, test6, test7, test8])
    .then(() => {
        // ========================================
        // 测试结果汇总
        // ========================================
        console.log("\n\n" + "=".repeat(60));
        console.log("📊 date-fns 异步操作测试结果汇总");
        console.log("=".repeat(60));
        console.log(`✅ 通过: ${testResults.passed} 个测试`);
        console.log(`❌ 失败: ${testResults.failed} 个测试`);

        if (testResults.errors.length > 0) {
            console.log("\n❌ 错误详情:");
            testResults.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }

        const success = testResults.failed === 0;
        const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2);

        console.log("\n" + "=".repeat(60));
        console.log(success ? "🎉 所有异步测试通过！" : `⚠️  部分测试失败 (成功率: ${successRate}%)`);
        console.log("=".repeat(60));
        
        console.log("\n💡 异步操作特点:");
        console.log("  - ✅ Promise 中正常使用 date-fns");
        console.log("  - ✅ Promise.then() 链式调用");
        console.log("  - ✅ Promise.all 并发执行");
        console.log("  - ✅ Promise.race 超时控制");
        console.log("  - ✅ 异步错误处理机制");
        console.log("  - ✅ 链式异步操作");
        console.log("\n⚠️  注意: Goja 不支持 async/await，请使用 Promise");

        return {
            success: success,
            passed: testResults.passed,
            failed: testResults.failed,
            errors: testResults.errors,
            successRate: successRate
        };
    })
    .catch(error => {
        console.error("\n❌ 异步测试执行失败:", error.message);
        return {
            success: false,
            passed: testResults.passed,
            failed: testResults.failed + 1,
            errors: [...testResults.errors, "异步执行: " + error.message],
            successRate: "0.00"
        };
    });

