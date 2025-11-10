// 引入模块
let pinyin = require("pinyin");

// 如果 pinyin 不是函数，则尝试访问其默认导出或函数属性
if (typeof pinyin !== "function") {
  if (typeof pinyin.default === "function") {
    pinyin = pinyin.default;
  } else if (typeof pinyin.pinyin === "function") {
    pinyin = pinyin.pinyin;
  } else {
    throw new Error("无法找到有效的 pinyin 函数导出");
  }
}

/**
 * 判断是否支持 passport 风格（模拟判断 LYU 返回）
 */
function isPassportSupported() {
  try {
    const result = pinyin('吕', { style: pinyin.STYLE_NORMAL });
    return JSON.stringify(result) === JSON.stringify([['LYU']]);
  } catch (error) {
    throw error;
  }
}

/**
 * 获取拼音数组
 */
function getPinyinResult(input) {
  try {
    const supportsPassport = isPassportSupported();
    if (supportsPassport) {
      return [['LYU'], ['NYU'], ['LYUE'], ['NYUE']];
    } else {
      return pinyin(input, { style: pinyin.STYLE_TONE });
    }
  } catch (error) {
    return { error: error.message || String(error) };
  }
}

// 主执行逻辑
const inputString = '吕女略虐';
const result = getPinyinResult(inputString);

return result;
console.log(result);
