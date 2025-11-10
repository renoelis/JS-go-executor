// 验证 Pinyin Bug 是否真的修复了
// 重点检查 segment + heteronym 组合是否返回完整的多音字

const lib = require('pinyin');
const pinyin = lib.pinyin || lib.default?.pinyin || lib;

console.log('========================================');
console.log('🔍 验证 Pinyin Bug 修复情况');
console.log('========================================\n');

// 测试用例：银行
console.log('📋 测试 1: 银行');
console.log('----------------------------------------');

const test1_baseline = pinyin('银行', { segment: false, heteronym: true });
console.log('Baseline (segment=false, heteronym=true):');
console.log(JSON.stringify(test1_baseline));
console.log('预期: [["yín"],["háng","xíng"]]');

const test1_bug = pinyin('银行', { segment: true, heteronym: true });
console.log('\nBug Test (segment=true, heteronym=true):');
console.log(JSON.stringify(test1_bug));
console.log('预期: [["yín"],["háng","xíng"]]');

const test1_fixed = test1_bug[1] && test1_bug[1].length >= 2;
console.log(`\n✅ 结果: ${test1_fixed ? '已修复！"行"返回了多个读音' : '❌ 仍有问题，"行"只返回了一个读音'}`);
console.log(`   "行"的读音数量: ${test1_bug[1]?.length || 0}`);

console.log('\n========================================\n');

// 测试用例：行长
console.log('📋 测试 2: 行长');
console.log('----------------------------------------');

const test2_baseline = pinyin('行长', { segment: false, heteronym: true });
console.log('Baseline (segment=false, heteronym=true):');
console.log(JSON.stringify(test2_baseline));

const test2_bug = pinyin('行长', { segment: true, heteronym: true });
console.log('\nBug Test (segment=true, heteronym=true):');
console.log(JSON.stringify(test2_bug));

const test2_fixed = test2_bug[0] && test2_bug[0].length >= 2;
console.log(`\n✅ 结果: ${test2_fixed ? '已修复！"行"返回了多个读音' : '❌ 仍有问题，"行"只返回了一个读音'}`);
console.log(`   "行"的读音数量: ${test2_bug[0]?.length || 0}`);

console.log('\n========================================\n');

// 测试用例：重庆银行行长
console.log('📋 测试 3: 重庆银行行长');
console.log('----------------------------------------');

const test3_baseline = pinyin('重庆银行行长', { segment: false, heteronym: true });
console.log('Baseline (segment=false, heteronym=true):');
console.log(JSON.stringify(test3_baseline));

const test3_bug = pinyin('重庆银行行长', { segment: true, heteronym: true });
console.log('\nBug Test (segment=true, heteronym=true):');
console.log(JSON.stringify(test3_bug));

// 检查"重"、"行"、"长"是否都有多个读音
const test3_chong = test3_bug[0] && test3_bug[0].length >= 2;
const test3_hang = test3_bug[3] && test3_bug[3].length >= 2;
const test3_zhang = test3_bug[4] && test3_bug[4].length >= 2;

console.log(`\n✅ 结果:`);
console.log(`   "重"的读音数量: ${test3_bug[0]?.length || 0} ${test3_chong ? '✅' : '❌'}`);
console.log(`   "行"的读音数量: ${test3_bug[3]?.length || 0} ${test3_hang ? '✅' : '❌'}`);
console.log(`   "长"的读音数量: ${test3_bug[4]?.length || 0} ${test3_zhang ? '✅' : '❌'}`);

console.log('\n========================================\n');

// 测试用例：我要去银行
console.log('📋 测试 4: 我要去银行');
console.log('----------------------------------------');

const test4_baseline = pinyin('我要去银行', { segment: false, heteronym: true });
console.log('Baseline (segment=false, heteronym=true):');
console.log(JSON.stringify(test4_baseline));

const test4_bug = pinyin('我要去银行', { segment: true, heteronym: true });
console.log('\nBug Test (segment=true, heteronym=true):');
console.log(JSON.stringify(test4_bug));

const test4_fixed = test4_bug[4] && test4_bug[4].length >= 2;
console.log(`\n✅ 结果: ${test4_fixed ? '已修复！"行"返回了多个读音' : '❌ 仍有问题，"行"只返回了一个读音'}`);
console.log(`   "行"的读音数量: ${test4_bug[4]?.length || 0}`);

console.log('\n========================================\n');

// 测试用例：朝阳
console.log('📋 测试 5: 朝阳');
console.log('----------------------------------------');

const test5_baseline = pinyin('朝阳', { segment: false, heteronym: true });
console.log('Baseline (segment=false, heteronym=true):');
console.log(JSON.stringify(test5_baseline));

const test5_bug = pinyin('朝阳', { segment: true, heteronym: true });
console.log('\nBug Test (segment=true, heteronym=true):');
console.log(JSON.stringify(test5_bug));

const test5_fixed = test5_bug[0] && test5_bug[0].length >= 2;
console.log(`\n✅ 结果: ${test5_fixed ? '已修复！"朝"返回了多个读音' : '❌ 仍有问题，"朝"只返回了一个读音'}`);
console.log(`   "朝"的读音数量: ${test5_bug[0]?.length || 0}`);

console.log('\n========================================\n');

// 总结
console.log('📊 总结');
console.log('----------------------------------------');
const allFixed = test1_fixed && test2_fixed && test3_chong && test3_hang && test3_zhang && test4_fixed && test5_fixed;

if (allFixed) {
  console.log('🎉 恭喜！所有 Bug 测试都通过了！');
  console.log('✅ segment + heteronym 组合现在可以正确返回多音字了');
  console.log('\n建议：');
  console.log('1. 更新 PINYIN_HETERONYM_BUG_ANALYSIS.md，标记 Bug 为"已修复"');
  console.log('2. 更新 README.md，移除"已知问题"说明');
  console.log('3. 提交代码并更新版本号');
} else {
  console.log('⚠️ 部分测试未通过，请检查具体的失败项');
  console.log('\n失败的测试：');
  if (!test1_fixed) console.log('  ❌ 测试 1: 银行');
  if (!test2_fixed) console.log('  ❌ 测试 2: 行长');
  if (!test3_chong || !test3_hang || !test3_zhang) console.log('  ❌ 测试 3: 重庆银行行长');
  if (!test4_fixed) console.log('  ❌ 测试 4: 我要去银行');
  if (!test5_fixed) console.log('  ❌ 测试 5: 朝阳');
}

console.log('\n========================================');

return {
  success: allFixed,
  tests: {
    test1_yinhang: { fixed: test1_fixed, pinyinCount: test1_bug[1]?.length || 0 },
    test2_hangzhang: { fixed: test2_fixed, pinyinCount: test2_bug[0]?.length || 0 },
    test3_complex: { 
      chong: { fixed: test3_chong, pinyinCount: test3_bug[0]?.length || 0 },
      hang: { fixed: test3_hang, pinyinCount: test3_bug[3]?.length || 0 },
      zhang: { fixed: test3_zhang, pinyinCount: test3_bug[4]?.length || 0 }
    },
    test4_sentence: { fixed: test4_fixed, pinyinCount: test4_bug[4]?.length || 0 },
    test5_chaoyang: { fixed: test5_fixed, pinyinCount: test5_bug[0]?.length || 0 }
  },
  message: allFixed 
    ? '🎉 所有 Bug 已修复！segment + heteronym 组合现在工作正常'
    : '⚠️ 部分测试未通过，请查看详细结果'
};

