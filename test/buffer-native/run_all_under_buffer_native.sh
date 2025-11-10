#!/usr/bin/env bash
# 注意：不使用 set -e，因为我们需要继续执行所有测试即使某些失败
set -uo pipefail

# 用法：
# 1) 把本脚本保存为 run_all_under_buffer_native.sh，并放在 buffer-native 目录下运行；
#    或者：bash run_all_under_buffer_native.sh /Users/Code/Go-product/Flow-codeblock_goja/test/buffer-native
#
# 2) 它会按字典序逐一执行每个 run_all_tests.sh，最后汇总并列出失败脚本。

ROOT="${1:-$(pwd)}"
if [[ ! -d "$ROOT" ]]; then
  echo "目录不存在：$ROOT" >&2
  exit 1
fi

# 进入根目录，确保相对路径一致
cd "$ROOT"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

listfile="$tmpdir/list.txt"
# 生成脚本清单（字典序），兼容 macOS：find -> sort -> 文件
find . -type f -name 'run_all_tests.sh' -print | LC_ALL=C sort > "$listfile"

if [[ ! -s "$listfile" ]]; then
  echo "未找到任何 run_all_tests.sh"
  exit 0
fi

grand_total=0
grand_pass=0
grand_fail=0
declare -a failed_scripts=()

# 逐个脚本执行（严格顺序）
while IFS= read -r script; do
  # 规范化路径 & 日志
  script_path="$script"
  # 去掉开头的 "./"
  rel="${script_path#./}"
  dir="$(dirname "$rel")"
  logfile="$tmpdir/$(echo "$rel" | tr '/ ' '__').log"

  # 确保可执行
  chmod +x "$script_path" 2>/dev/null || true

  # 视觉分隔（不改变脚本自身输出）
  echo "========================================================================"
  echo "运行目录：$dir"
  echo "脚本：$rel"
  echo "========================================================================"

  # 执行，并把原始输出完整保存与直出
  bash "$script_path" 2>&1 | tee "$logfile"
  status="${PIPESTATUS[0]}"

  # 解析当前脚本的统计
  # 优先取「总测试数/总通过/总失败」（最后一次出现为准）
  # 兼容多种格式：
  # 1. 总测试数: 679 / 总通过: 679 / 总失败: 0
  # 2. 总测试数: 148 / 通过: 148 / 失败: 0
  # 3. 测试数: N / 通过: N / 失败: N (需要累加)
  
  # 尝试匹配 "总测试数:" 或 "总测试数:"
  total=$(grep -E '^[[:space:]]*(总测试数|总测试数)[[:space:]]*:' "$logfile" | awk -F':' 'END{gsub(/[[:space:]]/,"",$2); print ($2==""?0:$2)+0}')
  pass=$(grep -E '^[[:space:]]*(总通过|通过)[[:space:]]*:' "$logfile" | awk -F':' 'END{gsub(/[[:space:]]/,"",$2); print ($2==""?0:$2)+0}')
  fail=$(grep -E '^[[:space:]]*(总失败|失败)[[:space:]]*:' "$logfile" | awk -F':' 'END{gsub(/[[:space:]]/,"",$2); print ($2==""?0:$2)+0}')

  # 如果没有找到总计，则尝试累加所有 "测试数/通过/失败"
  if [[ "${total:-0}" -eq 0 && "${pass:-0}" -eq 0 && "${fail:-0}" -eq 0 ]]; then
    total=$(grep -E '^[[:space:]]*测试数[[:space:]]*:' "$logfile" | awk -F':' '{gsub(/[[:space:]]/,"",$2); s+=$2} END{print s+0}')
    pass=$(grep -E '^[[:space:]]*通过[[:space:]]*:' "$logfile" | awk -F':' '{gsub(/[[:space:]]/,"",$2); s+=$2} END{print s+0}')
    fail=$(grep -E '^[[:space:]]*失败[[:space:]]*:' "$logfile" | awk -F':' '{gsub(/[[:space:]]/,"",$2); s+=$2} END{print s+0}')
  fi

  # 汇总到全局
  grand_total=$(( grand_total + total ))
  grand_pass=$(( grand_pass + pass ))
  grand_fail=$(( grand_fail + fail ))

  # 判定是否失败（非 0 退出码 或 任意失败数 > 0）
  if [[ "$status" -ne 0 || "$fail" -gt 0 ]]; then
    failed_scripts+=("$rel")
  fi

  # 脚本尾部分隔线
  echo
done < "$listfile"

# 打印总体统计
echo "=========================================="
echo "总体统计"
echo "=========================================="
echo "总测试数: $grand_total"
echo "总通过: $grand_pass"
echo "总失败: $grand_fail"
# 成功率计算（避免 awk printf 语法错误）
if [[ "$grand_total" -gt 0 ]]; then
  rate=$(awk -v p="$grand_pass" -v t="$grand_total" 'BEGIN { printf("%.2f", (p/t)*100) }')
else
  rate="0.00"
fi
echo "总成功率: ${rate}%"
echo

# 统一输出失败脚本清单
if [[ "${#failed_scripts[@]}" -eq 0 ]]; then
  echo "🎉 所有测试全部通过！"
else
  echo "❌ 存在失败的脚本（按字典序）："
  for s in "${failed_scripts[@]}"; do
    echo "- $s"
  done
  # 退出码置为 1，方便 CI 捕获失败
  exit 1
fi