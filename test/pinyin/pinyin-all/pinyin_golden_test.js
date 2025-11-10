// pinyin v4 固定输入→固定输出 金标测试（hotoo/pinyin）
// 依据官方 v4 文档：style 为字符串枚举；segment/group/mode；compact 组合输出
// Docs: https://pinyin.js.org/  （见 options.style / options.segment / options.compact 等）
// ------------------------------------------------------------------

const startTime = Date.now();
const results = { passed: 0, failed: 0, tests: [] };

function test(name, fn) {
  const t0 = Date.now();
  try {
    const ok = fn();
    const dt = `${Date.now() - t0}ms`;
    if (ok) results.tests.push({ name, status: 'passed', duration: dt }), results.passed++;
    else    results.tests.push({ name, status: 'failed', duration: dt, error: 'assertion failed' }), results.failed++;
  } catch (e) {
    results.tests.push({ name, status: 'failed', duration: `${Date.now() - t0}ms`, error: e && e.message || String(e) });
    results.failed++;
  }
}
const isArray = Array.isArray;
const eq2D = (a, b) => {
  if (!isArray(a) || !isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i], bi = b[i];
    if (!isArray(ai) || !isArray(bi) || ai.length !== bi.length) return false;
    for (let j = 0; j < ai.length; j++) if (ai[j] !== bi[j]) return false;
  }
  return true;
};
const includesAll = (arr, needs) => {
  const set = new Set(arr);
  return needs.every(x => set.has(x));
};

// ---------- 加载库 ----------
let mod;
test('可加载 pinyin 模块', () => {
  mod = require('pinyin'); // v4 推荐 { pinyin } 命名导出；此处兼容 CJS
  return !!mod;
});
const pinyin = mod.pinyin || mod.default || mod;
const compare = mod.compare;

// 统一调用
const call = (text, options) => pinyin(text, options);

// ---------- 固定金标用例 ----------
// 1) 基础：默认声调 tone
test("tone：中心 -> zhōng xīn", () => {
  const out = call('中心', { style: 'tone', heteronym: false, segment: false });
  const expected = [['zhōng'], ['xīn']];
  return eq2D(out, expected);
});
test("tone：北京 -> běi jīng", () => {
  const out = call('北京', { style: 'tone', heteronym: false, segment: false });
  const expected = [['běi'], ['jīng']];
  return eq2D(out, expected);
});
test("tone：上海 -> shàng hǎi", () => {
  const out = call('上海', { style: 'tone', heteronym: false, segment: false });
  const expected = [['shàng'], ['hǎi']];
  return eq2D(out, expected);
});
// 语境消歧：音乐 需开 segment 固定“乐”读 yuè
test("tone+segment：音乐 -> yīn yuè", () => {
  const out = call('音乐', { style: 'tone', heteronym: false, segment: true });
  const expected = [['yīn'], ['yuè']];
  return eq2D(out, expected);
});

// 2) 混合文本/标点/emoji
test("tone：你好，世界！ -> nǐ hǎo ， shì jiè ！", () => {
  const out = call('你好，世界！', { style: 'tone', heteronym: false, segment: false });
  const expected = [['nǐ'], ['hǎo'], ['，'], ['shì'], ['jiè'], ['！']];
  return eq2D(out, expected);
});
test("tone：A中B -> A zhōng B", () => {
  const out = call('A中B', { style: 'tone', heteronym: false, segment: false });
  const expected = [['A'], ['zhōng'], ['B']];
  return eq2D(out, expected);
});
test("tone：我😀你 -> wǒ 😀 nǐ", () => {
  const out = call('我😀你', { style: 'tone', heteronym: false, segment: false });
  const expected = [['wǒ'], ['😀'], ['nǐ']];
  return eq2D(out, expected);
});
test("空字符串 -> []", () => {
  const out = call('', { style: 'tone' });
  return isArray(out) && out.length === 0;
});

// 3) 异读音（单字 & 词语）
test("heteronym：重 -> [zhòng, chóng]", () => {
  const out = call('重', { style: 'tone', heteronym: true, segment: false });
  if (out.length !== 1) return false;
  // 要求至少包含这两种（顺序/是否还有额外读音不限制）
  return includesAll(out[0], ['zhòng','chóng']);
});
// 将“乐”放入语境验证：第1字固定 yīn，第2字的候选至少含 yuè/lè
test("heteronym：音乐（候选包含 yuè/lè）", () => {
  const out = call('音乐', { style: 'tone', heteronym: true, segment: false });
  if (out.length !== 2) return false;
  return eq2D([out[0]], [['yīn']]) && includesAll(out[1], ['yuè','lè']);
});

// 4) 分词与分组（与官方示例一致）
test("segment+group：我喜欢你 -> [wǒ][xǐhuān][nǐ]", () => {
  const out = call('我喜欢你', { style: 'tone', segment: true, group: true });
  const expected = [['wǒ'], ['xǐhuān'], ['nǐ']];
  return eq2D(out, expected);
});
test("segment：重庆 -> chóng qìng", () => {
  const out = call('重庆', { style: 'tone', heteronym: true, segment: true });
  const expected = [['chóng'], ['qìng']];
  return eq2D(out, expected);
});

// 5) 样式风格（字符串枚举）
test("style: normal 北京 -> bei jing", () => {
  const out = call('北京', { style: 'normal' });
  const expected = [['bei'], ['jing']];
  return eq2D(out, expected);
});
test("style: tone2 上海 -> shang4 hai3", () => {
  const out = call('上海', { style: 'tone2' });
  const expected = [['shang4'], ['hai3']];
  return eq2D(out, expected);
});
test("style: to3ne 中心 -> zho1ng xi1n", () => {
  const out = call('中心', { style: 'to3ne' });
  const expected = [['zho1ng'], ['xi1n']];
  return eq2D(out, expected);
});
test("style: initials 中国 -> zh g", () => {
  const out = call('中国', { style: 'initials' });
  const expected = [['zh'], ['g']];
  return eq2D(out, expected);
});
// 首字母在“音乐”中期望 y/y，需 segment:true
test("style: first_letter 音乐 -> y y", () => {
  const out = call('音乐', { style: 'first_letter', segment: true });
  const expected = [['y'], ['y']];
  return eq2D(out, expected);
});

// 6) compare：按拼音排序（固定序）
test("compare：按拼音排序 北京/广州/上海/深圳", () => {
  if (typeof compare !== 'function') return false;
  const arr = ['上海', '北京', '广州', '深圳'];
  const sorted = arr.slice().sort(compare); // 期望：北京 < 广州 < 上海 < 深圳
  const expected = ['北京', '广州', '上海', '深圳'];
  return JSON.stringify(sorted) === JSON.stringify(expected);
});

// 7) 组合模式：compact（按官方示例，使用简体“你好吗”得到 6 组组合）
test("compact：你好吗 -> 6 组组合", () => {
  const out = call('你好吗', { style: 'tone', heteronym: true, compact: true });
  const expected = [
    ['nǐ','hǎo','ma'],
    ['nǐ','hǎo','má'],
    ['nǐ','hǎo','mǎ'],
    ['nǐ','hào','ma'],
    ['nǐ','hào','má'],
    ['nǐ','hào','mǎ'],
  ];
  return eq2D(out, expected);
});

// ---------- 汇总 ----------
const totalDuration = Date.now() - startTime;
const result = {
  summary: {
    total: results.passed + results.failed,
    passed: results.passed,
    failed: results.failed,
    successRate: ((results.passed / (results.passed + results.failed)) * 100).toFixed(2) + '%',
    totalDuration: `${totalDuration}ms`
  },
  details: results.tests
};
console.log(JSON.stringify(result, null, 2));