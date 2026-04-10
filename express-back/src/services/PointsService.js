const POINTS_PER_YUAN = 100;
const MIN_POINTS_USAGE = 100;

const parseAmount = value => Number.parseFloat(value || 0) || 0;
const roundMoney = value => Number(parseAmount(value).toFixed(2));

class PointsService {
    static calculateDeduction(requestedPoints, totalAmount, availablePoints) {
        const grossAmount = roundMoney(totalAmount);
        const requested = Math.max(0, Math.floor(Number(requestedPoints || 0)));
        const ownedPoints = Math.max(0, Math.floor(Number(availablePoints || 0)));

        if (requested > 0 && requested < MIN_POINTS_USAGE) {
            throw new Error('积分抵扣至少需要100积分');
        }

        if (requested % POINTS_PER_YUAN !== 0) {
            throw new Error('积分抵扣必须按100积分的整数倍使用');
        }

        const maxPointsByAmount = Math.floor(grossAmount) * POINTS_PER_YUAN;
        const pointsUsed = Math.min(requested, ownedPoints, maxPointsByAmount);

        if (pointsUsed !== requested) {
            if (requested > ownedPoints) {
                throw new Error('积分不足，无法按当前设置抵扣');
            }

            if (requested > maxPointsByAmount) {
                throw new Error('积分抵扣金额不能超过订单实付总额');
            }
        }

        const discountAmount = roundMoney(pointsUsed / POINTS_PER_YUAN);
        const cashPaidAmount = roundMoney(Math.max(grossAmount - discountAmount, 0));

        return {
            points_used: pointsUsed,
            points_discount_amount: discountAmount,
            cash_paid_amount: cashPaidAmount,
            platform_subsidy_amount: discountAmount,
            original_amount: grossAmount,
        };
    }

    static async deductPoints(user, wallet, points, transaction) {
        const amount = Math.max(0, Math.floor(Number(points || 0)));
        if (amount <= 0) return 0;

        if (Number(user.points || 0) < amount || Number(wallet.points || 0) < amount) {
            throw new Error('积分不足');
        }

        await Promise.all([
            user.update(
                {
                    points: Number(user.points || 0) - amount,
                },
                { transaction }
            ),
            wallet.update(
                {
                    points: Number(wallet.points || 0) - amount,
                },
                { transaction }
            ),
        ]);

        return amount;
    }

    static async addPoints(user, wallet, points, transaction) {
        const amount = Math.max(0, Math.floor(Number(points || 0)));
        if (amount <= 0) return 0;

        await Promise.all([
            user.update(
                {
                    points: Number(user.points || 0) + amount,
                },
                { transaction }
            ),
            wallet.update(
                {
                    points: Number(wallet.points || 0) + amount,
                },
                { transaction }
            ),
        ]);

        return amount;
    }

    static calculateRewardPoints(cashPaidAmount) {
        return Math.max(0, Math.floor(parseAmount(cashPaidAmount)));
    }

    static calculateRefundSnapshot(resource, refundAmount) {
        const originalAmount = roundMoney(resource.original_amount || resource.price || 0);
        const currentRefundAmount = roundMoney(resource.refund_amount || 0);
        const refundDelta = roundMoney(refundAmount);
        const nextRefundAmount = roundMoney(currentRefundAmount + refundDelta);
        const refundRatio =
            originalAmount > 0 ? Math.min(nextRefundAmount / originalAmount, 1) : 0;

        const cashPaidAmount = roundMoney(resource.cash_paid_amount || resource.price || 0);
        const pointsUsed = Math.max(0, Math.floor(Number(resource.points_used || 0)));
        const rewardPoints = Math.max(0, Math.floor(Number(resource.reward_points || 0)));

        const targetCashRefund =
            refundRatio >= 1 ? cashPaidAmount : roundMoney(cashPaidAmount * refundRatio);
        const targetReturnedPoints =
            refundRatio >= 1
                ? pointsUsed
                : Math.floor((pointsUsed * refundRatio) / POINTS_PER_YUAN) * POINTS_PER_YUAN;
        const targetRevertedRewardPoints =
            refundRatio >= 1 ? rewardPoints : Math.floor(rewardPoints * refundRatio);

        return {
            refund_ratio: refundRatio,
            next_refund_amount: nextRefundAmount,
            cash_refund_delta: roundMoney(
                targetCashRefund - roundMoney(resource.refunded_cash_amount || 0)
            ),
            points_return_delta: Math.max(
                0,
                targetReturnedPoints - Math.floor(Number(resource.returned_points || 0))
            ),
            reward_revert_delta: Math.max(
                0,
                targetRevertedRewardPoints - Math.floor(Number(resource.reverted_reward_points || 0))
            ),
            target_cash_refund: targetCashRefund,
            target_returned_points: targetReturnedPoints,
            target_reverted_reward_points: targetRevertedRewardPoints,
        };
    }
}

module.exports = PointsService;
