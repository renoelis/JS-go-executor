// pinyin 模块“无死角”功能自测脚本（按你给的 return {...} 风格，并输出成功率）
// 约定：你本地已安装 pinyin ： npm i pinyin
// 直接在你们执行环境（支持顶层 return）中运行本脚本即可。

const lib = require('pinyin');

// 解析 pinyin 主入口（兼容各种导出形态）
function resolvePinyin(mod) {
  if (!mod) return null;
  if (typeof mod === 'function') return mod;
  if (typeof mod.pinyin === 'function') return mod.pinyin;
  if (mod.default) {
    if (typeof mod.default === 'function') return mod.default;
    if (typeof mod.default.pinyin === 'function') return mod.default.pinyin;
  }
  return null;
}
const pinyin = resolvePinyin(lib);
const compare = (lib && lib.compare) || (lib && lib.default && lib.default.compare);

// 小工具
const ok = v => ({ ok: true, value: v });
const err = e => ({ ok: false, error: String(e) });
const call = (fn, ...args) => { try { return ok(fn(...args)); } catch (e) { return err(e); } };
const preview2D = (arr, outer = 8, inner = 6) => Array.isArray(arr)
  ? arr.slice(0, outer).map(r => Array.isArray(r) ? r.slice(0, inner) : r)
  : arr;
const pct = (n, d) => (d === 0 ? '0.00%' : ((n / d) * 100).toFixed(2) + '%');

// ------------------------- 公有 API（黑盒）覆盖 -------------------------
const publicResults = {};
publicResults.entryPresent = !!pinyin;

// 终止条件：若连入口都没有，直接返回失败（并给出 0% 成功率）
if (!publicResults.entryPresent) {
  return {
    success: false,
    message: '未找到 pinyin 入口函数，请确认模块已正确安装并可 require("pinyin")',
    results: { public: publicResults },
    metrics: { passed: 0, total: 0, successRate: '0.00%' },
    timestamp: new Date().toISOString(),
  };
}

// 样例集合（尽量不依赖大词典也能覆盖到）
const samples = {
  compound1: '司马光',
  compound2: '闾丘',
  compound3: '单于',
  polyChar: '行',
  polyWord: '朝阳',
  mixed: '小王在北京大学，邮箱a.b+1@ex-ample.com，网址https://example.com/p，2025年10月31日红的车',
  normal: '中文Mixed-Content 123',
};

// 1) 所有 style 覆盖
const styles = ['TONE','TONE2','TO3NE','NORMAL','INITIALS','FIRST_LETTER','PASSPORT'];
publicResults.styles = {};
styles.forEach(s => {
  publicResults.styles[s] = call(pinyin, samples.compound2, { mode: 'surname', style: s });
});

// 2) style 别名/数字字符串覆盖
const styleAliases = ['tone','TONE','1','tone2','TONE2','2','to3ne','TO3NE','5','first_letter','FIRST_LETTER','4','initials','INITIALS','3','normal','NORMAL','0','passport','PASSPORT','6'];
publicResults.styleAliases = call(
  () => styleAliases.map(a => pinyin(samples.compound1, { mode: 'surname', style: a }))
);

// 3) 模式覆盖（NORMAL / SURNAME）
publicResults.modeNormal  = call(pinyin, samples.polyWord, { mode: 'normal',  style: 'TONE', heteronym: true });
publicResults.modeSurname = call(pinyin, samples.compound1, { mode: 'surname', style: 'TONE' });

// 4) heteronym / group / compact
publicResults.heteronymChar = call(pinyin, samples.polyChar, { heteronym: true, style: 'NORMAL' });
publicResults.group         = call(pinyin, samples.polyWord,  { heteronym: true, group: true,   style: 'NORMAL' });
publicResults.compact       = call(pinyin, samples.polyWord,  { heteronym: true, compact: true, style: 'NORMAL' });

// 5) segmentation 路径：true（=> Intl.Segmenter）、"Intl.Segmenter"、"segmentit"
publicResults.segment_true          = call(pinyin, samples.mixed, { segment: true,             style: 'NORMAL' });
publicResults.segment_IntlSegmenter = call(pinyin, samples.mixed, { segment: 'Intl.Segmenter', style: 'NORMAL' });
publicResults.segment_segmentit     = call(pinyin, samples.mixed, { segment: 'segmentit',      style: 'NORMAL' });

// 6) 常规（不分词）路径
publicResults.noSegment = call(pinyin, samples.normal, { style: 'TONE' });

// 7) compare（若导出）
publicResults.compare = (typeof compare === 'function')
  ? call(compare, '张三', '李四')
  : { ok: false, skipped: true, reason: '模块未导出 compare()' };

// 8) 边界输入
publicResults.edgeEmpty  = call(pinyin, '', {});
publicResults.edgeNonStr = call(pinyin, 12345, {});

// 9) 🐛 Bug 测试：segment + heteronym 组合（PINYIN_HETERONYM_BUG_ANALYSIS.md）
// 这些测试用例在 Node.js 中正确，但在 Goja 中可能丢失多音字
publicResults.bugTests = {
  // 测试 1: 银行（最典型的 Bug 示例）
  yinhang_baseline_no_seg_no_het: call(pinyin, '银行', { segment: false, heteronym: false }),
  yinhang_baseline_no_seg_het:    call(pinyin, '银行', { segment: false, heteronym: true }),
  yinhang_baseline_seg_no_het:    call(pinyin, '银行', { segment: true,  heteronym: false }),
  yinhang_bug_seg_het:            call(pinyin, '银行', { segment: true,  heteronym: true }),  // 🐛 预期: [["yín"],["háng","xíng"]]，实际可能: [["yín"],["háng"]]
  
  // 测试 2: 行长（另一个多音字示例）
  hangzhang_baseline_no_seg_het:  call(pinyin, '行长', { segment: false, heteronym: true }),
  hangzhang_bug_seg_het:          call(pinyin, '行长', { segment: true,  heteronym: true }),  // 🐛 可能丢失"xíng"
  
  // 测试 3: 重庆银行行长（复杂组合）
  complex_baseline_no_seg_het:    call(pinyin, '重庆银行行长', { segment: false, heteronym: true }),
  complex_bug_seg_het:            call(pinyin, '重庆银行行长', { segment: true,  heteronym: true }),  // 🐛 可能丢失多个多音字
  
  // 测试 4: 我要去银行（完整句子）
  sentence_baseline_no_seg_het:   call(pinyin, '我要去银行', { segment: false, heteronym: true }),
  sentence_bug_seg_het:           call(pinyin, '我要去银行', { segment: true,  heteronym: true }),  // 🐛 "行"可能丢失多音
  
  // 测试 5: 单字"行"（对照组）
  single_hang_het:                call(pinyin, '行', { heteronym: true }),  // ✅ 应该正确返回所有读音
  
  // 测试 6: 其他多音字词组
  chaoyang_baseline_no_seg_het:   call(pinyin, '朝阳', { segment: false, heteronym: true }),
  chaoyang_bug_seg_het:           call(pinyin, '朝阳', { segment: true,  heteronym: true }),  // 🐛 可能丢失"cháo"或"zhāo"
};

// 通过条件：核心路径全部不抛错（bugTests 不计入必须通过，因为是已知 Bug）
const requiredOk =
  Object.values(publicResults.styles).every(r => r.ok) &&
  publicResults.styleAliases.ok &&
  publicResults.modeNormal.ok &&
  publicResults.modeSurname.ok &&
  publicResults.heteronymChar.ok &&
  publicResults.group.ok &&
  publicResults.compact.ok &&
  publicResults.segment_true.ok &&
  publicResults.segment_IntlSegmenter.ok &&
  publicResults.segment_segmentit.ok &&
  publicResults.noSegment.ok &&
  publicResults.edgeEmpty.ok &&
  publicResults.edgeNonStr.ok;

// --------- 统计成功率（把所有必测项计入分母，ok 计入分子）---------
const checks = [];
Object.values(publicResults.styles).forEach(r => checks.push(!!r.ok));
checks.push(
  !!publicResults.styleAliases.ok,
  !!publicResults.modeNormal.ok,
  !!publicResults.modeSurname.ok,
  !!publicResults.heteronymChar.ok,
  !!publicResults.group.ok,
  !!publicResults.compact.ok,
  !!publicResults.segment_true.ok,
  !!publicResults.segment_IntlSegmenter.ok,
  !!publicResults.segment_segmentit.ok,
  !!publicResults.noSegment.ok,
  !!publicResults.edgeEmpty.ok,
  !!publicResults.edgeNonStr.ok,
);
const passed = checks.filter(Boolean).length;
const total  = checks.length;
const successRate = pct(passed, total);

// --------- Bug 测试统计（单独统计，不影响主成功率）---------
const bugChecks = Object.values(publicResults.bugTests).map(r => !!r.ok);
const bugPassed = bugChecks.filter(Boolean).length;
const bugTotal = bugChecks.length;
const bugSuccessRate = pct(bugPassed, bugTotal);

// ------------------------- 返回（含成功率） -------------------------
const t= {
  success: !!requiredOk,
  message: requiredOk
    ? 'pinyin 模块功能自测成功（风格/模式/分词/多音/组合/边界全覆盖）'
    : 'pinyin 模块自测发现异常（查看 results.public.* 中 .ok=false 项）',
  results: {
    public: {
      entryPresent: publicResults.entryPresent,
      styles: Object.fromEntries(
        Object.entries(publicResults.styles).map(([k, v]) => [
          k, v.ok ? { ok: true, sample: preview2D(v.value) } : v
        ])
      ),
      styleAliases: publicResults.styleAliases.ok
        ? { ok: true, sample: preview2D(publicResults.styleAliases.value.map(preview2D)) }
        : publicResults.styleAliases,
      mode: {
        normal:  publicResults.modeNormal.ok  ? { ok: true, sample: preview2D(publicResults.modeNormal.value) }   : publicResults.modeNormal,
        surname: publicResults.modeSurname.ok ? { ok: true, sample: preview2D(publicResults.modeSurname.value) } : publicResults.modeSurname,
      },
      heteronymChar: publicResults.heteronymChar.ok
        ? { ok: true, sample: preview2D(publicResults.heteronymChar.value) }
        : publicResults.heteronymChar,
      group: publicResults.group.ok
        ? { ok: true, sample: preview2D(publicResults.group.value) }
        : publicResults.group,
      compact: publicResults.compact.ok
        ? { ok: true, sample: preview2D(publicResults.compact.value) }
        : publicResults.compact,
      segment: {
        true:           publicResults.segment_true.ok          ? { ok: true, sample: preview2D(publicResults.segment_true.value) }          : publicResults.segment_true,
        IntlSegmenter:  publicResults.segment_IntlSegmenter.ok ? { ok: true, sample: preview2D(publicResults.segment_IntlSegmenter.value) } : publicResults.segment_IntlSegmenter,
        segmentit:      publicResults.segment_segmentit.ok      ? { ok: true, sample: preview2D(publicResults.segment_segmentit.value) }     : publicResults.segment_segmentit,
      },
      noSegment: publicResults.noSegment.ok
        ? { ok: true, sample: preview2D(publicResults.noSegment.value) }
        : publicResults.noSegment,
      compare: publicResults.compare,
      edgeCases: {
        empty: publicResults.edgeEmpty.ok ? { ok: true, sample: publicResults.edgeEmpty.value } : publicResults.edgeEmpty,
        nonString: publicResults.edgeNonStr.ok ? { ok: true, sample: publicResults.edgeNonStr.value } : publicResults.edgeNonStr,
      },
    },
    // 🐛 Bug 测试结果（segment + heteronym 组合）
    bugTests: Object.fromEntries(
      Object.entries(publicResults.bugTests).map(([k, v]) => [
        k, v.ok ? { ok: true, value: v.value, preview: preview2D(v.value) } : v
      ])
    ),
  },
  coverage: {
    styles: ['TONE','TONE2','TO3NE','NORMAL','INITIALS','FIRST_LETTER','PASSPORT'],
    options: ['heteronym','group','compact','segment:true','segment:Intl.Segmenter','segment:segmentit','no-seg'],
    modes: ['NORMAL','SURNAME'],
    edge: ['empty string','non-string'],
    bugTests: ['segment+heteronym combinations (known issue)'],
  },
  metrics: {
    core: {
      passed,
      total,
      successRate, // 例如 "100.00%"
    },
    bugTests: {
      passed: bugPassed,
      total: bugTotal,
      successRate: bugSuccessRate,
      note: 'segment + heteronym 组合的已知 Bug 测试（详见 PINYIN_HETERONYM_BUG_ANALYSIS.md）',
    },
  },
  timestamp: new Date().toISOString(),
};
console.log(t)