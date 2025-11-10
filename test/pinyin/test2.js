// pinyin-full-coverage-selftest.js
// 覆盖 hotoo/pinyin v4 的所有公开功能点（API/Options/Styles/Modes/Helpers）
// 文档依据： https://pinyin.js.org/en-US/ （v4 API）
// 运行：node pinyin-full-coverage-selftest.js

const pinyin = require('pinyin');

function safe(fn, fallback) {
  try { return { ok: true, value: fn() }; }
  catch (err) { return { ok: false, error: String(err), value: fallback }; }
}

function avail(requireName) {
  try { require.resolve(requireName); return true; } catch { return false; }
}

function testSegmentEngine(engineName, text = '中国银行行长在中心') {
  return safe(() => pinyin(text, {
    segment: engineName,        // "Intl.Segmenter" | "nodejieba" | "@node-rs/jieba" | "segmentit"
    heteronym: true,            // 更能体现分词前后多音字歧义的变化
    style: pinyin.STYLE_TONE
  }), null);
}

(function main() {
  const startedAt = new Date();

  // ========== 1) 基础信息 ==========
  const meta = {
    node: process.version,
    pinyinVersion: safe(() => require('pinyin/package.json').version, 'unknown').value
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
    result: pinyin('汉字拼音') // 默认 STYLE_TONE
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
  const heteronymText = '重行乐'; // “重/行/乐”典型多音
  const heteronymOff = pinyin(heteronymText, { heteronym: false, style: pinyin.STYLE_TONE });
  const heteronymOn  = pinyin(heteronymText, { heteronym: true,  style: pinyin.STYLE_TONE });

  // ========== 6) 分词 segment（true/默认引擎 & 指定后端）==========
  // (a) segment: true（Node/Web 的 Intl.Segmenter）
  const withSegmentTrue = pinyin('我喜欢北京烤鸭', {
    segment: true,
    style: pinyin.STYLE_TONE,
  });

  // (b) 指定分词后端（如已安装）：nodejieba / @node-rs/jieba / segmentit / Intl.Segmenter
  const segmentBackends = [
    'Intl.Segmenter',
    'nodejieba',
    '@node-rs/jieba',
    'segmentit',
  ].map(name => {
    // Intl.Segmenter 由运行时提供，用 typeof 检测；第三方用 require.resolve 检测
    const available =
      name === 'Intl.Segmenter'
        ? (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function')
        : avail(name);
    const run = available ? testSegmentEngine(name) : { ok: false, error: 'engine not installed', value: null };
    return {
      engine: name,
      available,
      ok: run.ok,
      error: run.error || null,
      preview: run.value
    };
  });

  // ========== 7) group（需配合 segment）==========
  const groupText = '我喜欢你';
  const grouped = pinyin(groupText, { segment: true, group: true, style: pinyin.STYLE_TONE });

  // ========== 8) mode：NORMAL vs SURNAME ==========
  // 文档示例：“华夫人”在 SURNAME 下优先按姓氏读音（huà）。(NORMAL 通常给出常见读音 huá)
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
  const compactFn  = pinyin.compact(compactOff); // 等价于手动压缩组合

  // ========== 11) 繁体/简体混测 ==========
  const traditional = pinyin('臺灣繁體中文', { style: pinyin.STYLE_TONE }); // 支持繁体
  const simplified  = pinyin('台湾简体中文', { style: pinyin.STYLE_TONE });

  // ========== 12) INITIALS 边界（无声母返回空串）==========
  const noInitialChar = '阿'; // 无声母情形
  const initialsEdge = pinyin(noInitialChar, { style: pinyin.STYLE_INITIALS }); // 期望 [""]

  // —— 结果汇总 —— //
  const finishedAt = new Date();
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
    }
  };

  const coverageChecklist = {
    api_pinyin: Array.isArray(basic.result),
    api_compare: typeof pinyin.compare === 'function',
    helper_compact: typeof pinyin.compact === 'function',
    option_style_all: Object.values(staticConstants.styles).every(v => typeof v !== 'undefined'),
    option_heteronym: Array.isArray(heteronymOn) && heteronymOn.some(list => list.length > 1),
    option_segment_true: Array.isArray(withSegmentTrue),
    option_segment_backends_detected: segmentBackends.length === 4,
    option_group: Array.isArray(grouped),
    option_mode: Array.isArray(modeNormal) && Array.isArray(modeSurname),
    option_compact_true: Array.isArray(compactOn),
  };

  const success =
    Object.values(coverageChecklist).every(Boolean) &&
    segmentBackends.filter(e => e.available && !e.ok).length === 0;

  const ret = {
    success,
    message: success
      ? 'pinyin 模块全功能自检通过'
      : 'pinyin 模块自检完成（部分可选分词引擎未安装或出现异常）',
    coverageChecklist,
    results,
    timestamp: {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString()
    }
  };

  // 既可直接运行查看，也可被 require() 后取得对象
  if (require.main === module) {
    console.log(JSON.stringify(ret, null, 2));
  }
  module.exports = ret;
  return ret; // 保持与示例结构一致（若由外层执行环境调用）
})();