export type WalletPaymentMethod = 'alipay' | 'wechat' | 'bank_card';

export interface BankOption {
    label: string;
    value: string;
    prefix: string;
    color: string;
    shortName: string;
}

export const bankOptions: BankOption[] = [
    { label: '中国工商银行', value: 'icbc', prefix: 'GS', color: '#D83A35', shortName: 'ICBC' },
    { label: '中国建设银行', value: 'ccb', prefix: 'JS', color: '#2F6BFF', shortName: 'CCB' },
    { label: '中国银行', value: 'boc', prefix: 'CN', color: '#C7373A', shortName: 'BOC' },
    { label: '中国农业银行', value: 'abc', prefix: 'NY', color: '#19B36B', shortName: 'ABC' },
    { label: '招商银行', value: 'cmb', prefix: 'ZS', color: '#FF6B3D', shortName: 'CMB' },
    { label: '交通银行', value: 'bocom', prefix: 'JT', color: '#1F86FF', shortName: 'COMM' },
];

export const alipayPhonePattern = /^1\d{10}$/;
export const bankCardPattern = /^\d{16}$/;

export const formatCurrency = (value: number) => `¥${Number(value || 0).toFixed(2)}`;

export const calculateWithdrawFee = (amount: number) => Math.max(amount * 0.01, 2);

export const findBankOption = (value?: string | null) =>
    bankOptions.find(option => option.value === value) || null;

export const findBankByPrefix = (prefix?: string | null) => {
    if (!prefix) return null;
    return bankOptions.find(option => option.prefix === prefix.toUpperCase()) || null;
};

export const buildBankAccountNo = (bankValue: string, cardNo: string) => {
    const bank = findBankOption(bankValue);
    return bank ? `${bank.prefix}${cardNo}` : cardNo;
};

export const maskBankCard = (cardNo: string) => {
    if (!cardNo) return '';
    return `尾号 ${cardNo.slice(-4)}`;
};

export const maskAccountText = (value?: string | null) => {
    if (!value) return '';

    const raw = String(value).trim();
    if (raw.length <= 4) {
        return raw;
    }

    if (/^\d{11}$/.test(raw)) {
        return `${raw.slice(0, 3)}****${raw.slice(-4)}`;
    }

    if (/^\d{16}$/.test(raw)) {
        return `${raw.slice(0, 4)} **** **** ${raw.slice(-4)}`;
    }

    return `${raw.slice(0, 3)}****${raw.slice(-2)}`;
};

export const formatThirdPartyAccount = (
    paymentMethod?: string | null,
    thirdPartyNo?: string | null
) => {
    if (!paymentMethod || !thirdPartyNo) return '';

    if (paymentMethod === 'bank_card') {
        const prefix = thirdPartyNo.slice(0, 2);
        const cardNo = thirdPartyNo.slice(2);
        const bank = findBankByPrefix(prefix);
        const bankLabel = bank?.label || '银行卡';
        return `${bankLabel} ${maskBankCard(cardNo)}`;
    }

    if (paymentMethod === 'alipay') {
        return `支付宝 ${maskAccountText(thirdPartyNo)}`;
    }

    if (paymentMethod === 'wechat') {
        return `微信支付 ${maskAccountText(thirdPartyNo)}`;
    }

    return maskAccountText(thirdPartyNo);
};
