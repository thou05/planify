import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'node:net';
import * as tls from 'node:tls';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private readonly smtpHost: string;
  private readonly smtpPort: number;
  private readonly smtpUser: string;
  private readonly smtpPass: string;
  private readonly smtpFrom: string;
  private readonly smtpSecure: boolean;

  constructor(private readonly configService: ConfigService) {
    this.smtpHost =
      this.configService.get<string>('SMTP_HOST') ||
      process.env.SMTP_HOST ||
      '';
    this.smtpPort = Number(
      this.configService.get<number>('SMTP_PORT') ||
      process.env.SMTP_PORT ||
      587,
    );
    this.smtpUser =
      this.configService.get<string>('SMTP_USER') ||
      process.env.SMTP_USER ||
      '';
    this.smtpPass =
      this.configService.get<string>('SMTP_PASS') ||
      process.env.SMTP_PASS ||
      '';
    this.smtpFrom =
      this.configService.get<string>('SMTP_FROM') ||
      process.env.SMTP_FROM ||
      `Planify <${this.smtpUser}>`;
    this.smtpSecure =
      this.configService.get<string>('SMTP_SECURE') === 'true' ||
      this.smtpPort === 465;

    if (!this.smtpHost || !this.smtpUser || !this.smtpPass) {
      this.logger.warn(
        'SMTP chưa được cấu hình đầy đủ. Không thể gửi email OTP.',
      );
    } else {
      this.logger.log(
        `📧 SMTP Service đã sẵn sàng: ${this.smtpHost}:${this.smtpPort} (From: ${this.smtpFrom})`,
      );
    }
  }

  /**
   * Gửi mã OTP xác thực đăng ký tài khoản
   */
  async sendRegisterOtp(toEmail: string, otp: string, name?: string) {
    const title = 'Xác thực tài khoản Planify';
    const description = `Xin chào ${name ? `<strong>${name}</strong>` : 'bạn'}, cảm ơn bạn đã đăng ký tham gia Planify! Vui lòng sử dụng mã xác thực bên dưới để hoàn tất kích hoạt tài khoản của mình:`;

    const html = this.buildOtpEmailTemplate({
      title,
      description,
      otp,
      badgeText: 'XÁC THỰC ĐĂNG KÝ',
      email: toEmail,
    });

    return this.sendOtpEmail({
      to: toEmail,
      subject: `[Planify] Mã xác thực đăng ký tài khoản: ${otp}`,
      html,
      otp,
      purpose: 'XÁC THỰC ĐĂNG KÝ',
      recipientName: name,
    });
  }

  /**
   * Gửi mã OTP khôi phục mật khẩu
   */
  async sendForgotPasswordOtp(toEmail: string, otp: string, name?: string) {
    const title = 'Đặt lại mật khẩu Planify';
    const description = `Xin chào ${name ? `<strong>${name}</strong>` : 'bạn'}, chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhập mã OTP bên dưới để tiến hành tạo mật khẩu mới:`;

    const html = this.buildOtpEmailTemplate({
      title,
      description,
      otp,
      badgeText: 'ĐẶT LẠI MẬT KHẨU',
      email: toEmail,
    });

    return this.sendOtpEmail({
      to: toEmail,
      subject: `[Planify] Mã xác thực đặt lại mật khẩu: ${otp}`,
      html,
      otp,
      purpose: 'ĐẶT LẠI MẬT KHẨU',
      recipientName: name,
    });
  }

  /**
   * Chỉ báo thành công khi máy chủ SMTP chấp nhận email.
   */
  private async sendOtpEmail(params: {
    to: string;
    subject: string;
    html: string;
    otp: string;
    purpose: string;
    recipientName?: string;
  }): Promise<{ success: boolean; message: string }> {
    const { to, subject, html } = params;

    if (!this.smtpHost || !this.smtpUser || !this.smtpPass) {
      throw new ServiceUnavailableException(
        'Dịch vụ email chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
      );
    }

      try {
        await this.sendViaSmtpSocket({ to, subject, html });
        this.logger.log(`✅ Đã gửi email thành công qua SMTP tới: ${to}`);
        return { success: true, message: 'Email đã được gửi thành công' };
      } catch (err: any) {
        this.logger.error('Không thể gửi email qua SMTP.');
        throw new ServiceUnavailableException(
          'Không thể gửi email xác thực lúc này. Vui lòng thử lại sau.',
        );
    }

  }

  /**
   * In đẹp mã OTP ra Console với khung viền ASCII hiện đại
   */
  private printOtpToConsole(info: {
    to: string;
    otp: string;
    purpose: string;
    recipientName?: string;
  }) {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toLocaleTimeString('vi-VN');
    const border = '═'.repeat(64);
    const line = '─'.repeat(64);

    /* eslint-disable no-console */
    console.log('\n╔' + border + '╗');
    console.log('║' + '  💌 [PLANIFY DEV EMAIL SERVICE] - THÔNG BÁO MÃ OTP  '.padStart(57).padEnd(64) + '║');
    console.log('╠' + border + '╣');
    console.log(`║ Gửi tới   : ${info.to.padEnd(50)} ║`);
    if (info.recipientName) {
      console.log(`║ Tên nhận  : ${info.recipientName.padEnd(50)} ║`);
    }
    console.log(`║ Mục đích  : [${info.purpose}]`.padEnd(65) + '║');
    console.log('╟' + line + '╢');
    console.log(`║                MÃ XÁC THỰC OTP CỦA BẠN LÀ:                     ║`);
    console.log(`║                                                                ║`);
    console.log(`║                     ▶  [ ${info.otp} ]  ◀                     ║`);
    console.log(`║                                                                ║`);
    console.log('╟' + line + '╢');
    console.log(`║ Thời hạn  : 10 phút (Hết hạn lúc: ${expiresAt.padEnd(30)}) ║`);
    console.log(`║ Ghi chú   : Không chia sẻ mã này cho bất kỳ ai vì an toàn.     ║`);
    console.log('╚' + border + '╝\n');
    /* eslint-enable no-console */
  }

  /**
   * Gửi email trực tiếp qua chuẩn SMTP RFC 5321 (hỗ trợ SSL/TLS port 465 hoặc STARTTLS)
   */
  private sendViaSmtpSocket(options: SendMailOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutMs = 8000;
      let socket: net.Socket;

      const timer = setTimeout(() => {
        if (socket) socket.destroy();
        reject(new Error('SMTP Connection Timeout'));
      }, timeoutMs);

      const cleanup = () => clearTimeout(timer);

      if (this.smtpSecure) {
        socket = tls.connect({
          host: this.smtpHost,
          port: this.smtpPort,
          rejectUnauthorized: false,
        });
      } else {
        socket = net.connect({
          host: this.smtpHost,
          port: this.smtpPort,
        });
      }

      let step = 0;
      let buffer = '';

      socket.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\r\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const code = parseInt(line.substring(0, 3), 10);
          if (isNaN(code) || line.charAt(3) === '-') continue;

          if (step === 0 && code === 220) {
            socket.write(`EHLO planify.app\r\n`);
            step = 1;
          } else if (step === 1 && code === 250) {
            socket.write('AUTH LOGIN\r\n');
            step = 2;
          } else if (step === 2 && code === 334) {
            const userBase64 = Buffer.from(this.smtpUser).toString('base64');
            socket.write(`${userBase64}\r\n`);
            step = 3;
          } else if (step === 3 && code === 334) {
            const passBase64 = Buffer.from(this.smtpPass).toString('base64');
            socket.write(`${passBase64}\r\n`);
            step = 4;
          } else if (step === 4 && code === 235) {
            socket.write(`MAIL FROM:<${this.smtpUser}>\r\n`);
            step = 5;
          } else if (step === 5 && code === 250) {
            socket.write(`RCPT TO:<${options.to}>\r\n`);
            step = 6;
          } else if (step === 6 && code === 250) {
            socket.write('DATA\r\n');
            step = 7;
          } else if (step === 7 && code === 354) {
            const rawMessage = [
              `From: ${this.smtpFrom}`,
              `To: ${options.to}`,
              `Subject: =?UTF-8?B?${Buffer.from(options.subject).toString('base64')}?=`,
              'MIME-Version: 1.0',
              'Content-Type: text/html; charset=UTF-8',
              'Content-Transfer-Encoding: base64',
              '',
              Buffer.from(options.html).toString('base64'),
              '.\r\n',
            ].join('\r\n');

            socket.write(rawMessage);
            step = 8;
          } else if (step === 8 && code === 250) {
            socket.write('QUIT\r\n');
            step = 9;
          } else if (step === 9 && code === 221) {
            cleanup();
            socket.end();
            resolve();
          } else if (code >= 400) {
            cleanup();
            socket.destroy();
            reject(new Error(`SMTP Error: ${line}`));
          }
        }
      });

      socket.on('error', (err) => {
        cleanup();
        reject(err);
      });
    });
  }

  /**
   * Tạo HTML email thương hiệu Planify với mã màu #f28d8d
   */
  private buildOtpEmailTemplate(params: {
    title: string;
    description: string;
    otp: string;
    badgeText: string;
    email: string;
  }): string {
    const { title, description, otp, badgeText, email } = params;

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #334155;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 580px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      border: 1px solid #f1f5f9;
    }
    .header {
      background: linear-gradient(135deg, #f28d8d 0%, #e06b6b 100%);
      padding: 36px 24px;
      text-align: center;
      color: #ffffff;
    }
    .brand-logo {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .brand-tagline {
      font-size: 13px;
      opacity: 0.9;
      margin-top: 6px;
      margin-bottom: 0;
    }
    .content {
      padding: 36px 32px;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      background-color: #fff1f2;
      color: #f28d8d;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 9999px;
      margin-bottom: 16px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 0;
      margin-bottom: 12px;
    }
    .description {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 28px;
    }
    .otp-box-wrapper {
      text-align: center;
      margin: 28px 0;
    }
    .otp-box {
      display: inline-block;
      background-color: #fff1f2;
      border: 2px dashed #f28d8d;
      border-radius: 12px;
      padding: 16px 32px;
      letter-spacing: 10px;
      font-size: 36px;
      font-weight: 800;
      color: #e11d48;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      text-align: center;
    }
    .timer-notice {
      font-size: 13px;
      color: #64748b;
      margin-top: 14px;
    }
    .security-note {
      background-color: #f8fafc;
      border-left: 4px solid #f28d8d;
      padding: 14px 18px;
      border-radius: 6px;
      margin-top: 28px;
      font-size: 13px;
      line-height: 1.5;
      color: #64748b;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="brand-logo">Planify</h1>
      <p class="brand-tagline">Nền tảng Quản lý Dự án & Cộng tác Thông minh</p>
    </div>
    <div class="content">
      <span class="badge">${badgeText}</span>
      <h2 class="title">${title}</h2>
      <p class="description">${description}</p>
      
      <div class="otp-box-wrapper">
        <div class="otp-box">${otp}</div>
        <div class="timer-notice">⏱️ Mã này có hiệu lực trong vòng <strong>10 phút</strong>.</div>
      </div>

      <div class="security-note">
        🔒 <strong>Bảo mật tài khoản:</strong> Tuyệt đối không chia sẻ mã xác thực này cho bất kỳ ai, bao gồm cả nhân viên hỗ trợ của Planify. Email này được gửi tự động tới <em>${email}</em>.
      </div>
    </div>
    <div class="footer">
      <p>© 2026 Planify Inc. Mọi quyền được bảo lưu.</p>
      <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}

