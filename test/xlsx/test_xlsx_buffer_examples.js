// ========================================
// XLSX Buffer 获取方式示例集合
// ========================================

const xlsx = require("xlsx");
const axios = require("axios");

// ========================================
// 示例 1: 从 URL 下载（使用 fetch）
// ========================================
async function example1_fetchFromUrl() {
  const url = "https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/afff4c5a-b13e-48dc-acac-31d95d193c38.xlsx";
  
  let workbook;
  try {
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    
    workbook = xlsx.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    return {
      method: "fetch from URL",
      success: true,
      rowCount: data.length,
      sample: data.slice(0, 3)
    };
  } catch (error) {
    return { method: "fetch from URL", success: false, error: error.message };
  } finally {
    if (workbook) workbook.close();
  }
}

// ========================================
// 示例 2: 从 URL 下载（使用 axios）
// ========================================
async function example2_axiosFromUrl() {
  const url = "https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/afff4c5a-b13e-48dc-acac-31d95d193c38.xlsx";
  
  let workbook;
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",  // ⭐ 必须设置
      timeout: 30000
    });
    
    const buffer = Buffer.from(response.data);
    
    workbook = xlsx.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    return {
      method: "axios from URL",
      success: true,
      rowCount: data.length,
      sample: data.slice(0, 3)
    };
  } catch (error) {
    return { method: "axios from URL", success: false, error: error.message };
  } finally {
    if (workbook) workbook.close();
  }
}

// ========================================
// 示例 3: 从 input 参数获取（Base64）
// 使用方式：在执行代码时传入 input 参数
// {
//   "buffer": "UEsDBBQABgAIAAAA..." (Base64 字符串)
// }
// ========================================
async function example3_fromInputBase64() {
  let workbook;
  try {
    // 假设 input.buffer 是 Base64 编码的字符串
    if (!input || !input.buffer) {
      throw new Error("请提供 input.buffer 参数");
    }
    
    let buffer;
    if (typeof input.buffer === 'string') {
      // Base64 字符串
      buffer = Buffer.from(input.buffer, 'base64');
    } else {
      // 已经是 Buffer 或 ArrayBuffer
      buffer = Buffer.from(input.buffer);
    }
    
    workbook = xlsx.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    return {
      method: "from input.buffer",
      success: true,
      rowCount: data.length,
      sample: data.slice(0, 3)
    };
  } catch (error) {
    return { method: "from input.buffer", success: false, error: error.message };
  } finally {
    if (workbook) workbook.close();
  }
}

// ========================================
// 示例 4: 完整示例 - 读取所有 Sheet
// ========================================
async function example4_readAllSheets() {
  const url = "https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/afff4c5a-b13e-48dc-acac-31d95d193c38.xlsx";
  
  let workbook;
  try {
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    
    workbook = xlsx.read(buffer);
    
    const result = {
      method: "read all sheets",
      success: true,
      sheetNames: workbook.SheetNames,
      sheets: {}
    };
    
    // 读取每个 sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);
      
      result.sheets[sheetName] = {
        rowCount: data.length,
        columns: data.length > 0 ? Object.keys(data[0]) : [],
        sample: data.slice(0, 2)  // 每个 sheet 返回 2 行示例
      };
    }
    
    return result;
  } catch (error) {
    return { method: "read all sheets", success: false, error: error.message };
  } finally {
    if (workbook) workbook.close();
  }
}

// ========================================
// 示例 5: 带错误处理的完整流程
// ========================================
async function example5_withErrorHandling() {
  const url = "https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/afff4c5a-b13e-48dc-acac-31d95d193c38.xlsx";
  
  let workbook;
  try {
    // Step 1: 下载文件
    console.log("正在下载 Excel 文件...");
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000
    });
    
    console.log(`下载完成，文件大小: ${response.data.byteLength} 字节`);
    
    // Step 2: 转换为 Buffer
    const buffer = Buffer.from(response.data);
    
    // Step 3: 读取 Excel
    console.log("正在解析 Excel 文件...");
    workbook = xlsx.read(buffer);
    
    // Step 4: 检查是否有 Sheet
    if (workbook.SheetNames.length === 0) {
      throw new Error("Excel 文件中没有工作表");
    }
    
    console.log(`找到 ${workbook.SheetNames.length} 个工作表: ${workbook.SheetNames.join(", ")}`);
    
    // Step 5: 读取第一个 Sheet
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(firstSheet);
    
    // Step 6: 数据验证
    if (data.length === 0) {
      console.log("警告: 工作表中没有数据");
    }
    
    console.log(`成功读取 ${data.length} 行数据`);
    
    return {
      method: "complete workflow with error handling",
      success: true,
      fileSize: response.data.byteLength,
      sheetCount: workbook.SheetNames.length,
      sheetNames: workbook.SheetNames,
      firstSheetName: workbook.SheetNames[0],
      rowCount: data.length,
      columns: data.length > 0 ? Object.keys(data[0]) : [],
      sample: data.slice(0, 5)
    };
  } catch (error) {
    console.error("处理失败:", error.message);
    return {
      method: "complete workflow with error handling",
      success: false,
      error: error.message,
      errorType: error.name
    };
  } finally {
    if (workbook) {
      console.log("正在释放资源...");
      workbook.close();
    }
  }
}

// ========================================
// 主函数 - 选择要运行的示例
// ========================================
async function main() {
  // 选择要运行的示例（取消注释对应的行）
  
  // return await example1_fetchFromUrl();
  // return await example2_axiosFromUrl();
  // return await example3_fromInputBase64();  // 需要传入 input.buffer
  // return await example4_readAllSheets();
  return await example5_withErrorHandling();  // 推荐：完整的错误处理示例
}

return main();

