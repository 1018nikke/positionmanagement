"""
仓位计算器测试脚本
包含：核心逻辑单元测试 + 交互流程集成测试
"""
import subprocess
import sys
import math
from typing import List


# ─── 单元测试：直接验证核心计算逻辑 ─────────────────────────────

def test_calc_long():
    """做多场景：正常计算"""
    from position_calculator import calculate_position

    r = calculate_position(direction=1, total_capital=10000, risk_percent=2,
                           entry_price=50000, stop_price=48000)

    assert math.isclose(r["stop_distance"], 2000, rel_tol=1e-9), f"停车距离={r['stop_distance']}"
    assert math.isclose(r["max_loss"], 200, rel_tol=1e-9), f"最大亏损={r['max_loss']}"
    assert math.isclose(r["position_size"], 0.1, rel_tol=1e-9), f"仓位数量={r['position_size']}"
    assert math.isclose(r["notional_value"], 5000, rel_tol=1e-9), f"名义价值={r['notional_value']}"
    assert math.isclose(r["risk_exposure_ratio"], 50, rel_tol=1e-9), f"风险敞口={r['risk_exposure_ratio']}"
    print("[PASS] test_calc_long")


def test_calc_short():
    """做空场景：正常计算"""
    from position_calculator import calculate_position

    r = calculate_position(direction=2, total_capital=5000, risk_percent=1,
                           entry_price=2000, stop_price=2100)

    assert math.isclose(r["stop_distance"], 100, rel_tol=1e-9)
    assert math.isclose(r["max_loss"], 50, rel_tol=1e-9)
    assert math.isclose(r["position_size"], 0.5, rel_tol=1e-9)
    assert math.isclose(r["notional_value"], 1000, rel_tol=1e-9)
    assert math.isclose(r["risk_exposure_ratio"], 20, rel_tol=1e-9)
    print("[PASS] test_calc_short")


def test_calc_small_values():
    """小数值场景"""
    from position_calculator import calculate_position

    r = calculate_position(direction=1, total_capital=100, risk_percent=0.5,
                           entry_price=0.5, stop_price=0.4)

    assert math.isclose(r["stop_distance"], 0.1, rel_tol=1e-9)
    assert math.isclose(r["max_loss"], 0.5, rel_tol=1e-9)
    assert math.isclose(r["position_size"], 5.0, rel_tol=1e-9)
    assert math.isclose(r["notional_value"], 2.5, rel_tol=1e-9)
    assert math.isclose(r["risk_exposure_ratio"], 2.5, rel_tol=1e-9)
    print("[PASS] test_calc_small_values")


def test_calc_large_values():
    """大数值场景"""
    from position_calculator import calculate_position

    r = calculate_position(direction=1, total_capital=1_000_000, risk_percent=10,
                           entry_price=100_000, stop_price=99_000)

    assert math.isclose(r["stop_distance"], 1000, rel_tol=1e-9)
    assert math.isclose(r["max_loss"], 100_000, rel_tol=1e-9)
    assert math.isclose(r["position_size"], 100.0, rel_tol=1e-9)
    assert math.isclose(r["notional_value"], 10_000_000, rel_tol=1e-9)
    assert math.isclose(r["risk_exposure_ratio"], 1000, rel_tol=1e-9)
    print("[PASS] test_calc_large_values")


def test_calc_max_risk():
    """风险比例=100% 边界场景"""
    from position_calculator import calculate_position

    r = calculate_position(direction=1, total_capital=1000, risk_percent=100,
                           entry_price=10, stop_price=5)

    assert math.isclose(r["max_loss"], 1000, rel_tol=1e-9)
    assert math.isclose(r["stop_distance"], 5, rel_tol=1e-9)
    assert math.isclose(r["position_size"], 200, rel_tol=1e-9)
    print("[PASS] test_calc_max_risk")


def test_calc_many_decimal_places():
    """多位小数精度场景"""
    from position_calculator import calculate_position

    r = calculate_position(direction=2, total_capital=1234.56, risk_percent=3.33,
                           entry_price=45.678, stop_price=47.890)

    # 手动验证
    expected_stop = abs(45.678 - 47.890)          # 2.212
    expected_loss = 1234.56 * (3.33 / 100)         # ~41.110848
    expected_size = expected_loss / expected_stop   # ~18.585...
    expected_notional = expected_size * 45.678      # ~849.1...

    assert math.isclose(r["stop_distance"], expected_stop, rel_tol=1e-9)
    assert math.isclose(r["max_loss"], expected_loss, rel_tol=1e-9)
    assert math.isclose(r["position_size"], expected_size, rel_tol=1e-9)
    assert math.isclose(r["notional_value"], expected_notional, rel_tol=1e-9)
    print("[PASS] test_calc_many_decimal_places")


# ─── 集成测试：模拟完整交互流程 ────────────────────────────────

def run_interactive(inputs: List[str]) -> str:
    """通过 subprocess 运行主程序，返回 stdout"""
    proc = subprocess.run(
        [sys.executable, "-c",
         "from position_calculator import main; main()"],
        input="\n".join(inputs),
        capture_output=True,
        text=True,
        cwd=r"d:\traework\position management",
    )
    return proc.stdout + proc.stderr


def test_flow_normal_long():
    """正常做多流程"""
    out = run_interactive(["1", "10000", "2", "50000", "48000"])
    assert "做多" in out
    assert "停车距离：2000.00" in out
    assert "单笔最大亏损：200.00" in out
    assert "可开仓位数量：0.1000" in out
    assert "持仓名义价值：5000.00" in out
    assert "风险敞口占比：50.00" in out
    print("[PASS] test_flow_normal_long")


def test_flow_normal_short():
    """正常做空流程"""
    out = run_interactive(["2", "5000", "1", "2000", "2100"])
    assert "做空" in out
    assert "停车距离：100.00" in out
    assert "单笔最大亏损：50.00" in out
    assert "可开仓位数量：0.5000" in out
    assert "持仓名义价值：1000.00" in out
    assert "风险敞口占比：20.00" in out
    print("[PASS] test_flow_normal_short")


def test_flow_invalid_direction():
    """非法方向 → 合法后继续"""
    out = run_interactive(["3", "abc", "1", "10000", "2", "50000", "48000"])
    assert "仅允许输入 1 或 2" in out
    assert "做多" in out
    assert "200.00" in out
    print("[PASS] test_flow_invalid_direction")


def test_flow_invalid_capital():
    """非法资金 → 合法后继续"""
    out = run_interactive(["1", "-100", "0", "abc", "10000", "2", "50000", "48000"])
    assert "数值必须为正数" in out
    assert "请输入一个有效的数字" in out
    assert "做多" in out
    assert "200.00" in out
    print("[PASS] test_flow_invalid_capital")


def test_flow_invalid_risk():
    """非法风险比例 → 合法后继续（超过100、负数、非数字）"""
    # 按顺序输入：方向(做多)、本金、风险200%（超限，触发错误）→ -5（负数，触发错误）→ abc（非数字，触发错误）
    # → 2（合法风险比例）→ 入场价50000 → 止损价48000
    out = run_interactive(["1", "10000", "200", "-5", "abc", "2", "50000", "48000"])
    assert "风险比例不能超过 100%" in out      # 验证超过100%的错误提示
    assert "风险比例必须为正数" in out         # 验证负数的错误提示
    assert "请输入一个有效的数字" in out        # 验证非数字输入的错误提示
    assert "持仓名义价值：5000.00" in out      # 验证合法输入后正确计算出结果
    print("[PASS] test_flow_invalid_risk")


def test_flow_long_stop_too_high():
    """做多：止损 ≥ 入场 → 重新输入"""
    out = run_interactive(["1", "10000", "2", "50000", "50000", "51000", "48000"])
    assert "止损价格必须严格小于入场价格" in out
    assert "做多" in out
    assert "200.00" in out
    print("[PASS] test_flow_long_stop_too_high")


def test_flow_short_stop_too_low():
    """做空：止损 ≤ 入场 → 重新输入"""
    out = run_interactive(["2", "5000", "1", "2000", "2000", "1900", "2100"])
    assert "止损价格必须严格大于入场价格" in out
    assert "做空" in out
    assert "50.00" in out
    print("[PASS] test_flow_short_stop_too_low")


def test_flow_stop_non_numeric():
    """止损输入非数字 → 重新输入"""
    out = run_interactive(["2", "5000", "1", "2000", "abc", "2100"])
    assert "请输入一个有效的数字" in out
    assert "50.00" in out
    print("[PASS] test_flow_stop_non_numeric")


def test_flow_stop_negative():
    """止损输入负数 → 重新输入"""
    out = run_interactive(["1", "10000", "2", "50000", "-1", "48000"])
    assert "止损价格必须为正数" in out
    assert "200.00" in out
    print("[PASS] test_flow_stop_negative")


# ─── 入口 ─────────────────────────────────────────────────────

def run_all():
    tests = [
        # 单元测试
        test_calc_long,
        test_calc_short,
        test_calc_small_values,
        test_calc_large_values,
        test_calc_max_risk,
        test_calc_many_decimal_places,
        # 集成测试
        test_flow_normal_long,
        test_flow_normal_short,
        test_flow_invalid_direction,
        test_flow_invalid_capital,
        test_flow_invalid_risk,
        test_flow_long_stop_too_high,
        test_flow_short_stop_too_low,
        test_flow_stop_non_numeric,
        test_flow_stop_negative,
    ]
    passed = 0
    failed = 0
    for t in tests:
        try:
            t()
            passed += 1
        except Exception as e:
            print(f"[FAIL] {t.__name__}: {e}")
            failed += 1
    print(f"\n{'=' * 40}")
    print(f"总计: {len(tests)}  通过: {passed}  失败: {failed}")
    return failed == 0


if __name__ == "__main__":
    success = run_all()
    sys.exit(0 if success else 1)