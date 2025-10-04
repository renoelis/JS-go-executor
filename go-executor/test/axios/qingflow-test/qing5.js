const axios = require('axios');

const ACCESS_TOKEN = 'd866db1d-79ca-42c5-9e9c-0b1ce21135d2';

// ==================== 1. 根据邮箱获取 userId ====================
function getUserIdByEmail(email) {
  return axios.get(`https://api.qingflow.com/user/getId?email=${email}`, {
    headers: { accessToken: ACCESS_TOKEN }
  })
    .then(resp => {
      const result = resp.data.result;
      if (result && result.length > 0) {
        return result[0].userId;
      } else {
        return { error: '未找到用户ID' };
      }
    })
    .catch(err => {
      console.log('❌ getUserIdByEmail 出错:', err.message);
      return { error: '请求发生错误' };
    });
}

// ==================== 2. 根据 userId 获取部门 IDs ====================
function getDepartmentsByUserId(userId) {
  return axios.get(`https://api.qingflow.com/user/${userId}`, {
    headers: { accessToken: ACCESS_TOKEN }
  })
    .then(resp => resp.data.result.department)
    .catch(err => {
      console.log('❌ getDepartmentsByUserId 出错:', err.message);
      return { error: '请求发生错误' };
    });
}

// ==================== 3. 根据 deptId 递归获取完整部门名 ====================
function getDepartmentDetails(deptId) {
  return axios.get(`https://api.qingflow.com/department/${deptId}`, {
    headers: { accessToken: ACCESS_TOKEN }
  })
    .then(resp => {
      const result = resp.data.result;
      let fullName = result.name;

      if (result.parentId) {
        return getDepartmentDetails(result.parentId).then(parentName => {
          if (parentName.error) return parentName;
          return `${parentName}%${fullName}`;
        });
      }
      return fullName;
    })
    .catch(err => {
      console.log('❌ getDepartmentDetails 出错:', err.message);
      return { error: '请求发生错误' };
    });
}

// ==================== 4. 处理多个部门 ====================
function getFullDepartmentNames(departmentIds) {
  const tasks = departmentIds.map(id => getDepartmentDetails(id));

  return Promise.all(tasks)
    .then(names => names.join('&&&'))
    .catch(err => {
      console.log('❌ getFullDepartmentNames 出错:', err.message);
      return { error: '请求发生错误' };
    });
}

// ==================== 5. 主函数：处理邮箱 ====================
function processEmail(email) {
  return getUserIdByEmail(email)
    .then(userId => {
      if (userId.error) return userId;
      return getDepartmentsByUserId(userId).then(deptIds => {
        if (deptIds.error) return deptIds;
        return getFullDepartmentNames(deptIds);
      });
    })
    .then(departmentNamesString => {
      if (departmentNamesString.error) return departmentNamesString;
      return { departmentNamesString };
    })
    .catch(() => {
      return { error: '请求发生错误' };
    });
}

// ==================== 示例调用 ====================
var email = "zhangziqi@exiao.tech";
if (email == null) {
  return { departmentNamesString: null };
} else {
  return processEmail(email);
}
