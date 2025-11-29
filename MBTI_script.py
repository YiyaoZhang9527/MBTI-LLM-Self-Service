# -*- coding: utf-8 -*-
"""
完整 92 道题 MBTI 测试程序
"""
def ask_question(question, reverse=False):
    """
    提示用户输入1-5分
    reverse=True表示反向计分
    """
    while True:
        print(f"\n{question}")
        print("评分：1=非常不符合，2=不太符合，3=一般，4=比较符合，5=非常符合")
        try:
            score = int(input("请输入评分(1-5): "))
            if score < 1 or score > 5:
                print("请输入1到5的数字")
                continue
            if reverse:
                return 6 - score  # 反向计分
            return score
        except ValueError:
            print("请输入1到5的数字")

def mbti_test():
    print("欢迎使用专业版 MBTI 测试！请如实评分每道题。")

    # 每个维度 23 道题，总共 92 道题
    questions = {
        "EI": [
            ("你喜欢参加社交活动并认识新朋友吗？", False),
            ("你更喜欢独处而不是参加聚会吗？", True),
            ("你在聚会中通常主动与人交谈吗？", False),
            ("你觉得长时间与人交流会感到疲惫吗？", True),
            ("你喜欢在大群体中表达自己的意见吗？", False),
            ("你更倾向安静、独自思考而不是活跃社交吗？", True),
            ("你喜欢主动与陌生人交流吗？", False),
            ("你在公共场合容易紧张或不自在吗？", True),
            ("你习惯同时和很多人互动吗？", False),
            ("你更喜欢与熟悉的少数朋友相处吗？", True),
            ("你在讨论中通常率先发言吗？", False),
            ("你喜欢独自完成任务而非团队合作吗？", True),
            ("你在社交场合会感到精力充沛吗？", False),
            ("你更喜欢安静的环境而非喧闹的环境吗？", True),
            ("你喜欢参与群体活动吗？", False),
            ("你倾向独自规划活动而非与别人一起吗？", True),
            ("你喜欢在公众面前展示自己吗？", False),
            ("你不太喜欢频繁社交活动吗？", True),
            ("你在聚会中容易感到精力充沛吗？", False),
            ("你更愿意独自完成工作而非团队合作吗？", True),
            ("你喜欢与陌生人建立联系吗？", False),
            ("你常常觉得社交活动消耗你的精力吗？", True),
            ("你在小组讨论中通常比较活跃吗？", False),
        ],
        "SN": [
            ("你注重实际细节胜过抽象概念吗？", False),
            ("你喜欢探索可能性和未来趋势吗？", True),
            ("你通常根据经验做决策吗？", False),
            ("你更关注事物的潜在意义而非表面事实吗？", True),
            ("你喜欢具体和现实的事物吗？", False),
            ("你会被新想法和创新点吸引吗？", True),
            ("你更倾向依赖已知事实而非猜测推理吗？", False),
            ("你喜欢抽象理论和概念吗？", True),
            ("你注重现实而非想象吗？", False),
            ("你喜欢思考可能性而不是仅仅看到现实吗？", True),
            ("你做事情喜欢循序渐进而非跳跃创新吗？", False),
            ("你对未来趋势和大局有兴趣吗？", True),
            ("你更关注眼前的具体细节吗？", False),
            ("你喜欢探索未知而非重复已知吗？", True),
            ("你更喜欢实际经验而非理论分析吗？", False),
            ("你倾向从灵感和直觉中寻找答案吗？", True),
            ("你通常重视实际情况而非假设情境吗？", False),
            ("你喜欢推演各种可能性吗？", True),
            ("你注重事实和可验证信息吗？", False),
            ("你喜欢思考抽象问题而非现实问题吗？", True),
            ("你更关注细节和可操作步骤吗？", False),
            ("你喜欢从直觉和洞察中获得启发吗？", True),
            ("你习惯从经验出发而非凭空想象吗？", False),
        ],
        "TF": [
            ("你做决策更依赖逻辑而非情感吗？", False),
            ("你会更多考虑他人感受而非理性分析吗？", True),
            ("你在争论中以事实为依据而非感情为依据吗？", False),
            ("你倾向体谅他人情绪而非严格讲道理吗？", True),
            ("你做决定时更注重客观标准吗？", False),
            ("你会更多考虑人际关系而非逻辑推理吗？", True),
            ("你通常用逻辑分析问题而非感情判断吗？", False),
            ("你常被他人感受左右决策吗？", True),
            ("你倾向用理性解决冲突吗？", False),
            ("你更容易被同理心引导而非逻辑引导吗？", True),
            ("你认为事情应按规则和逻辑处理吗？", False),
            ("你会更多考虑和谐与关系吗？", True),
            ("你在决策中重视数据和事实吗？", False),
            ("你会被人际感受影响判断吗？", True),
            ("你倾向用理性解释世界吗？", False),
            ("你更容易受情感驱动做出反应吗？", True),
            ("你更注重公平和原则而非人际情绪吗？", False),
            ("你会考虑他人需求而非只看逻辑吗？", True),
            ("你习惯分析原因和逻辑而非感情吗？", False),
            ("你在处理人际关系时会更多感性判断吗？", True),
            ("你倾向客观评估他人而非同理心感受吗？", False),
            ("你会被他人情绪影响决定吗？", True),
            ("你做决定通常以逻辑为主而非情感为主吗？", False),
        ],
        "JP": [
            ("你喜欢计划安排而不是临时应变吗？", False),
            ("你更喜欢灵活应对而不是严格计划吗？", True),
            ("你通常按日程和计划行事吗？", False),
            ("你更喜欢随遇而安吗？", True),
            ("你喜欢提前安排活动吗？", False),
            ("你习惯临时决定而非提前计划吗？", True),
            ("你做事有条理和组织吗？", False),
            ("你喜欢随机应变而非固定流程吗？", True),
            ("你喜欢设定明确目标并完成吗？", False),
            ("你更喜欢即兴处理事情吗？", True),
            ("你倾向按计划完成任务吗？", False),
            ("你会根据情况调整计划吗？", True),
            ("你喜欢掌控事情进程吗？", False),
            ("你在行动上更随性和灵活吗？", True),
            ("你通常按时间表行事吗？", False),
            ("你更愿意顺其自然而不是严格安排吗？", True),
            ("你喜欢组织和安排生活吗？", False),
            ("你更喜欢随机决策吗？", True),
            ("你在工作中有条理吗？", False),
            ("你容易被变化打乱计划吗？", True),
            ("你喜欢提前计划而非临时应付吗？", False),
            ("你通常按计划推进任务吗？", False),
            ("你在生活中灵活应对变化吗？", True),
        ]
    }

    # 初始化分数
    scores = {"E":0, "I":0, "S":0, "N":0, "T":0, "F":0, "J":0, "P":0}

    # 遍历每个维度
    for dimension, qs in questions.items():
        for q, reverse in qs:
            score = ask_question(q, reverse)
            if dimension == "EI":
                scores["E"] += score
                scores["I"] += 6 - score
            elif dimension == "SN":
                scores["S"] += score
                scores["N"] += 6 - score
            elif dimension == "TF":
                scores["T"] += score
                scores["F"] += 6 - score
            elif dimension == "JP":
                scores["J"] += score
                scores["P"] += 6 - score

    # 计算百分比
    def calc_percentage(a, b):
        total = a + b
        if total == 0: return 50
        return round(a / total * 100, 1)

    EI_percent = calc_percentage(scores["E"], scores["I"])
    SN_percent = calc_percentage(scores["S"], scores["N"])
    TF_percent = calc_percentage(scores["T"], scores["F"])
    JP_percent = calc_percentage(scores["J"], scores["P"])

    # 生成四字母MBTI
    mbti = ""
    mbti += "E" if scores["E"] >= scores["I"] else "I"
    mbti += "S" if scores["S"] >= scores["N"] else "N"
    mbti += "T" if scores["T"] >= scores["F"] else "F"
    mbti += "J" if scores["J"] >= scores["P"] else "P"

    print("\n==== 测试结果 ====")
    print(f"你的 MBTI 类型：{mbti}")
    print(f"E/I 偏向: {EI_percent}% E / {100-EI_percent}% I")
    print(f"S/N 偏向: {SN_percent}% S / {100-SN_percent}% N")
    print(f"T/F 偏向: {TF_percent}% T / {100-TF_percent}% F")
    print(f"J/P 偏向: {JP_percent}% J / {100-JP_percent}% P")

if __name__ == "__main__":
    mbti_test()