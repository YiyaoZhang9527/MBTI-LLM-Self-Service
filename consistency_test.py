#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试JavaScript计分逻辑与Python版本的一致性
"""

def test_scoring_consistency():
    # 模拟几个题目的测试数据
    test_questions = [
        ("EI", "你喜欢社交吗？", False),
        ("EI", "你喜欢独处吗？", True),
        ("SN", "你注重实际吗？", False),
        ("SN", "你喜欢想象吗？", True)
    ]

    # 模拟答案 (1-5分)
    test_answers = [4, 2, 3, 4]

    # Python版本计分
    scores_py = {"E":0, "I":0, "S":0, "N":0, "T":0, "F":0, "J":0, "P":0}

    for i, (dimension, question, reverse) in enumerate(test_questions):
        score = test_answers[i]
        if reverse:
            score = 6 - score

        if dimension == "EI":
            scores_py["E"] += score
            scores_py["I"] += 6 - score
        elif dimension == "SN":
            scores_py["S"] += score
            scores_py["N"] += 6 - score

    # 计算百分比
    def calc_percentage(a, b):
        total = a + b
        if total == 0: return 50
        return round(a / total * 100, 1)

    ei_py = calc_percentage(scores_py["E"], scores_py["I"])
    sn_py = calc_percentage(scores_py["S"], scores_py["N"])

    # 生成MBTI类型
    mbti_py = ""
    mbti_py += "E" if scores_py["E"] >= scores_py["I"] else "I"
    mbti_py += "S" if scores_py["S"] >= scores_py["N"] else "N"

    print("=== Python版本计分结果 ===")
    print(f"分数: {scores_py}")
    print(f"MBTI类型: {mbti_py}")
    print(f"E/I: {ei_py}% / {100-ei_py}%")
    print(f"S/N: {sn_py}% / {100-sn_py}%")

    # JavaScript版本预期逻辑
    # 创建对应的CSV数据
    csv_data = """id,dimension,question,reverse
1,EI,你喜欢社交吗？,false
2,EI,你喜欢独处吗？,true
3,SN,你注重实际吗？,false
4,SN,你喜欢想象吗？,true"""

    # 保存为测试文件
    with open("test_questions.csv", "w", encoding="utf-8") as f:
        f.write(csv_data)

    print("\n=== 测试数据已生成 ===")
    print("请在浏览器中打开 test.html 验证JavaScript版本的计分结果")
    print(f"预期结果: MBTI类型={mbti_py}, E/I={ei_py}%, S/N={sn_py}%")

if __name__ == "__main__":
    test_scoring_consistency()