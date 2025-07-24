import * as nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  console.log('Creating email transporter with config:', {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || '587',
    user: process.env.EMAIL_USER ? '***' : 'NOT_SET',
    pass: process.env.EMAIL_PASS ? '***' : 'NOT_SET',
    from: process.env.EMAIL_FROM || 'NOT_SET'
  });

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS environment variables are required');
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Email verification template
export const sendVerificationEmail = async (
  email: string,
  firstName: string,
  verificationToken: string
) => {
  try {
    console.log('Attempting to send verification email to:', email);
    
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to Feed Genesis!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Hi ${firstName}, please verify your email address to get started.</p>
          </div>
          
          <div style="padding: 40px; background: #f9f9f9;">
            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px;">
              Thanks for signing up! To complete your registration and access your account, please click the button below to verify your email address:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        font-weight: bold; 
                        display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="margin: 20px 0 0 0; color: #666; font-size: 14px;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style="margin: 10px 0 0 0; color: #667eea; font-size: 14px; word-break: break-all;">
              ${verificationUrl}
            </p>
            
            <p style="margin: 30px 0 0 0; color: #666; font-size: 14px;">
              This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
          
          <div style="padding: 20px; background: #333; color: white; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 Feed Genesis. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Verification email sent successfully to ${email}:`, result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

// Password reset email template
export const sendPasswordResetEmail = async (
  email: string,
  firstName: string,
  resetToken: string
) => {
  try {
    console.log('Attempting to send password reset email to:', email);
    
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Password Reset Request</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Hi ${firstName}, we received a request to reset your password.</p>
          </div>
          
          <div style="padding: 40px; background: #f9f9f9;">
            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px;">
              Click the button below to reset your password. If you didn't request this, you can safely ignore this email.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        font-weight: bold; 
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="margin: 20px 0 0 0; color: #666; font-size: 14px;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style="margin: 10px 0 0 0; color: #667eea; font-size: 14px; word-break: break-all;">
              ${resetUrl}
            </p>
            
            <p style="margin: 30px 0 0 0; color: #666; font-size: 14px;">
              This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
            </p>
          </div>
          
          <div style="padding: 20px; background: #333; color: white; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 Feed Genesis. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent successfully to ${email}:`, result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}; 