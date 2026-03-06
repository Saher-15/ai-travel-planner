export const verificationEmail = (name, link) => `
  <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">
    <h2 style="color:#2c3e50;">Email Verification</h2>

    <p>Hello <strong>${name}</strong>,</p>

    <p>
      Thank you for creating an account. Please confirm your email address
      by clicking the button below.
    </p>

    <p style="margin:30px 0;">
      <a href="${link}" 
         style="
           background:#2563eb;
           color:#fff;
           padding:12px 22px;
           text-decoration:none;
           border-radius:6px;
           font-weight:bold;
           display:inline-block;
         ">
         Verify Email
      </a>
    </p>

    <p>If the button does not work, copy and paste the following link into your browser:</p>
    <p style="color:#2563eb;">${link}</p>

    <p style="margin-top:30px;">
      Best regards,<br/>
      <strong>AI Travel Planner Team</strong>
    </p>
  </div>
`;

export const resetPasswordEmail = (name, link) => `
  <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">
    <h2 style="color:#2c3e50;">Password Reset Request</h2>

    <p>Hello <strong>${name}</strong>,</p>

    <p>
      We received a request to reset your password. Click the button below
      to choose a new password.
    </p>

    <p style="margin:30px 0;">
      <a href="${link}" 
         style="
           background:#dc2626;
           color:#fff;
           padding:12px 22px;
           text-decoration:none;
           border-radius:6px;
           font-weight:bold;
           display:inline-block;
         ">
         Reset Password
      </a>
    </p>

    <p>This link will expire in <strong>1 hour</strong> for security reasons.</p>

    <p>If you did not request a password reset, you can safely ignore this email.</p>

    <p>If the button does not work, copy and paste the following link into your browser:</p>
    <p style="color:#dc2626;">${link}</p>

    <p style="margin-top:30px;">
      Best regards,<br/>
      <strong>AI Travel Planner Team</strong>
    </p>
  </div>
`;