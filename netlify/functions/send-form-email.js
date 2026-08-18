const OWNER_EMAIL = process.env.OWNER_EMAIL || 'Halls.driving@gmail.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Hall\'s Driving <notifications@hallsdrivingal.com>';

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

async function sendEmail(payload) {
  if (!process.env.RESEND_API_KEY) return { skipped: true };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const data = JSON.parse(event.body || '{}');
    const firstName = escapeHtml(data.firstName || 'there');
    const email = String(data.email || '').trim();
    const logoUrl = `${process.env.URL || 'https://hallsdrivingal.com'}/assets/halls-driving-logo.png`;
    const isDefensive = data.emailType === 'defensive';

    const ownerSubject = isDefensive ? 'New Defensive Driving Registration' : 'New Contact Form Submission';
    const ownerRows = Object.entries(data)
      .filter(([key]) => !['bot-field','form-name','emailType'].includes(key))
      .map(([key,value]) => `<tr><td style="padding:7px;border:1px solid #ddd"><strong>${escapeHtml(key)}</strong></td><td style="padding:7px;border:1px solid #ddd">${escapeHtml(value)}</td></tr>`).join('');

    await sendEmail({
      from: FROM_EMAIL,
      to: [OWNER_EMAIL],
      reply_to: email || undefined,
      subject: ownerSubject,
      html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto"><img src="${logoUrl}" alt="Hall's Driving" style="width:150px;display:block;margin:0 auto 18px"><h2 style="color:#b51622">${ownerSubject}</h2><table style="border-collapse:collapse;width:100%">${ownerRows}</table></div>`
    });

    if (email) {
      const subject = isDefensive ? "Defensive Driving Registration Received — Hall's Driving" : "Thank You for Contacting Hall's Driving!";
      const heading = isDefensive ? "Thank You for Registering!" : "Thank You for Contacting Hall's Driving!";
      const content = isDefensive
        ? `<p>Thank you for registering for a Hall's Driving Defensive Driving class. Your registration has been received.</p><p>We appreciate the opportunity to be part of your driving education. If we need any additional information before your class, someone from the Hall's Driving family will be in touch.</p><p>If you have any questions before class, please don't hesitate to contact us.</p>`
        : `<p>We received your message and appreciate you reaching out.</p><p>Someone from the <strong>Hall's Driving family</strong> will be in touch with you within <strong>24–48 hours</strong> during normal business hours.</p><p>We look forward to assisting you with your driving education needs.</p>`;
      await sendEmail({
        from: FROM_EMAIL,
        to: [email],
        subject,
        html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#171717"><div style="background:#080808;padding:20px;text-align:center"><img src="${logoUrl}" alt="Hall's Driving" style="width:170px;max-height:145px;object-fit:contain"></div><div style="padding:28px;border:1px solid #ddd"><h2 style="color:#b51622">${heading}</h2><p>Hi ${firstName},</p>${content}<p><strong>With appreciation,<br>The Hall's Driving Family</strong></p><hr style="border:0;border-top:2px solid #e0ad21"><p><strong>Hall's Driving</strong><br>Office: (256) 543-3738<br>Mobile: (256) 328-6540<br>212 Wall St., Gadsden, AL<br>HallsDrivingAL.com</p></div></div>`
      });
    }
    return { statusCode: 200, body: JSON.stringify({ok:true}) };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ok:false}) };
  }
};
