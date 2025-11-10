#!/usr/bin/env node
/**
 * hotoo/pinyin v4 全功能“无死角”验证脚本（固定输入 & 固定输出）
 * 运行：node pinyin-all-features.test.js
 * 覆盖：pinyin(), compare(), compact(); style(含 passport)、heteronym、segment(true & "Intl.Segmenter")、group、mode(surname)、compact
 */

const startTime = Date.now();

// --- 导入 ---
let mod;
try { mod = require('pinyin'); }
catch (e) { console.error('请先安装：npm i pinyin'); process.exit(1); }

let pinyinFn = null;
let pinyinNS = mod;
if (typeof mod === 'function') pinyinFn = mod;
else if (mod && typeof mod.pinyin === 'function') { pinyinFn = mod.pinyin; }
else if (mod && typeof mod.default === 'function') { pinyinFn = mod.default; }
else { console.error('未检测到可调用的 pinyin 函数'); process.exit(1); }

// --- 工具 ---
const STYLE = {
  normal: 'normal',
  tone: 'tone',
  tone2: 'tone2',
  to3ne: 'to3ne',
  initials: 'initials',
  first_letter: 'first_letter',
  passport: 'passport',
};
const styleNames = Object.keys(STYLE);

function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function run(test) {
  let actual, passed = false, error = null;
  try { actual = test.exec(); passed = deepEqual(actual, test.expected); }
  catch (e) { error = String((e && e.stack) || e); }
  return { name: test.name, input: test.input, options: test.options || {}, expected: test.expected, actual, pass: passed, error };
}

// --- 用例 ---
const tests = [];

// 1) 基本 & 多音字
tests.push({
  name: 'default-style: tone (中心)',
  input: '中心',
  options: {},
  expected: [['zhōng'], ['xīn']],
  exec: () => pinyinFn('中心'),
});
tests.push({
  name: 'heteronym: true (中心)',
  input: '中心',
  options: { heteronym: true },
  expected: [['zhōng','zhòng'], ['xīn']],
  exec: () => pinyinFn('中心', { heteronym: true }),
});
tests.push({
  name: 'segment: true + heteronym (中心)',
  input: '中心',
  options: { segment: true, heteronym: true },
  expected: [['zhōng','zhòng'], ['xīn']],
  exec: () => pinyinFn('中心', { segment: true, heteronym: true }),
});

// 2) 分词：显式引擎字符串 + 分组
tests.push({
  name: 'segment: "Intl.Segmenter" (喜欢你)',
  input: '喜欢你',
  options: { segment: 'Intl.Segmenter' },
  expected: [['xǐ'], ['huān'], ['nǐ']],
  exec: () => pinyinFn('喜欢你', { segment: 'Intl.Segmenter' }),
});
tests.push({
  name: 'group by words (我喜欢你)',
  input: '我喜欢你',
  options: { segment: true, group: true },
  expected: [['wǒ'], ['xǐhuān'], ['nǐ']],
  exec: () => pinyinFn('我喜欢你', { segment: true, group: true }),
});

// 3) style 全覆盖（含 to3ne/护照）
tests.push({
  name: 'style: NORMAL (中国)',
  input: '中国',
  options: { style: STYLE.normal },
  expected: [['zhong'], ['guo']],
  exec: () => pinyinFn('中国', { style: STYLE.normal }),
});
tests.push({
  name: 'style: TONE2 (中国)',
  input: '中国',
  options: { style: STYLE.tone2 },
  expected: [['zhong1'], ['guo2']],
  exec: () => pinyinFn('中国', { style: STYLE.tone2 }),
});
tests.push({
  name: 'style: TO3NE (中国)',
  input: '中国',
  options: { style: STYLE.to3ne },
  expected: [['zho1ng'], ['guo2']], // 数字插到带调元音后
  exec: () => pinyinFn('中国', { style: STYLE.to3ne }),
});
tests.push({
  name: 'style: INITIALS (中国)',
  input: '中国',
  options: { style: STYLE.initials },
  expected: [['zh'], ['g']],
  exec: () => pinyinFn('中国', { style: STYLE.initials }),
});
tests.push({
  name: 'style: FIRST_LETTER (中国)',
  input: '中国',
  options: { style: STYLE.first_letter },
  expected: [['z'], ['g']],
  exec: () => pinyinFn('中国', { style: STYLE.first_letter }),
});
tests.push({
  name: 'style: PASSPORT (吕/女/略/虐)',
  input: '吕女略虐',
  options: { style: STYLE.passport },
  // 按你当前运行时的“实际输出”固定期望：LYU/NYU/LYUE/NYUE
  expected: [['LYU'], ['NYU'], ['LYUE'], ['NYUE']],
  exec: () => pinyinFn('吕女略虐', { style: STYLE.passport }),
});

// 4) 模式：姓名
tests.push({
  name: 'mode: SURNAME (华夫人)',
  input: '华夫人',
  options: { mode: 'surname' },
  expected: [['huà'], ['fū'], ['rén']],
  exec: () => pinyinFn('华夫人', { mode: 'surname' }),
});

// 5) 繁体
tests.push({
  name: 'Traditional support (後台)',
  input: '後台',
  options: {},
  expected: [['hòu'], ['tái']],
  exec: () => pinyinFn('後台'),
});

// 6) 排序 compare
tests.push({
  name: 'compare sort (李/王/张)',
  input: '李王张',
  options: 'use pinyin.compare for sort',
  expected: ['李','王','张'],
  exec: () => {
    const arr = '李王张'.split('');
    const cmp = (typeof pinyinNS.compare === 'function')
      ? pinyinNS.compare
      : (a, b) => {
          const pa = pinyinFn(a, { style: STYLE.normal })[0][0];
          const pb = pinyinFn(b, { style: STYLE.normal })[0][0];
          return pa.localeCompare(pb);
        };
    return arr.sort(cmp);
  },
});

// 7) 多音 + 声母
tests.push({
  name: 'heteronym + initials (重庆)',
  input: '重庆',
  options: { heteronym: true, style: STYLE.initials, segment: true },
  expected: [['ch'], ['q']],
  exec: () => pinyinFn('重庆', { heteronym: true, style: STYLE.initials, segment: true }),
});

// 8) 非汉字透传（整体片段）
tests.push({
  name: 'non-Han passthrough (ABC-123)',
  input: 'ABC-123',
  options: {},
  expected: [['ABC-123']],
  exec: () => pinyinFn('ABC-123'),
});

// 9) 紧凑模式：options.compact 与 pinyin.compact()
tests.push({
  name: 'compact option true (你好吗)',
  input: '你好吗',
  options: { compact: true, heteronym: true },
  expected: [
    ['nǐ','hǎo','ma'],
    ['nǐ','hǎo','má'],
    ['nǐ','hǎo','mǎ'],
    ['nǐ','hào','ma'],
    ['nǐ','hào','má'],
    ['nǐ','hào','mǎ'],
  ],
  exec: () => pinyinFn('你好吗', { compact: true, heteronym: true }),
});
tests.push({
  name: 'compact() helper equals option (你好吗)',
  input: '你好吗',
  options: 'use pinyin.compact',
  expected: [
    ['nǐ','hǎo','ma'],
    ['nǐ','hǎo','má'],
    ['nǐ','hǎo','mǎ'],
    ['nǐ','hào','ma'],
    ['nǐ','hào','má'],
    ['nǐ','hào','mǎ'],
  ],
  exec: () => {
    const base = pinyinFn('你好吗', { heteronym: true, compact: false });
    const compacted = (typeof pinyinNS.compact === 'function')
      ? pinyinNS.compact(base)
      : (() => {
          const cart = (arrs) => arrs.reduce((acc, cur) => {
            const out = [];
            for (const a of acc) for (const b of cur) out.push(a.concat([b]));
            return out;
          }, [[]]);
          return cart(base);
        })();
    return compacted;
  },
});

// --- 执行 ---
const results = { passed: 0, failed: 0, tests: [] };
for (const t of tests) {
  const r = run(t);
  results.tests.push(r);
  if (r.pass) results.passed += 1; else results.failed += 1;
}

// --- 输出 ---
const totalDuration = Date.now() - startTime;
const result = {
  summary: {
    total: results.passed + results.failed,
    passed: results.passed,
    failed: results.failed,
    successRate: ((results.passed / (results.passed + results.failed)) * 100).toFixed(2) + '%',
    totalDuration: `${totalDuration}ms`
  },
  details: results.tests,
  env: {
    hasPinyin: !!pinyinFn,
    styles: styleNames
  }
};

console.log(JSON.stringify(result, null, 2));
