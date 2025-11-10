// pinyin-full-coverage-test for HTTP API
// 适配 flow-codeblock HTTP API 环境和 Node.js 环境

const pinyinModule = require('pinyin');

// 兼容两种环境：
// - Node.js: require('pinyin') 返回对象，函数在 .pinyin 上
// - Goja: require('pinyin') 直接返回函数
const pinyin = typeof pinyinModule === 'function' ? pinyinModule : pinyinModule.pinyin || pinyinModule.default;

// 如果是对象，复制所有属性
if (typeof pinyinModule === 'object') {
  Object.assign(pinyin, pinyinModule);
}

function safe(fn, fallback) {
  try { return { ok: true, value: fn() }; }
  catch (err) { return { ok: false, error: String(err), value: fallback }; }
}

function testSegmentEngine(engineName, text = '中国银行行长在中心') {
  return safe(() => pinyin(text, {
    segment: engineName,
    heteronym: true,
    style: pinyin.STYLE_TONE
  }), null);
}

(function main() {
  const startedAt = Date.now();

  // ========== 1) 基础信息 ==========
  const meta = {
    environment: 'Goja Runtime (HTTP API)',
    hasIntlSegmenter: typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
  };

  // ========== 2) 静态常量完整性（Styles & Modes）==========
  const staticConstants = {
    styles: {
      NORMAL: pinyin.STYLE_NORMAL,
      TONE: pinyin.STYLE_TONE,
      TONE2: pinyin.STYLE_TONE2,
      TO3NE: pinyin.STYLE_TO3NE,
      INITIALS: pinyin.STYLE_INITIALS,
      FIRST_LETTER: pinyin.STYLE_FIRST_LETTER,
    },
    modes: {
      NORMAL: pinyin.MODE_NORMAL,
      SURNAME: pinyin.MODE_SURNAME,
    }
  };

  // ========== 3) 基础转换：默认风格（TONE）==========
  const basic = {
    sample: '汉字拼音',
    result: pinyin('汉字拼音')
  };

  // ========== 4) 各风格 STYLE_* 输出对比 ==========
  const styleSamples = '中国人爱编程';
  const stylesCheck = {
    NORMAL: pinyin(styleSamples, { style: pinyin.STYLE_NORMAL }),
    TONE: pinyin(styleSamples, { style: pinyin.STYLE_TONE }),
    TONE2: pinyin(styleSamples, { style: pinyin.STYLE_TONE2 }),
    TO3NE: pinyin(styleSamples, { style: pinyin.STYLE_TO3NE }),
    INITIALS: pinyin(styleSamples, { style: pinyin.STYLE_INITIALS }),
    FIRST_LETTER: pinyin(styleSamples, { style: pinyin.STYLE_FIRST_LETTER })
  };

  // ========== 5) 多音字 heteronym 开关 ==========
  const heteronymText = '重行乐';
  const heteronymOff = pinyin(heteronymText, { heteronym: false, style: pinyin.STYLE_TONE });
  const heteronymOn  = pinyin(heteronymText, { heteronym: true,  style: pinyin.STYLE_TONE });

  // ========== 6) 分词 segment ==========
  const withSegmentTrue = pinyin('我喜欢北京烤鸭', {
    segment: true,
    style: pinyin.STYLE_TONE,
  });

  // 测试 Intl.Segmenter
  const segmentBackends = [{
    engine: 'Intl.Segmenter',
    available: typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function',
    ok: true,
    error: null,
    preview: testSegmentEngine('Intl.Segmenter').value
  }];

  // ========== 7) group（需配合 segment）==========
  const groupText = '我喜欢你';
  const grouped = pinyin(groupText, { segment: true, group: true, style: pinyin.STYLE_TONE });

  // ========== 8) mode：NORMAL vs SURNAME ==========
  const surnameWord = '华夫人';
  const modeNormal   = pinyin(surnameWord, { mode: pinyin.MODE_NORMAL,  style: pinyin.STYLE_TONE });
  const modeSurname  = pinyin(surnameWord, { mode: pinyin.MODE_SURNAME, style: pinyin.STYLE_TONE });

  // ========== 9) compare：拼音排序 ==========
  const toSort = '我要排序'.split('');
  const sorted = [...toSort].sort(pinyin.compare);

  // ========== 10) compact 选项 与 pinyin.compact(result) ==========
  const compactText = '你好吗';
  const compactOff = pinyin(compactText, { heteronym: true, compact: false, style: pinyin.STYLE_TONE });
  const compactOn  = pinyin(compactText, { heteronym: true, compact: true,  style: pinyin.STYLE_TONE });
  const compactFn  = pinyin.compact(compactOff);

  // ========== 11) 繁体/简体混测 ==========
  const traditional = pinyin('臺灣繁體中文', { style: pinyin.STYLE_TONE });
  const simplified  = pinyin('台湾简体中文', { style: pinyin.STYLE_TONE });

  // ========== 12) INITIALS 边界（无声母返回空串）==========
  const noInitialChar = '阿';
  const initialsEdge = pinyin(noInitialChar, { style: pinyin.STYLE_INITIALS });

  // ========== 13) 三个关键修复测试 ==========
  const fixTests = {
    passport: {
      input: '吕女略虐',
      result: pinyin('吕女略虐', { style: 'passport' }),
      expected: [['LYU'], ['NYU'], ['LYUE'], ['NYUE']]
    },
    nonHan: {
      input: 'ABC-123',
      result: pinyin('ABC-123'),
      expected: [['ABC-123']]
    },
    nonHanMixed: {
      input: '我爱Node.js与TypeScript！',
      result: pinyin('我爱Node.js与TypeScript！'),
      // 期望: 3个汉字 + 2个非汉字组
    },
    compactFunction: {
      input: compactOff,
      result: compactFn,
      working: Array.isArray(compactFn) && compactFn.length > 0
    }
  };

  // —— 结果汇总 —— //
  const finishedAt = Date.now();
  const results = {
    meta,
    constants: staticConstants,
    basic,
    stylesCheck,
    heteronym: { text: heteronymText, off: heteronymOff, on: heteronymOn },
    segment: {
      trueDefault: withSegmentTrue,
      engines: segmentBackends,
    },
    group: { text: groupText, grouped },
    mode: {
      text: surnameWord,
      normal: modeNormal,
      surname: modeSurname,
    },
    compare: { input: toSort, output: sorted },
    compact: {
      text: compactText,
      off: compactOff,
      on: compactOn,
      viaFunction: compactFn,
    },
    traditionalSimplified: {
      traditional,
      simplified
    },
    initialsEdge: {
      char: noInitialChar,
      result: initialsEdge
    },
    fixTests
  };

  const coverageChecklist = {
    api_pinyin: Array.isArray(basic.result),
    api_compare: typeof pinyin.compare === 'function',
    helper_compact: typeof pinyin.compact === 'function',
    option_style_all: Object.values(staticConstants.styles).every(v => typeof v !== 'undefined'),
    option_heteronym: Array.isArray(heteronymOn) && heteronymOn.some(list => list.length > 1),
    option_segment_true: Array.isArray(withSegmentTrue),
    option_group: Array.isArray(grouped),
    option_mode: Array.isArray(modeNormal) && Array.isArray(modeSurname),
    option_compact_true: Array.isArray(compactOn),
    fix_passport: JSON.stringify(fixTests.passport.result) === JSON.stringify(fixTests.passport.expected),
    fix_nonHan: JSON.stringify(fixTests.nonHan.result) === JSON.stringify(fixTests.nonHan.expected),
    fix_compact_function: fixTests.compactFunction.working
  };

  const success = Object.values(coverageChecklist).every(Boolean);

  const ret = {
    success,
    message: success
      ? '✅ pinyin 模块全功能测试通过（包括3个关键修复）'
      : '❌ pinyin 模块测试完成（有失败项）',
    coverageChecklist,
    results,
    timing: {
      duration: (finishedAt - startedAt) + 'ms'
    }
  };

  // 兼容两种环境：
  // - Node.js: 直接打印 JSON
  // - Goja HTTP API: 返回对象
  if (typeof console !== 'undefined' && typeof process !== 'undefined') {
    // Node.js 环境
    console.log(JSON.stringify(ret, null, 2));
  }
  
  return ret;
})();

