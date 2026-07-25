const nodemailer = require('nodemailer');

const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.resend.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || 'resend';
  const pass = process.env.SMTP_PASS;

  if (!pass) {
    console.warn('[EmailService] SMTP_PASS is missing. Email dispatch will fail or run in mockup mode.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    connectionTimeout: 4000, // Fail fast if blocked by cloud firewall
    greetingTimeout: 4000,
    socketTimeout: 4000
  });
};

const getSenderEmail = () => {
  return process.env.EMAIL_FROM || 'onboarding@resend.dev';
};

/**
 * Send Verification OTP to Student Email
 */
exports.sendVerificationOTP = async (email, otp) => {
  const transporter = getTransporter();
  const fromEmail = getSenderEmail();

  await transporter.sendMail({
    from: `"Off-Campus" <${fromEmail}>`,
    to: email,
    subject: 'Off-Campus - Your College Email Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 30px; background-color: #0c0812; color: #ffffff; border-radius: 16px; max-width: 500px; margin: 0 auto; border: 1px solid #C2FF3D; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);">
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #C2FF3D; margin: 0; font-size: 28px; letter-spacing: 1px; font-weight: 900;">OFF-CAMPUS</h1>
          <p style="color: #a092b0; margin: 5px 0 0 0; font-size: 14px;">College Social & Dating Hub</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #2d223c; margin-bottom: 25px;" />
        <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">Verify your college email 🎓</h2>
        <p style="font-size: 15px; color: #d0c8da; line-height: 1.5;">Hey Student,</p>
        <p style="font-size: 15px; color: #d0c8da; line-height: 1.5;">Here is your 6-digit verification code to claim your Verified Blue Badge and confirm your college network:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #000000; padding: 15px 30px; background: #C2FF3D; display: inline-block; border-radius: 12px; box-shadow: 0 4px 15px rgba(194, 255, 61, 0.4);">
            ${otp}
          </div>
        </div>
        <p style="font-size: 13px; color: #887a99; line-height: 1.4; margin-bottom: 0;">This OTP is valid for 10 minutes. Never share this code with anyone.</p>
      </div>
    `
  });
};

/**
 * Send Verification Approved Email (Blue Tick)
 */
exports.sendVerificationApproval = async (email, name) => {
  const transporter = getTransporter();
  const fromEmail = getSenderEmail();

  await transporter.sendMail({
    from: `"Off-Campus" <${fromEmail}>`,
    to: email,
    subject: 'Off-Campus - Account Verified Successfully! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 30px; background-color: #0c0812; color: #ffffff; border-radius: 16px; max-width: 500px; margin: 0 auto; border: 1px solid #C2FF3D; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);">
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #C2FF3D; margin: 0; font-size: 28px; letter-spacing: 1px; font-weight: 900;">OFF-CAMPUS</h1>
          <p style="color: #a092b0; margin: 5px 0 0 0; font-size: 14px;">College Social & Dating Hub</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #2d223c; margin-bottom: 25px;" />
        <h2 style="color: #C2FF3D; font-size: 20px; margin-top: 0; text-align: center;">You're Verified! 🎓✨</h2>
        <p style="font-size: 15px; color: #d0c8da; line-height: 1.5;">Hi ${name || 'Student'},</p>
        <p style="font-size: 15px; color: #d0c8da; line-height: 1.5;">We have successfully verified your student ID card! Your **Verified Blue Badge** is now active on your profile card.</p>
        <div style="background-color: #160f24; border-radius: 10px; padding: 15px; margin: 20px 0; border-left: 4px solid #C2FF3D;">
          <p style="margin: 0; font-size: 14px; color: #ffffff; font-weight: bold;">What this means:</p>
          <ul style="margin: 5px 0 0 0; padding-left: 20px; font-size: 13px; color: #d0c8da; line-height: 1.4;">
            <li>Increased visibility in the student Discovery feed</li>
            <li>Verification badge displayed on your profile card</li>
            <li>Unlock safety priority for matches</li>
          </ul>
        </div>
        <p style="font-size: 14px; color: #d0c8da; line-height: 1.5;">Enjoy matching and connecting inside your student community!</p>
      </div>
    `
  });
};

/**
 * Send Verification Rejected Email
 */
exports.sendVerificationRejection = async (email, name, reason) => {
  const transporter = getTransporter();
  const fromEmail = getSenderEmail();

  await transporter.sendMail({
    from: `"Off-Campus" <${fromEmail}>`,
    to: email,
    subject: 'Off-Campus - Verification Request Update',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 30px; background-color: #0c0812; color: #ffffff; border-radius: 16px; max-width: 500px; margin: 0 auto; border: 1px solid #ff453a; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);">
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #ff453a; margin: 0; font-size: 28px; letter-spacing: 1px; font-weight: 900;">OFF-CAMPUS</h1>
          <p style="color: #a092b0; margin: 5px 0 0 0; font-size: 14px;">College Social & Dating Hub</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #2d223c; margin-bottom: 25px;" />
        <h2 style="color: #ff453a; font-size: 20px; margin-top: 0; text-align: center;">Verification Update 📝</h2>
        <p style="font-size: 15px; color: #d0c8da; line-height: 1.5;">Hi ${name || 'Student'},</p>
        <p style="font-size: 15px; color: #d0c8da; line-height: 1.5;">Your recent student ID card verification request was reviewed, but unfortunately, we could not verify it at this time.</p>
        <div style="background-color: #1c0e12; border-radius: 10px; padding: 15px; margin: 20px 0; border-left: 4px solid #ff453a;">
          <p style="margin: 0; font-size: 14px; color: #ffffff; font-weight: bold;">Reason for rejection:</p>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #ffd2d2; line-height: 1.4;">"${reason || 'The uploaded ID card image was blurry or invalid.'}"</p>
        </div>
        <p style="font-size: 14px; color: #d0c8da; line-height: 1.5;">You can easily submit a new, clear photo of your student ID card directly inside the app to try again.</p>
      </div>
    `
  });
};

/**
 * Send Premium Membership Welcome
 */
exports.sendPremiumWelcome = async (email, name) => {
  const transporter = getTransporter();
  const fromEmail = getSenderEmail();

  await transporter.sendMail({
    from: `"Off-Campus" <${fromEmail}>`,
    to: email,
    subject: 'Off-Campus - Welcome to Premium! 👑✨',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 30px; background-color: #0c0812; color: #ffffff; border-radius: 16px; max-width: 500px; margin: 0 auto; border: 1px solid #ffd700; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);">
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #ffd700; margin: 0; font-size: 28px; letter-spacing: 1px; font-weight: 900;">OFF-CAMPUS</h1>
          <p style="color: #a092b0; margin: 5px 0 0 0; font-size: 14px;">College Social & Dating Hub</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #2d223c; margin-bottom: 25px;" />
        <h2 style="color: #ffd700; font-size: 22px; margin-top: 0; text-align: center;">Premium Unlocked! 👑</h2>
        <p style="font-size: 15px; color: #d0c8da; line-height: 1.5;">Congratulations ${name || 'Student'},</p>
        <p style="font-size: 15px; color: #d0c8da; line-height: 1.5;">Welcome to **Off-Campus Premium**! Your exclusive matching advantages are now fully active on your account.</p>
        <div style="background-color: #1f1a0b; border-radius: 10px; padding: 15px; margin: 20px 0; border-left: 4px solid #ffd700;">
          <p style="margin: 0; font-size: 14px; color: #ffffff; font-weight: bold;">Your Premium Perks:</p>
          <ul style="margin: 5px 0 0 0; padding-left: 20px; font-size: 13px; color: #ffd700; line-height: 1.4;">
            <li>Unlimited likes and instant matches</li>
            <li>Visual Spotify Vibes compatibility scores</li>
            <li>Advanced filters to find your type</li>
          </ul>
        </div>
        <p style="font-size: 14px; color: #d0c8da; line-height: 1.5; text-align: center; font-weight: bold; margin-top: 25px;">Go ahead and swipe with your premium status!</p>
      </div>
    `
  });
};
