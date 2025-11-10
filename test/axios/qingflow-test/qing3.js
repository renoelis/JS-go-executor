//部门字段部门拆分到表格部门字段中

const axios = require('axios');

// ==================== 获取单个部门 ====================
function fetchDepartment(deptId, accessToken) {
  return axios.get(`https://api.qingflow.com/department/${deptId}`, {
    headers: {
      accessToken: accessToken
    }
  })
    .then(function (response) {
      return response.data;
    })
    .catch(function (error) {
      console.log('❌ 请求失败:', error.message);
      return { error: '请求发生错误' };
    });
}

// ==================== 获取完整部门路径 ====================
function getFullDepartmentName(deptId, accessToken) {
  let fullName = '';

  function loop(currentId) {
    if (!currentId) {
      return Promise.resolve(fullName);
    }

    return fetchDepartment(currentId, accessToken)
      .then(function (deptData) {
        if (deptData.error) {
          return { error: '请求发生错误' };
        }

        const deptResult = deptData.result;
        const currentDeptName = deptResult.name;
        const parentId = deptResult.parentId;

        // 构建部门名称路径，用 % 连接
        fullName = fullName ? `${currentDeptName}%${fullName}` : currentDeptName;

        return loop(parentId); // 递归处理父部门
      });
  }

  return loop(deptId);
}

// ==================== 主函数：处理多个部门 ====================
function getDepartmentHierarchy(deptIds) {
  const accessToken = 'd866db1d-79ca-42c5-9e9c-0b1ce21135d2';
  const ids = deptIds.split(','); // 分割 deptIds 为数组
  const result = [];

  let chain = Promise.resolve();

  ids.forEach(function (id) {
    chain = chain.then(function () {
      return getFullDepartmentName(id, accessToken)
        .then(function (fullDeptName) {
          if (!fullDeptName.error) {
            result.push({
              name: fullDeptName,
              deptId: id
            });
          }
        });
    });
  });

  return chain.then(function () {
    return { list: result };
  })
    .catch(function () {
      return { error: '请求发生错误' };
    });
}

// ==================== 示例调用 ====================
var deptids = "143937,168059,168060";
if (deptids == null) {
  return { list: null };
} else {
  return getDepartmentHierarchy(deptids);
}

