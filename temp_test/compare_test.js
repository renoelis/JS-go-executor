#!/usr/bin/env node
/**
 * date-fns vs dayjs 功能对比测试
 */

const fs = require('fs');
const vm = require('vm');

// 读取库文件
const dateFnsCode = fs.readFileSync('../assets/external-libs/date-fns.min.js', 'utf8');
const dayjsCode = fs.readFileSync('./dayjs.min.js', 'utf8');

console.log('='.repeat(80));
console.log('date-fns vs dayjs 功能对比测试');
console.log('='.repeat(80));
console.log();

// ============================================================================
// 1. 文件大小对比
// ============================================================================
console.log('📦 文件大小对比:');
console.log('-'.repeat(80));
const dateFnsSize = Buffer.byteLength(dateFnsCode, 'utf8');
const dayjsSize = Buffer.byteLength(dayjsCode, 'utf8');
console.log(`date-fns:  ${(dateFnsSize / 1024).toFixed(2)} KB`);
console.log(`dayjs:     ${(dayjsSize / 1024).toFixed(2)} KB`);
console.log(`减少:      ${((1 - dayjsSize / dateFnsSize) * 100).toFixed(1)}%`);
console.log();

// ============================================================================
// 2. 加载性能测试
// ============================================================================
console.log('⚡ 加载性能测试:');
console.log('-'.repeat(80));

// 测试 date-fns 加载时间
const dateFnsLoadStart = process.hrtime.bigint();
const dateFnsContext = vm.createContext({
  module: { exports: {} },
  exports: {}
});
vm.runInContext(dateFnsCode, dateFnsContext);
const dateFnsLoadEnd = process.hrtime.bigint();
const dateFnsLoadTime = Number(dateFnsLoadEnd - dateFnsLoadStart) / 1000000;
const dateFns = dateFnsContext.module.exports;

// 测试 dayjs 加载时间
const dayjsLoadStart = process.hrtime.bigint();
const dayjsContext = vm.createContext({
  module: { exports: {} },
  exports: {}
});
vm.runInContext(dayjsCode, dayjsContext);
const dayjsLoadEnd = process.hrtime.bigint();
const dayjsLoadTime = Number(dayjsLoadEnd - dayjsLoadStart) / 1000000;
const dayjs = dayjsContext.module.exports;

console.log(`date-fns 加载时间: ${dateFnsLoadTime.toFixed(2)} ms`);
console.log(`dayjs 加载时间:    ${dayjsLoadTime.toFixed(2)} ms`);
console.log(`快了:             ${((dateFnsLoadTime / dayjsLoadTime - 1) * 100).toFixed(1)}%`);
console.log();

// ============================================================================
// 3. 功能对比测试
// ============================================================================
console.log('✅ 功能对比测试:');
console.log('-'.repeat(80));

const testDate1 = new Date('2024-01-15T10:30:00');
const testDate2 = new Date('2024-06-20T15:45:00');

const tests = [
  {
    name: '格式化日期',
    dateFns: () => dateFns.format(testDate1, 'yyyy-MM-dd HH:mm:ss'),
    dayjs: () => dayjs(testDate1).format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    name: '加 7 天',
    dateFns: () => dateFns.format(dateFns.addDays(testDate1, 7), 'yyyy-MM-dd'),
    dayjs: () => dayjs(testDate1).add(7, 'day').format('YYYY-MM-DD'),
  },
  {
    name: '减 3 个月',
    dateFns: () => dateFns.format(dateFns.subMonths(testDate1, 3), 'yyyy-MM-dd'),
    dayjs: () => dayjs(testDate1).subtract(3, 'month').format('YYYY-MM-DD'),
  },
  {
    name: '计算天数差',
    dateFns: () => dateFns.differenceInDays(testDate2, testDate1),
    dayjs: () => dayjs(testDate2).diff(testDate1, 'day'),
  },
  {
    name: '月初时间',
    dateFns: () => dateFns.format(dateFns.startOfMonth(testDate1), 'yyyy-MM-dd'),
    dayjs: () => dayjs(testDate1).startOf('month').format('YYYY-MM-DD'),
  },
  {
    name: '月末时间',
    dateFns: () => dateFns.format(dateFns.endOfMonth(testDate1), 'yyyy-MM-dd'),
    dayjs: () => dayjs(testDate1).endOf('month').format('YYYY-MM-DD'),
  },
  {
    name: '日期比较 (isAfter)',
    dateFns: () => dateFns.isAfter(testDate2, testDate1),
    dayjs: () => dayjs(testDate2).isAfter(testDate1),
  },
  {
    name: '日期比较 (isBefore)',
    dateFns: () => dateFns.isBefore(testDate1, testDate2),
    dayjs: () => dayjs(testDate1).isBefore(testDate2),
  },
  {
    name: '是否同一天',
    dateFns: () => dateFns.isSameDay(testDate1, testDate1),
    dayjs: () => dayjs(testDate1).isSame(testDate1, 'day'),
  },
];

tests.forEach(test => {
  const dateFnsResult = test.dateFns();
  const dayjsResult = test.dayjs();
  const match = String(dateFnsResult) === String(dayjsResult) ? '✅' : '❌';
  console.log(`${match} ${test.name}:`);
  console.log(`   date-fns: ${dateFnsResult}`);
  console.log(`   dayjs:    ${dayjsResult}`);
});

console.log();

// ============================================================================
// 4. 性能基准测试
// ============================================================================
console.log('🚀 性能基准测试 (10000 次操作):');
console.log('-'.repeat(80));

function benchmark(name, dateFnsFn, dayjsFn) {
  const iterations = 10000;
  
  // date-fns
  const dateFnsStart = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    dateFnsFn();
  }
  const dateFnsEnd = process.hrtime.bigint();
  const dateFnsTime = Number(dateFnsEnd - dateFnsStart) / 1000000;
  
  // dayjs
  const dayjsStart = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    dayjsFn();
  }
  const dayjsEnd = process.hrtime.bigint();
  const dayjsTime = Number(dayjsEnd - dayjsStart) / 1000000;
  
  const faster = dayjsTime < dateFnsTime ? 'dayjs' : 'date-fns';
  const speedup = dayjsTime < dateFnsTime 
    ? ((dateFnsTime / dayjsTime - 1) * 100).toFixed(1)
    : ((dayjsTime / dateFnsTime - 1) * 100).toFixed(1);
  
  console.log(`${name}:`);
  console.log(`  date-fns: ${dateFnsTime.toFixed(2)} ms`);
  console.log(`  dayjs:    ${dayjsTime.toFixed(2)} ms`);
  console.log(`  快者:     ${faster} (快 ${speedup}%)`);
  console.log();
}

benchmark(
  '格式化日期',
  () => dateFns.format(testDate1, 'yyyy-MM-dd HH:mm:ss'),
  () => dayjs(testDate1).format('YYYY-MM-DD HH:mm:ss')
);

benchmark(
  '日期加减',
  () => dateFns.addDays(dateFns.subMonths(testDate1, 3), 7),
  () => dayjs(testDate1).subtract(3, 'month').add(7, 'day')
);

benchmark(
  '日期差异计算',
  () => dateFns.differenceInDays(testDate2, testDate1),
  () => dayjs(testDate2).diff(testDate1, 'day')
);

benchmark(
  '起始/结束时间',
  () => {
    dateFns.startOfMonth(testDate1);
    dateFns.endOfMonth(testDate1);
  },
  () => {
    dayjs(testDate1).startOf('month');
    dayjs(testDate1).endOf('month');
  }
);

// ============================================================================
// 5. API 可用性对比
// ============================================================================
console.log('📋 API 可用性对比:');
console.log('-'.repeat(80));

const apiTests = [
  { name: 'format', dateFns: !!dateFns.format, dayjs: !!dayjs().format },
  { name: 'add/subtract', dateFns: !!(dateFns.addDays && dateFns.subDays), dayjs: !!(dayjs().add && dayjs().subtract) },
  { name: 'diff', dateFns: !!dateFns.differenceInDays, dayjs: !!dayjs().diff },
  { name: 'startOf/endOf', dateFns: !!(dateFns.startOfMonth && dateFns.endOfMonth), dayjs: !!(dayjs().startOf && dayjs().endOf) },
  { name: 'isBefore/isAfter', dateFns: !!(dateFns.isBefore && dateFns.isAfter), dayjs: !!(dayjs().isBefore && dayjs().isAfter) },
  { name: 'isSame', dateFns: !!dateFns.isSameDay, dayjs: !!dayjs().isSame },
  { name: 'isToday', dateFns: !!dateFns.isToday, dayjs: false }, // dayjs 需要插件
  { name: 'isWeekend', dateFns: !!dateFns.isWeekend, dayjs: false }, // dayjs 需手动实现
];

apiTests.forEach(test => {
  const dateFnsStatus = test.dateFns ? '✅' : '❌';
  const dayjsStatus = test.dayjs ? '✅' : '⚠️ 需插件';
  console.log(`${test.name.padEnd(20)} date-fns: ${dateFnsStatus}  dayjs: ${dayjsStatus}`);
});

console.log();
console.log('='.repeat(80));
console.log('总结:');
console.log('-'.repeat(80));
console.log(`✅ 文件大小: dayjs 比 date-fns 小 ${((1 - dayjsSize / dateFnsSize) * 100).toFixed(1)}%`);
console.log(`⚡ 加载速度: dayjs 比 date-fns 快 ${((dateFnsLoadTime / dayjsLoadTime - 1) * 100).toFixed(1)}%`);
console.log(`📦 功能覆盖: dayjs 覆盖常用功能，少数需要插件`);
console.log(`🚀 执行性能: 各有优势，总体相近`);
console.log('='.repeat(80));


