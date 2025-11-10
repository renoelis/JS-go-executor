const xlsx = require("xlsx");

async function readExcelBasic() {
  // 从真实 URL 下载 Excel 文件
  const response = await fetch("https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/afff4c5a-b13e-48dc-acac-31d95d193c38.xlsx");
  const buffer = Buffer.from(await response.arrayBuffer());
  
  let workbook;  // ⭐ 关键修正：在 try 外部声明
  try {
    // 读取 workbook
    workbook = xlsx.read(buffer);
    
    // 获取第一个 sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // 转换为 JSON
    const data = xlsx.utils.sheet_to_json(sheet);
    
    return {
      success: true,
      sheetName: sheetName,
      rowCount: data.length,
      data: data.slice(0, 5)  // 只返回前 5 行作为示例
    };
  } finally {
    // ⭐ 重要：必须调用 close() 释放资源
    if (workbook) {
      workbook.close();
    }
  }
}

return readExcelBasic();

