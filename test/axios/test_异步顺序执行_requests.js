const axios = require('axios');

// ========================================
// 方式 1: 链式调用（推荐）
// ========================================
async function sequentialRequests_v1() {
  try {
    // 第一个接口：获取用户信息
    const user = await axios.get('https://jsonplaceholder.typicode.com/users/1');
    
    // 使用第一个接口的返回值
    const userId = user.data.id;
    
    // 第二个接口：根据 userId 获取文章列表
    const posts = await axios.get(`https://jsonplaceholder.typicode.com/posts?userId=${userId}`);
    
    // 使用第二个接口的返回值
    const firstPostId = posts.data[0].id;
    
    // 第三个接口：根据 postId 获取评论
    const comments = await axios.get(`https://jsonplaceholder.typicode.com/comments?postId=${firstPostId}`);
    
    // 返回最终结果
    return {
      success: true,
      user: user.data,
      postCount: posts.data.length,
      firstPost: posts.data[0],
      commentCount: comments.data.length,
      comments: comments.data.slice(0, 3)  // 返回前 3 条评论
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ========================================
// 方式 2: 函数拆分（您的写法修正版）
// ========================================
async function first() {
  // 第一个接口：获取用户信息
  const response = await axios.get('https://jsonplaceholder.typicode.com/users/1');
  return response.data;  // ⭐ 返回数据，供下一个函数使用
}

async function second(userId) {
  // 第二个接口：根据 userId 获取文章列表
  const response = await axios.get(`https://jsonplaceholder.typicode.com/posts?userId=${userId}`);
  return response.data;  // ⭐ 返回数据
}

async function third(postId) {
  // 第三个接口：根据 postId 获取评论
  const response = await axios.get(`https://jsonplaceholder.typicode.com/comments?postId=${postId}`);
  return response.data;  // ⭐ 返回数据
}

async function sequentialRequests_v2() {
  try {
    // ⭐ 依次调用，每个函数等待前一个完成
    const user = await first();
    const posts = await second(user.id);
    const comments = await third(posts[0].id);
    
    return {
      success: true,
      user: user,
      postCount: posts.length,
      commentCount: comments.length,
      firstComment: comments[0]
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ========================================
// 方式 3: 真实业务场景示例
// ========================================
async function realWorldExample() {
  try {
    // 步骤 1: 登录/获取 token
    const authResponse = await axios.post('https://httpbin.org/post', {
      username: 'testuser',
      password: 'testpass'
    });
    
    const token = authResponse.data.json.username;  // 模拟 token
    
    // 步骤 2: 使用 token 获取用户详情
    const userResponse = await axios.get('https://jsonplaceholder.typicode.com/users/1', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const userId = userResponse.data.id;
    
    // 步骤 3: 获取用户的数据列表
    const dataResponse = await axios.get(`https://jsonplaceholder.typicode.com/posts?userId=${userId}`);
    
    // 步骤 4: 提交处理结果
    const submitResponse = await axios.post('https://httpbin.org/post', {
      userId: userId,
      dataCount: dataResponse.data.length,
      processTime: new Date().toISOString()
    });
    
    return {
      success: true,
      message: '所有接口依次执行完成',
      token: token,
      user: userResponse.data.name,
      dataCount: dataResponse.data.length,
      submitResult: submitResponse.data.json
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ========================================
// 方式 4: 带重试机制的依次调用
// ========================================
async function requestWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error;
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

async function sequentialWithRetry() {
  try {
    // 依次调用，每个接口都有重试机制
    const user = await requestWithRetry('https://jsonplaceholder.typicode.com/users/1');
    const posts = await requestWithRetry(`https://jsonplaceholder.typicode.com/posts?userId=${user.id}`);
    const comments = await requestWithRetry(`https://jsonplaceholder.typicode.com/comments?postId=${posts[0].id}`);
    
    return {
      success: true,
      message: '带重试机制的依次调用成功',
      user: user.name,
      postCount: posts.length,
      commentCount: comments.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ========================================
// 方式 5: 华为云 OBS 场景示例（下载 → 处理 → 上传）
// ========================================
async function ossWorkflow() {
  try {
    // 步骤 1: 从 OSS 下载 Excel 文件
    const downloadResponse = await axios.get(
      'https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/afff4c5a-b13e-48dc-acac-31d95d193c38.xlsx',
      { responseType: 'arraybuffer' }
    );
    
    const fileSize = downloadResponse.data.byteLength;
    
    // 步骤 2: 处理文件（模拟）
    // 这里可以使用 xlsx 模块处理 Excel
    const processResult = {
      originalSize: fileSize,
      processedAt: new Date().toISOString()
    };
    
    // 步骤 3: 上传处理结果到服务器
    const uploadResponse = await axios.post('https://httpbin.org/post', {
      fileName: 'processed_data.xlsx',
      processResult: processResult
    });
    
    return {
      success: true,
      message: 'OSS 工作流完成',
      downloadSize: fileSize,
      uploadResult: uploadResponse.data.json
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ========================================
// 主函数 - 选择要执行的方式
// ========================================
async function main() {
  // 选择一个方式执行（取消注释对应的行）
  
  // return await sequentialRequests_v1();      // 方式 1: 链式调用
  // return await sequentialRequests_v2();      // 方式 2: 函数拆分
  // return await realWorldExample();           // 方式 3: 真实业务场景
  // return await sequentialWithRetry();        // 方式 4: 带重试机制
  return await ossWorkflow();                   // 方式 5: OSS 工作流
}

// ⭐ 关键修正：必须使用 return 并 await
return main();

