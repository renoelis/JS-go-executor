const axios = require('axios');

async function getUserIdByEmail(email, token) {
    try {
        const response = await axios.get("https://api.qingflow.com/user/getId?email=" + email, {
            headers: { accessToken: token }
        });
        return response.data.result[0].userId;
    } catch (error) {
        return { error: '获取用户ID失败: ' + error.message };
    }
}

async function getDepartmentsByUserId(userId, token) {
    try {
        const response = await axios.get("https://api.qingflow.com/user/" + userId, {
            headers: { accessToken: token }
        });
        return response.data.result.department;
    } catch (error) {
        return { error: '获取部门列表失败: ' + error.message };
    }
}

async function getDepartmentDetails(deptId, token) {
    try {
        const response = await axios.get("https://api.qingflow.com/department/" + deptId, {
            headers: { accessToken: token }
        });
        const result = response.data.result;
        let fullName = result.name;

        // 如果存在父部门，递归获取父部门名称
        if (result.parentId) {
            const parentName = await getDepartmentDetails(result.parentId, token);
            if (parentName.error) return parentName;
            fullName = parentName + "%" + fullName;
        }

        return fullName;
    } catch (error) {
        return { error: '获取部门详情失败: ' + error.message };
    }
}

// ✅ 优化：并行获取所有部门详情
async function getFullDepartmentNames(departmentIds, token) {
    // 使用 Promise.all 并行获取所有部门详情
    const promises = [];
    for (let i = 0; i < departmentIds.length; i++) {
        promises.push(getDepartmentDetails(departmentIds[i], token));
    }
    
    // 等待所有请求完成
    const departmentNames = await Promise.all(promises);
    
    // 检查是否有错误
    for (let i = 0; i < departmentNames.length; i++) {
        if (departmentNames[i].error) {
            return departmentNames[i];
        }
    }
    
    return departmentNames.join('&&&');
}

async function processEmail(email, token) {
    const userId = await getUserIdByEmail(email, token);
    if (userId.error) return userId;

    const departmentIds = await getDepartmentsByUserId(userId, token);
    if (departmentIds.error) return departmentIds;

    const departmentNamesString = await getFullDepartmentNames(departmentIds, token);
    if (departmentNamesString.error) return departmentNamesString;
    
    return { departmentNamesString: departmentNamesString };
}

if (input.email == null) {
    return { departmentNamesString: null };
} else {
    return processEmail(input.email, input.token);
}



