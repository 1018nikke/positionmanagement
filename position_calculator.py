"""
多空通用固定风险比例仓位计算器
仅使用 Python 标准库，无任何第三方依赖
"""


def get_direction() -> int:
    """获取交易方向，1=做多，2=做空"""
    while True:
        raw = input("\n请选择交易方向：1-做多 2-做空\n> ").strip()
        if raw in ("1", "2"):
            return int(raw)
        print("输入错误，请重新输入（仅允许输入 1 或 2）")


def get_positive_float(prompt: str) -> float:
    """获取一个正浮点数，非法则循环重试"""
    while True:
        raw = input(f"\n{prompt}\n> ").strip()
        try:
            val = float(raw)
        except ValueError:
            print("输入错误，请输入一个有效的数字")
            continue
        if val <= 0:
            print("输入错误，数值必须为正数")
            continue
        return val


def get_risk_percentage(prompt: str) -> float:
    """获取风险比例，必须为正数且不超过 100"""
    while True:
        raw = input(f"\n{prompt}\n> ").strip()
        try:
            val = float(raw)
        except ValueError:
            print("输入错误，请输入一个有效的数字")
            continue
        if val <= 0:
            print("输入错误，风险比例必须为正数")
            continue
        if val > 100:
            print("输入错误，风险比例不能超过 100%")
            continue
        return val


def get_stop_price(direction: int, entry_price: float, prompt: str) -> float:
    """获取止损价格，按方向校验逻辑"""
    while True:
        raw = input(f"\n{prompt}\n> ").strip()
        try:
            val = float(raw)
        except ValueError:
            print("输入错误，请输入一个有效的数字")
            continue
        if val <= 0:
            print("输入错误，止损价格必须为正数")
            continue
        if direction == 1:  # 做多
            if val >= entry_price:
                print("做多场景下，止损价格必须严格小于入场价格，请重新输入")
                continue
        else:  # 做空
            if val <= entry_price:
                print("做空场景下，止损价格必须严格大于入场价格，请重新输入")
                continue
        return val


def calculate_position(
    direction: int,
    total_capital: float,
    risk_percent: float,
    entry_price: float,
    stop_price: float,
) -> dict:
    """核心计算逻辑，返回各指标"""
    stop_distance = abs(entry_price - stop_price)
    max_loss = total_capital * (risk_percent / 100)
    position_size = max_loss / stop_distance
    notional_value = position_size * entry_price
    risk_exposure_ratio = (notional_value / total_capital) * 100

    return {
        "stop_distance": stop_distance,
        "max_loss": max_loss,
        "position_size": position_size,
        "notional_value": notional_value,
        "risk_exposure_ratio": risk_exposure_ratio,
    }


def print_result(direction: int, result: dict) -> None:
    """格式化输出计算结果"""
    direction_label = "做多" if direction == 1 else "做空"
    print()  # 输出前空一行
    print(f"交易方向：{direction_label}")
    print(f"停车距离：{result['stop_distance']:.2f} USDT")
    print(f"单笔最大亏损：{result['max_loss']:.2f} USDT")
    print(f"可开仓位数量：{result['position_size']:.4f} 标的本位")
    print(f"持仓名义价值：{result['notional_value']:.2f} USDT")
    print(f"风险敞口占比：{result['risk_exposure_ratio']:.2f} %")


def main() -> None:
    """主流程：分步输入 → 核心计算 → 格式化输出"""
    direction = get_direction()
    total_capital = get_positive_float("账户总资金（USDT）")
    risk_percent = get_risk_percentage("单笔最大风险比例（%）")
    entry_price = get_positive_float("标的入场价格（USDT）")
    stop_price = get_stop_price(direction, entry_price, "标的止损价格（USDT）")

    result = calculate_position(direction, total_capital, risk_percent, entry_price, stop_price)
    print_result(direction, result)

    input("\n按 Enter 键退出...")


if __name__ == "__main__":
    main()