const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

async function sendBrevo({
  apiKey,
  to,
  fromEmail,
  fromName,
  subject,
  html,
}: {
  apiKey: string;
  to: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function sendManagerNotification({
  apiKey,
  from,
  managerEmail,
  leadName,
  salesName,
}: {
  apiKey: string;
  from: string;
  managerEmail: string;
  leadName: string;
  salesName: string;
}): Promise<boolean> {
  return sendBrevo({
    apiKey,
    to: managerEmail,
    fromEmail: from,
    fromName: "Primodaya CRM",
    subject: `[Pricing Update] Offer Generated for ${leadName}`,
    html: `<p>Super Admin has assigned pricing and validity for lead <strong>${leadName}</strong> (Sales Rep: ${salesName}).</p>`,
  });
}

export async function sendLeadCreatedAlert({
  apiKey,
  from,
  adminEmail,
  leadName,
  salesName,
  pricingUrl,
}: {
  apiKey: string;
  from: string;
  adminEmail: string;
  leadName: string;
  salesName: string;
  pricingUrl: string;
}): Promise<boolean> {
  return sendBrevo({
    apiKey,
    to: adminEmail,
    fromEmail: from,
    fromName: "Primodaya CRM",
    subject: `[Pricing Needed] New Lead Created for ${leadName}`,
    html: `<p>A new lead <strong>${leadName}</strong> (Sales Rep: ${salesName}) was created and is pending pricing.</p><p>Please assign the price and validity here: <a href="${pricingUrl}">${pricingUrl}</a></p>`,
  });
}

export async function sendPasswordReset({
  apiKey,
  from,
  to,
  name,
  resetUrl,
}: {
  apiKey: string;
  from: string;
  to: string;
  name: string;
  resetUrl: string;
}): Promise<boolean> {
  return sendBrevo({
    apiKey,
    to,
    fromEmail: from,
    fromName: "Primodaya CRM",
    subject: "Primodaya CRM — password reset",
    html: `<p>Hi ${name},</p><p>Someone requested a password reset for your Primodaya CRM account. Set a new password here (valid for 60 minutes): <a href="${resetUrl}">${resetUrl}</a></p><p>If this wasn't you, you can ignore this email.</p>`,
  });
}

export async function sendInvite({
  apiKey,
  from,
  to,
  name,
  setupUrl,
  inviterName,
}: {
  apiKey: string;
  from: string;
  to: string;
  name: string;
  setupUrl: string;
  inviterName: string;
}): Promise<boolean> {
  return sendBrevo({
    apiKey,
    to,
    fromEmail: from,
    fromName: "Primodaya CRM",
    subject: "You are invited to join the Primodaya CRM",
    html: `<p>Hi ${name},</p><p>${inviterName} invited you to the Primodaya CRM. Set up your account here: <a href="${setupUrl}">${setupUrl}</a></p>`,
  });
}
