# date-fns 快速开始指南

## 🚀 1分钟上手

### 导入模块

```javascript
const { format, addDays, differenceInDays } = require('date-fns');
```

---

## 📝 常用场景示例

### 1️⃣ 格式化日期

```javascript
const { format } = require('date-fns');

const now = new Date();

// 标准格式
format(now, 'yyyy-MM-dd');              // "2024-01-15"
format(now, 'yyyy-MM-dd HH:mm:ss');     // "2024-01-15 14:30:45"

// 友好格式
format(now, 'MMMM do, yyyy');           // "January 15th, 2024"
format(now, 'EEEE, MMMM do');           // "Monday, January 15th"

// 自定义格式
format(now, 'yyyy年MM月dd日');          // "2024年01月15日"
```

### 2️⃣ 日期加减

```javascript
const { addDays, addMonths, addYears, subDays } = require('date-fns');

const today = new Date(2024, 0, 15);

addDays(today, 7);        // 2024-01-22 (7天后)
addMonths(today, 2);      // 2024-03-15 (2个月后)
addYears(today, 1);       // 2025-01-15 (1年后)
subDays(today, 3);        // 2024-01-12 (3天前)
```

### 3️⃣ 日期差值

```javascript
const { differenceInDays, differenceInHours, differenceInMinutes } = require('date-fns');

const start = new Date(2024, 0, 1);
const end = new Date(2024, 0, 15);

differenceInDays(end, start);      // 14 (天)
differenceInHours(end, start);     // 336 (小时)
differenceInMinutes(end, start);   // 20160 (分钟)
```

### 4️⃣ 日期比较

```javascript
const { isAfter, isBefore, isSameDay, isToday } = require('date-fns');

const date1 = new Date(2024, 0, 15);
const date2 = new Date(2024, 0, 20);

isAfter(date2, date1);        // true
isBefore(date1, date2);       // true
isSameDay(date1, date1);      // true
isToday(new Date());          // true
```

### 5️⃣ 月份边界

```javascript
const { startOfMonth, endOfMonth, startOfYear, endOfYear } = require('date-fns');

const date = new Date(2024, 0, 15);  // 2024-01-15

startOfMonth(date);   // 2024-01-01 00:00:00
endOfMonth(date);     // 2024-01-31 23:59:59
startOfYear(date);    // 2024-01-01 00:00:00
endOfYear(date);      // 2024-12-31 23:59:59
```

### 6️⃣ 日期区间

```javascript
const { eachDayOfInterval, format } = require('date-fns');

const interval = {
    start: new Date(2024, 0, 1),
    end: new Date(2024, 0, 7)
};

const days = eachDayOfInterval(interval);
// [2024-01-01, 2024-01-02, ..., 2024-01-07]

days.forEach(day => {
    console.log(format(day, 'yyyy-MM-dd'));
});
```

### 7️⃣ ISO 日期处理

```javascript
const { parseISO, formatISO, format } = require('date-fns');

// 解析 ISO 字符串
const date = parseISO('2024-01-15T14:30:00.000Z');

// 转为 ISO 字符串
const iso = formatISO(date);  // "2024-01-15T14:30:00+08:00"

// 自定义格式
format(date, 'yyyy-MM-dd HH:mm:ss');
```

---

## ⚡ 异步场景

### Promise 中使用

```javascript
const { format, addDays } = require('date-fns');

// ✅ 正确写法
new Promise((resolve) => {
    setTimeout(() => {
        const date = new Date();
        const futureDate = addDays(date, 7);
        resolve(format(futureDate, 'yyyy-MM-dd'));
    }, 100);
}).then(result => {
    console.log(result);
});

// ❌ 错误写法 (Goja 不支持 async/await)
async function getDate() {
    const date = await fetchDate();
    return format(date, 'yyyy-MM-dd');
}
```

### Promise.all 并发

```javascript
const { format, addDays, addMonths, addYears } = require('date-fns');

const baseDate = new Date(2024, 0, 1);

Promise.all([
    Promise.resolve(addDays(baseDate, 7)),
    Promise.resolve(addMonths(baseDate, 2)),
    Promise.resolve(addYears(baseDate, 1))
]).then(dates => {
    dates.forEach(d => {
        console.log(format(d, 'yyyy-MM-dd'));
    });
});
// 输出:
// 2024-01-08
// 2024-03-01
// 2025-01-01
```

---

## 🎯 实际应用案例

### 案例 1: 计算项目里程碑

```javascript
const { addWeeks, addDays, format, differenceInDays } = require('date-fns');

const projectStart = new Date(2024, 0, 1);

const milestones = {
    design: addWeeks(projectStart, 2),
    development: addWeeks(projectStart, 8),
    testing: addWeeks(projectStart, 12),
    launch: addWeeks(projectStart, 14)
};

console.log(`项目开始: ${format(projectStart, 'yyyy-MM-dd')}`);
console.log(`设计完成: ${format(milestones.design, 'yyyy-MM-dd')}`);
console.log(`开发完成: ${format(milestones.development, 'yyyy-MM-dd')}`);
console.log(`测试完成: ${format(milestones.testing, 'yyyy-MM-dd')}`);
console.log(`产品发布: ${format(milestones.launch, 'yyyy-MM-dd')}`);
console.log(`总周期: ${differenceInDays(milestones.launch, projectStart)} 天`);
```

### 案例 2: 生成月度报告日期

```javascript
const { startOfMonth, endOfMonth, format } = require('date-fns');

const generateMonthlyReport = (year, month) => {
    const date = new Date(year, month - 1, 1);
    
    return {
        reportMonth: format(date, 'yyyy年MM月'),
        periodStart: format(startOfMonth(date), 'yyyy-MM-dd'),
        periodEnd: format(endOfMonth(date), 'yyyy-MM-dd')
    };
};

const report = generateMonthlyReport(2024, 1);
console.log(report);
// {
//   reportMonth: "2024年01月",
//   periodStart: "2024-01-01",
//   periodEnd: "2024-01-31"
// }
```

### 案例 3: 判断工作日

```javascript
const { isWeekend, addDays, format } = require('date-fns');

const findNextWorkday = (date) => {
    let nextDay = addDays(date, 1);
    while (isWeekend(nextDay)) {
        nextDay = addDays(nextDay, 1);
    }
    return nextDay;
};

const today = new Date(2024, 0, 19);  // 2024-01-19 (周五)
const nextWorkday = findNextWorkday(today);

console.log(`今天: ${format(today, 'yyyy-MM-dd (EEEE)')}`);
console.log(`下个工作日: ${format(nextWorkday, 'yyyy-MM-dd (EEEE)')}`);
// 输出:
// 今天: 2024-01-19 (Friday)
// 下个工作日: 2024-01-22 (Monday)
```

---

## ⚠️ 常见问题

### Q1: 为什么不能使用 async/await？

**A**: Goja 引擎暂不支持 async/await 语法。

✅ **解决方案**: 使用 Promise + .then()

```javascript
// ❌ 不支持
async function test() {
    const result = await something();
    return result;
}

// ✅ 请使用
function test() {
    return something().then(result => {
        return result;
    });
}
```

### Q2: 月份索引为什么从 0 开始？

**A**: date-fns 使用原生 JavaScript Date 对象。

```javascript
new Date(2024, 0, 15);   // 1月 (0代表1月)
new Date(2024, 11, 31);  // 12月 (11代表12月)
```

### Q3: 如何处理时区？

**A**: date-fns 默认使用本地时区。

```javascript
const { parseISO, formatISO } = require('date-fns');

// 解析 UTC 时间
const utcDate = parseISO('2024-01-15T14:30:00.000Z');

// 转为 ISO 字符串（带时区）
const iso = formatISO(utcDate);
```

---

## 📞 技术支持

### 遇到问题？

1. 查看测试文件示例: `test/date-fns/*.js`
2. 阅读完整文档: `DATE_FNS_COMPLETE_GUIDE.md`
3. 查看 date-fns 官方文档: https://date-fns.org/

---

## 🎯 下一步

- 📖 学习更多函数: https://date-fns.org/docs/
- 🧪 运行测试套件: `bash test/date-fns/run-all-tests.sh`
- 🔍 查看实际案例: `test/date-fns/date-fns-async-test.js`

---

**开始使用 date-fns，让日期处理变得简单！** 🚀

