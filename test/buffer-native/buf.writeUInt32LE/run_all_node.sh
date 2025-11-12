#!/bin/bash

echo "Running writeUInt32LE tests..."
echo "=================================="

echo "Part 1: Basic functionality tests"
node part1_basic.js
echo ""

echo "Part 2: Input types tests"
node part2_types.js
echo ""

echo "Part 3: Error handling and boundary tests"
node part3_errors.js
echo ""

echo "Part 4: Combination tests"
node part4_combinations.js
echo ""

echo "Part 5: Edge cases tests"
node part5_edge_cases.js
echo ""

echo "Part 6: Special cases tests"
node part6_special_cases.js
echo ""

echo "Part 7: Performance and memory tests"
node part7_performance.js
echo ""

echo "Part 8: Compatibility tests"
node part8_compatibility.js
echo ""

echo "Part 9: Deep edge cases tests"
node part9_deep_edge_cases.js
echo ""

echo "=================================="
echo "All writeUInt32LE tests completed!"