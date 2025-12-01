#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MBTI自动化测试脚本 - 完整版
功能：自动完成所有92道MBTI测试题目
"""

import csv
import time
import json
import sys
import tty
import termios
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

class MBTIAutoTest:
    def __init__(self, csv_file="测试选择.csv", slow_mode=False):
        self.csv_file = csv_file
        self.slow_mode = slow_mode
        self.test_data = []
        self.driver = None

        # 中文答案映射为数值分数
        self.answer_mapping = {
            "非常不符合": 1,
            "不太符合": 2,
            "一般": 3,
            "比较符合": 4,
            "非常符合": 5
        }

    def wait_for_esc_key(self):
        """等待用户按下ESC键"""
        print("\n🌟 测试完成！浏览器将保持打开状态，按ESC键关闭...")

        # 保存终端设置
        old_settings = termios.tcgetattr(sys.stdin)
        try:
            # 设置非阻塞模式
            tty.setraw(sys.stdin.fileno())

            while True:
                # 等待按键
                ch = sys.stdin.read(1)
                if ch == '\x1b':  # ESC键的ASCII码
                    print("👋 检测到ESC键，准备关闭浏览器...")
                    break
                elif ch == '\x03':  # Ctrl+C
                    print("\n👋 检测到Ctrl+C，准备关闭浏览器...")
                    break
        finally:
            # 恢复终端设置
            termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)

    def load_test_data(self):
        """加载CSV测试数据"""
        try:
            with open(self.csv_file, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    if row.get('题目编号') == '汇总统计':
                        break
                    if row.get('题目编号') and row.get('最终答案'):
                        self.test_data.append({
                            'question_id': int(row['题目编号']),
                            'answer_text': row['最终答案'].strip()
                        })
            print(f"✅ 成功加载 {len(self.test_data)} 道测试题目")
            return True
        except Exception as e:
            print(f"❌ CSV加载失败：{e}")
            return False

    def init_browser(self):
        """初始化浏览器（自动管理ChromeDriver）"""
        try:
            chrome_options = Options()
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.binary_location = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

            # 自动下载和管理ChromeDriver
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.driver.implicitly_wait(10)
            print("🚀 浏览器初始化成功")
            return True
        except Exception as e:
            print(f"❌ 浏览器初始化失败：{e}")
            return False

    def navigate_and_start(self):
        """导航到测试页面并开始"""
        try:
            # 导航到测试页面
            url = "http://127.0.0.1:8000"
            self.driver.get(url)

            # 点击开始测试按钮
            start_btn = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.ID, "start-btn"))
            )
            start_btn.click()

            # 等待题目页面加载
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.ID, "question-screen"))
            )
            print("📝 测试开始！")
            return True
        except Exception as e:
            print(f"❌ 开始测试失败：{e}")
            return False

    def answer_question(self, question_data):
        """回答单道题目"""
        try:
            # 将中文答案转换为数值分数
            answer_value = self.answer_mapping.get(question_data['answer_text'], 3)

            # 分数映射到按钮索引（1-5分对应0-4索引）
            button_index = answer_value - 1
            options = self.driver.find_elements(By.CLASS_NAME, "option")

            if button_index < len(options):
                # 模拟人类操作延迟
                time.sleep(1 if self.slow_mode else 0.3)
                options[button_index].click()
                print(f"  ✅ 第{question_data['question_id']}题: {question_data['answer_text']}")
                return True
            else:
                print(f"  ❌ 第{question_data['question_id']}题: 找不到对应选项")
                return False
        except Exception as e:
            print(f"  ❌ 第{question_data['question_id']}题: {e}")
            return False

    def complete_test(self):
        """完成所有测试题目"""
        print(f"📋 开始处理 {len(self.test_data)} 道题目...")
        start_time = datetime.now()

        for i, question_data in enumerate(self.test_data):
            print(f"🔄 进度: {i+1}/{len(self.test_data)}")

            if self.answer_question(question_data):
                # 等待页面响应（不是最后一题时）
                if i < len(self.test_data) - 1:
                    time.sleep(2 if self.slow_mode else 0.5)

        # 等待结果页面
        try:
            print("⏳ 等待测试结果...")
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.ID, "result-screen"))
            )

            # 获取MBTI结果
            mbti_element = self.driver.find_element(By.ID, "mbti-type")
            mbti_type = mbti_element.text

            # 计算测试时长
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()

            print(f"\n🎉 测试完成！")
            print(f"🏆 MBTI类型: {mbti_type}")
            print(f"⏱️ 总用时: {duration:.1f}秒")

            # 截图保存结果
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            screenshot_path = f"mbti_result_{timestamp}.png"
            self.driver.save_screenshot(screenshot_path)
            print(f"📸 截图已保存: {screenshot_path}")

            # 生成JSON报告
            report = {
                "test_info": {
                    "date": datetime.now().isoformat(),
                    "total_questions": len(self.test_data),
                    "duration_seconds": duration,
                    "mbti_type": mbti_type,
                    "csv_file": self.csv_file
                },
                "expected_result": "ESTP"  # 从CSV汇总统计中得到
            }

            report_path = f"mbti_test_report_{timestamp}.json"
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            print(f"📄 报告已保存: {report_path}")

            # 等待用户按ESC键关闭浏览器
            self.wait_for_esc_key()

            return True
        except Exception as e:
            print(f"❌ 获取结果失败：{e}")
            return False

    def run_test(self):
        """运行完整测试流程"""
        print("🤖 MBTI自动化测试系统启动")
        print("="*50)

        # 1. 加载测试数据
        if not self.load_test_data():
            return False

        # 2. 初始化浏览器
        if not self.init_browser():
            return False

        # 3. 开始测试
        if not self.navigate_and_start():
            return False

        # 4. 完成所有题目
        if not self.complete_test():
            return False

        print("✅ 自动化测试成功完成！")
        return True

    def cleanup(self):
        """清理资源"""
        if self.driver:
            self.driver.quit()
            print("🧹 浏览器已关闭")

def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="MBTI自动化测试脚本")
    parser.add_argument("--csv", default="测试选择.csv", help="CSV测试数据文件")
    parser.add_argument("--slow", action="store_true", help="慢速模式")

    args = parser.parse_args()

    test_runner = MBTIAutoTest(csv_file=args.csv, slow_mode=args.slow)

    try:
        success = test_runner.run_test()
        if not success:
            print("❌ 测试失败")
            exit(1)
    except KeyboardInterrupt:
        print("\n⚠️ 用户中断测试")
    except Exception as e:
        print(f"❌ 意外错误：{e}")
        exit(1)
    finally:
        test_runner.cleanup()

if __name__ == "__main__":
    main()