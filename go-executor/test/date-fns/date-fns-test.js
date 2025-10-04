// date-fns 模块功能测试
// 测试 date-fns 库的导入和常用功能

const testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

console.log("🚀 开始 date-fns 模块功能测试\n");
console.log("=" + "=".repeat(60) + "\n");

// 测试 1: 导入 date-fns 模块
console.log("=== 测试 1: 导入 date-fns 模块 ===");
try {
    const dateFns = require('date-fns');
    console.log("  ✅ date-fns 模块导入成功");
    console.log(`  date-fns 导出对象类型: ${typeof dateFns}`);
    console.log(`  date-fns 导出键数量: ${Object.keys(dateFns).length}`);
    console.log(`  前10个导出函数: ${Object.keys(dateFns).slice(0, 10).join(', ')}`);
    
    testResults.passed++;
} catch (error) {
    console.error("  ❌ date-fns 模块导入失败:", error.message);
    testResults.failed++;
    testResults.errors.push("date-fns 导入: " + error.message);
}

// 测试 2: format 函数 - 格式化日期
console.log("\n=== 测试 2: format 函数 ===");
try {
    const { format } = require('date-fns');
    
    const date = new Date(2024, 0, 15, 14, 30, 0); // 2024-01-15 14:30:00
    
    const formatted1 = format(date, 'yyyy-MM-dd');
    const formatted2 = format(date, 'yyyy-MM-dd HH:mm:ss');
    const formatted3 = format(date, 'MMMM do, yyyy');
    
    console.log(`  格式化 1 (yyyy-MM-dd): ${formatted1}`);
    console.log(`  格式化 2 (yyyy-MM-dd HH:mm:ss): ${formatted2}`);
    console.log(`  格式化 3 (MMMM do, yyyy): ${formatted3}`);
    
    if (formatted1 === '2024-01-15' && formatted2.includes('2024-01-15')) {
        testResults.passed++;
        console.log("  ✅ format 函数测试通过");
    } else {
        throw new Error("format 结果不正确");
    }
} catch (error) {
    console.error("  ❌ format 函数测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("format: " + error.message);
}

// 测试 3: addDays 函数 - 日期计算
console.log("\n=== 测试 3: addDays 函数 ===");
try {
    const { addDays, format } = require('date-fns');
    
    const date = new Date(2024, 0, 1); // 2024-01-01
    const futureDate = addDays(date, 10);
    
    console.log(`  原始日期: ${format(date, 'yyyy-MM-dd')}`);
    console.log(`  加 10 天: ${format(futureDate, 'yyyy-MM-dd')}`);
    
    if (format(futureDate, 'yyyy-MM-dd') === '2024-01-11') {
        testResults.passed++;
        console.log("  ✅ addDays 函数测试通过");
    } else {
        throw new Error("addDays 结果不正确");
    }
} catch (error) {
    console.error("  ❌ addDays 函数测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("addDays: " + error.message);
}

// 测试 4: differenceInDays 函数 - 日期差值
console.log("\n=== 测试 4: differenceInDays 函数 ===");
try {
    const { differenceInDays } = require('date-fns');
    
    const date1 = new Date(2024, 0, 1);
    const date2 = new Date(2024, 0, 11);
    
    const diff = differenceInDays(date2, date1);
    
    console.log(`  日期 1: 2024-01-01`);
    console.log(`  日期 2: 2024-01-11`);
    console.log(`  差值: ${diff} 天`);
    
    if (diff === 10) {
        testResults.passed++;
        console.log("  ✅ differenceInDays 函数测试通过");
    } else {
        throw new Error(`differenceInDays 结果不正确: 期望 10，实际 ${diff}`);
    }
} catch (error) {
    console.error("  ❌ differenceInDays 函数测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("differenceInDays: " + error.message);
}

// 测试 5: isAfter, isBefore 函数 - 日期比较
console.log("\n=== 测试 5: isAfter, isBefore 函数 ===");
try {
    const { isAfter, isBefore, isSameDay } = require('date-fns');
    
    const date1 = new Date(2024, 0, 1);
    const date2 = new Date(2024, 0, 15);
    const date3 = new Date(2024, 0, 1);
    
    console.log(`  date2 is after date1: ${isAfter(date2, date1)}`);
    console.log(`  date1 is before date2: ${isBefore(date1, date2)}`);
    console.log(`  date1 is same day as date3: ${isSameDay(date1, date3)}`);
    
    if (isAfter(date2, date1) && isBefore(date1, date2) && isSameDay(date1, date3)) {
        testResults.passed++;
        console.log("  ✅ 日期比较函数测试通过");
    } else {
        throw new Error("日期比较结果不正确");
    }
} catch (error) {
    console.error("  ❌ 日期比较函数测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("日期比较: " + error.message);
}

// 测试 6: startOfMonth, endOfMonth 函数
console.log("\n=== 测试 6: startOfMonth, endOfMonth 函数 ===");
try {
    const { startOfMonth, endOfMonth, format } = require('date-fns');
    
    const date = new Date(2024, 0, 15); // 2024-01-15
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    console.log(`  原始日期: ${format(date, 'yyyy-MM-dd')}`);
    console.log(`  月初: ${format(monthStart, 'yyyy-MM-dd')}`);
    console.log(`  月末: ${format(monthEnd, 'yyyy-MM-dd')}`);
    
    if (format(monthStart, 'yyyy-MM-dd') === '2024-01-01' &&
        format(monthEnd, 'yyyy-MM-dd') === '2024-01-31') {
        testResults.passed++;
        console.log("  ✅ 月份边界函数测试通过");
    } else {
        throw new Error("月份边界结果不正确");
    }
} catch (error) {
    console.error("  ❌ 月份边界函数测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("月份边界: " + error.message);
}

// 测试 7: parseISO 函数 - 解析 ISO 日期字符串
console.log("\n=== 测试 7: parseISO 函数 ===");
try {
    const { parseISO, format } = require('date-fns');
    
    const isoString = '2024-01-15T14:30:00.000Z';
    const parsed = parseISO(isoString);
    
    console.log(`  ISO 字符串: ${isoString}`);
    console.log(`  解析结果: ${format(parsed, 'yyyy-MM-dd HH:mm:ss')}`);
    console.log(`  是否为有效日期: ${parsed instanceof Date && !isNaN(parsed.getTime())}`);
    
    if (parsed instanceof Date && !isNaN(parsed.getTime())) {
        testResults.passed++;
        console.log("  ✅ parseISO 函数测试通过");
    } else {
        throw new Error("parseISO 结果不正确");
    }
} catch (error) {
    console.error("  ❌ parseISO 函数测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("parseISO: " + error.message);
}

// 测试 8: 实际应用场景 - 计算截止日期
console.log("\n=== 测试 8: 实际应用场景 - 计算项目截止日期 ===");
try {
    const { addDays, addWeeks, format, differenceInDays } = require('date-fns');
    
    const projectStart = new Date(2024, 0, 1);
    const phase1End = addWeeks(projectStart, 2); // 2周
    const phase2End = addWeeks(phase1End, 3);    // 再3周
    const finalDeadline = addDays(phase2End, 5); // 再5天
    
    console.log(`  项目开始: ${format(projectStart, 'yyyy-MM-dd')}`);
    console.log(`  阶段1结束: ${format(phase1End, 'yyyy-MM-dd')}`);
    console.log(`  阶段2结束: ${format(phase2End, 'yyyy-MM-dd')}`);
    console.log(`  最终截止日期: ${format(finalDeadline, 'yyyy-MM-dd')}`);
    console.log(`  项目总天数: ${differenceInDays(finalDeadline, projectStart)} 天`);
    
    const totalDays = differenceInDays(finalDeadline, finalDeadline);
    if (differenceInDays(finalDeadline, projectStart) > 0) {
        testResults.passed++;
        console.log("  ✅ 实际应用场景测试通过");
    } else {
        throw new Error("日期计算结果不正确");
    }
} catch (error) {
    console.error("  ❌ 实际应用场景测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("实际应用: " + error.message);
}

// ========================================
// 测试结果汇总
// ========================================
console.log("\n\n" + "=".repeat(60));
console.log("📊 date-fns 测试结果汇总");
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
console.log(success ? "🎉 所有 date-fns 测试通过！" : `⚠️  部分测试失败 (成功率: ${successRate}%)`);
console.log("=".repeat(60));

return {
    success: success,
    passed: testResults.passed,
    failed: testResults.failed,
    errors: testResults.errors,
    successRate: successRate
};

