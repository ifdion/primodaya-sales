export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailBinding {
  send(message: EmailMessage): Promise<unknown>;
}

export async function sendManagerNotification({
  email,
  from,
  managerEmail,
  leadName,
  salesName,
}: {
  email: SendEmailBinding;
  from: string;
  managerEmail: string;
  leadName: string;
  salesName: string;
}): Promise<boolean> {
  try {
    await email.send({
      to: managerEmail,
      from,
      subject: `[Pricing Update] Offer Generated for ${leadName}`,
      html: `<p>Super Admin has assigned pricing and validity for lead <strong>${leadName}</strong> (Sales Rep: ${salesName}).</p>`,
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendInvite({
  email,
  from,
  to,
  name,
  setupUrl,
  inviterName,
}: {
  email: SendEmailBinding;
  from: string;
  to: string;
  name: string;
  setupUrl: string;
  inviterName: string;
}): Promise<boolean> {
  try {
    await email.send({
      to,
      from,
      subject: `You are invited to join the Primodaya CRM`,
      html: `<p>Hi ${name},</p><p>${inviterName} invited you to the Primodaya CRM. Set up your account here: <a href="${setupUrl}">${setupUrl}</a></p>`,
    });
    return true;
  } catch {
    return false;
  }
}
