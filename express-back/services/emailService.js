const transporter = require('../config/mail');
const redis = require('../config/redis');

const VERIFY_CODE_TTL = Number(process.env.VERIFICATION_CODE_TTL || 300);
const VERIFY_CODE_COOLDOWN = Number(process.env.VERIFICATION_CODE_COOLDOWN || 60);


class ServiceError extends Error {
    constructor(message, status = 500, extra = {}) {
        super(message);
        this.name = 'ServiceError';
        this.status = status;
        Object.assign(this, extra);
    }
}

function normalizeEmail(email) {
    return String(email || '')
        .trim()
        .toLowerCase();
}

function getCodeKey(email) {
    return `email:verify:code:${normalizeEmail(email)}`;
}

function getCooldownKey(email) {
    return `email:verify:cooldown:${normalizeEmail(email)}`;
}

function generateVerifyCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const MAIL_BRAND_NAME = '校园服务平台';

function buildEmailLayout({ eyebrow, title, intro, body, footerNote }) {
    return `
    <div style="margin:0;padding:24px 16px;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;border-collapse:collapse;">

        <tr>
          <td style="padding:0 0 12px 0;text-align:center;">
            <span style="font-size:13px;font-weight:600;color:#6b7280;letter-spacing:0.04em;">
              ${escapeHtml(MAIL_BRAND_NAME)}
            </span>
          </td>
        </tr>

        <tr>
          <td style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

            <!-- 顶部标题区 -->
            <div style="padding:24px 28px 20px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
              <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;font-weight:600;margin-bottom:8px;">
                ${escapeHtml(eyebrow)}
              </div>
              <div style="font-size:20px;font-weight:600;color:#111827;margin-bottom:6px;">
                ${escapeHtml(title)}
              </div>
              <div style="font-size:13px;color:#6b7280;line-height:1.7;">
                ${escapeHtml(intro)}
              </div>
            </div>

            <!-- 正文区 -->
            <div style="padding:24px 28px 8px;color:#374151;font-size:14px;line-height:1.8;">
              ${body}
            </div>

            <!-- 底部提示 -->
            <div style="padding:0 28px 24px;">
              <div style="padding:14px 16px;border-radius:10px;background:#f9fafb;border:1px solid #e5e7eb;color:#9ca3af;font-size:12px;line-height:1.7;">
                ${footerNote}
              </div>
            </div>

          </td>
        </tr>

        <tr>
          <td style="padding:14px 0 0;text-align:center;color:#9ca3af;font-size:12px;">
            此邮件由系统自动发送，请勿直接回复。
          </td>
        </tr>

      </table>
    </div>
  `;
}

function buildVerifyCodeEmail(code) {
    return buildEmailLayout({
        eyebrow: 'Email Verification',
        title: '邮箱验证码',
        intro: '请使用下方验证码完成身份校验，本次验证码仅用于当前操作。',
        body: `
      <p style="margin:0 0 12px 0;color:#6b7280;">你的本次验证码为：</p>

      <div style="margin:0 0 16px;padding:20px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;text-align:center;">
        <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#111827;font-variant-numeric:tabular-nums;">
          ${escapeHtml(code)}
        </div>
      </div>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;">
        <tr>
          <td style="padding:12px 14px;border-radius:10px;background:#f9fafb;border:1px solid #e5e7eb;">
            <div style="font-size:11px;color:#9ca3af;letter-spacing:0.04em;">有效时间</div>
            <div style="margin-top:3px;font-size:14px;font-weight:600;color:#111827;">5 分钟内有效</div>
          </td>
          <td width="10"></td>
          <td style="padding:12px 14px;border-radius:10px;background:#f9fafb;border:1px solid #e5e7eb;">
            <div style="font-size:11px;color:#9ca3af;letter-spacing:0.04em;">安全提示</div>
            <div style="margin-top:3px;font-size:14px;font-weight:600;color:#111827;">请勿转发他人</div>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 16px;color:#6b7280;">如果不是你本人发起本次操作，请直接忽略这封邮件。</p>
    `,
        footerNote: '验证码具有时效性，请尽快完成验证。多次发送时，请以最新收到的验证码为准。',
    });
}

function buildAdminActionNoticeEmail({ title, intro, actionLabel, details = [], footerNote }) {
    const detailRows = details
        .filter(item => item && item.label && item.value)
        .map(
            item => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:12px;color:#9ca3af;width:110px;">
          ${escapeHtml(item.label)}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;color:#111827;">
          ${escapeHtml(item.value)}
        </td>
      </tr>
    `
        )
        .join('');

    return buildEmailLayout({
        eyebrow: 'Admin Notice',
        title,
        intro,
        body: `
      <p style="margin:0 0 12px 0;color:#6b7280;">本次处理结果如下：</p>

      <div style="margin:0 0 16px;padding:20px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;text-align:center;">
        <div style="font-size:24px;font-weight:700;letter-spacing:2px;color:#111827;">
          ${escapeHtml(actionLabel)}
        </div>
      </div>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;border-collapse:collapse;">
        ${detailRows}
      </table>

      <p style="margin:0 0 16px;color:#6b7280;">如对本次处理有疑问，请联系平台客服核实。</p>
    `,
        footerNote:
            footerNote || '该邮件用于通知管理员处理结果，请以站内消息和平台页面展示信息为准。',
    });
}

function buildResetPasswordEmail(resetUrl, expireMinutes) {
    return buildEmailLayout({
        eyebrow: 'Password Recovery',
        title: '重置登录密码',
        intro: '我们收到了你的密码重置请求，请点击下方按钮继续完成密码设置。',
        body: `
      <p style="margin:0 0 16px;color:#6b7280;">点击下面按钮即可进入密码重置页面：</p>

      <div style="margin:0 0 16px;">
        <a href="${escapeHtml(resetUrl)}"
           target="_blank"
           rel="noopener noreferrer"
           style="display:inline-block;padding:11px 20px;border-radius:10px;background:#111827;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
          立即重置密码 →
        </a>
      </div>

      <div style="margin:0 0 16px;padding:12px 14px;border-radius:10px;background:#f9fafb;border:1px solid #e5e7eb;">
        <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">链接地址</div>
        <div style="word-break:break-all;font-size:12px;color:#2563eb;line-height:1.6;">
          ${escapeHtml(resetUrl)}
        </div>
      </div>

      <p style="margin:0 0 16px;color:#6b7280;">
        链接将在 <strong style="color:#111827;">${escapeHtml(String(expireMinutes))} 分钟</strong> 后失效。若非本人操作，请忽略本邮件并及时检查账号安全。
      </p>
    `,
        footerNote:
            '出于安全考虑，密码重置链接仅可在短时间内使用一次。如链接失效，请重新发起找回密码。',
    });
}

function buildSecurityNoticeEmail({ title, intro, details = [], footerNote }) {
    const detailRows = details
        .filter(item => item && item.label && item.value)
        .map(
            item => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:12px;color:#9ca3af;width:110px;">
                    ${escapeHtml(item.label)}
                  </td>
                  <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;color:#111827;">
                    ${escapeHtml(item.value)}
                  </td>
                </tr>
            `
        )
        .join('');

    return buildEmailLayout({
        eyebrow: 'Security Notice',
        title,
        intro,
        body: `
          <p style="margin:0 0 16px;color:#6b7280;">本次安全操作明细如下：</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;border-collapse:collapse;">
            ${detailRows}
          </table>
          <p style="margin:0 0 16px;color:#6b7280;">
            如果不是你本人操作，请立即修改登录密码，并尽快联系平台处理。
          </p>
        `,
        footerNote:
            footerNote || '为保护账号安全，建议定期检查邮箱验证状态、登录密码和支付密码设置。',
    });
}

async function sendVerifyCode(email) {
    const normalizedEmail = normalizeEmail(email);
    const cooldownKey = getCooldownKey(normalizedEmail);
    const codeKey = getCodeKey(normalizedEmail);

    const cooldownTtl = await redis.ttl(cooldownKey);
    if (cooldownTtl > 0) {
        throw new ServiceError(`验证码发送过于频繁，请${cooldownTtl}秒后再试`, 429, {
            retryAfter: cooldownTtl,
        });
    }

    const code = generateVerifyCode();
    const from = process.env.MAIL_FROM || process.env.MAIL_USER;

    if (!from) {
        throw new ServiceError('邮件服务配置不完整，请检查 MAIL_FROM 或 MAIL_USER', 500);
    }

    await transporter.sendMail({
        from,
        to: normalizedEmail,
        subject: '邮箱验证码',
        text: `您的验证码是 ${code}，5分钟内有效。若非本人操作，请忽略此邮件。`,
        html: buildVerifyCodeEmail(code),
    });

    await redis
        .multi()
        .set(codeKey, code, 'EX', VERIFY_CODE_TTL)
        .set(cooldownKey, '1', 'EX', VERIFY_CODE_COOLDOWN)
        .exec();

    return {
        email: normalizedEmail,
        expiresIn: VERIFY_CODE_TTL,
        cooldown: VERIFY_CODE_COOLDOWN,
    };
}

async function verifyCode(email, code) {
    const normalizedEmail = normalizeEmail(email);
    const codeKey = getCodeKey(normalizedEmail);
    const savedCode = await redis.get(codeKey);

    if (!savedCode) {
        throw new ServiceError('验证码不存在或已过期', 400);
    }

    if (savedCode !== String(code || '').trim()) {
        throw new ServiceError('验证码错误', 400);
    }

    await redis.del(codeKey);

    return {
        email: normalizedEmail,
        verified: true,
    };
}

async function sendSecurityNotice(email, { subject, title, intro, details = [], text, footerNote }) {
    const normalizedEmail = normalizeEmail(email);
    const from = process.env.MAIL_FROM || process.env.MAIL_USER;

    if (!normalizedEmail || !from) {
        return false;
    }

    await transporter.sendMail({
        from,
        to: normalizedEmail,
        subject,
        text:
            text ||
            `${title}\n${intro}\n${details.map(item => `${item.label}: ${item.value}`).join('\n')}\n如果不是你本人操作，请立即检查账号安全。`,
        html: buildSecurityNoticeEmail({
            title,
            intro,
            details,
            footerNote,
        }),
    });

    return true;
}

async function sendAdminActionNotice(
    email,
    { subject, title, intro, actionLabel, details = [], text, footerNote }
) {
    const normalizedEmail = normalizeEmail(email);
    const from = process.env.MAIL_FROM || process.env.MAIL_USER;

    if (!normalizedEmail || !from) {
        return false;
    }

    await transporter.sendMail({
        from,
        to: normalizedEmail,
        subject,
        text:
            text ||
            `${title}\n${intro}\n${details.map(item => `${item.label}: ${item.value}`).join('\n')}\n如有疑问，请联系平台客服。`,
        html: buildAdminActionNoticeEmail({
            title,
            intro,
            actionLabel,
            details,
            footerNote,
        }),
    });

    return true;
}

module.exports = {
    sendVerifyCode,
    verifyCode,
    ServiceError,
    buildResetPasswordEmail,
    sendSecurityNotice,
    sendAdminActionNotice,
};
