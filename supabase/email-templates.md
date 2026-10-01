# Шаблоны писем для Supabase (RU · UZ · EN)

Supabase → Authentication → Emails → **Templates**. В каждом шаблоне замените **Subject** и **Body** (вкладка Source) и нажмите **Save**.
`{{ .ConfirmationURL }}` не меняйте — Supabase подставит туда ссылку.

## Confirm signup

Subject:
```
Подтвердите почту · Pochtani tasdiqlang · Confirm your email — EduFY
```

Body:
```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f5f4;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e8e6;border-radius:12px;">
<tr><td style="padding:28px 32px 8px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="width:30px;height:30px;background:#0F6E56;border-radius:7px;text-align:center;vertical-align:middle;color:#ffffff;font-size:16px;font-weight:700;">E</td>
<td style="padding-left:10px;font-size:18px;font-weight:700;color:#0f1513;">EduFY</td>
</tr></table>
</td></tr>
<tr><td style="padding:16px 32px 4px 32px;font-size:20px;font-weight:700;line-height:1.3;color:#0f1513;">Подтвердите почту · Pochtani tasdiqlang · Confirm your email</td></tr>
<tr><td style="padding:12px 32px 4px 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 0 14px 0;font-size:15px;line-height:1.55;color:#1f2a27;"><span style="display:inline-block;min-width:26px;font-size:11px;font-weight:700;letter-spacing:.06em;color:#0F6E56;">RU</span> Здравствуйте! Чтобы завершить регистрацию в EduFY, подтвердите адрес электронной почты.</td></tr><tr><td style="padding:0 0 14px 0;font-size:15px;line-height:1.55;color:#1f2a27;"><span style="display:inline-block;min-width:26px;font-size:11px;font-weight:700;letter-spacing:.06em;color:#0F6E56;">UZ</span> Assalomu alaykum! EduFY’da ro‘yxatdan o‘tishni yakunlash uchun elektron pochta manzilingizni tasdiqlang.</td></tr><tr><td style="padding:0 0 14px 0;font-size:15px;line-height:1.55;color:#1f2a27;"><span style="display:inline-block;min-width:26px;font-size:11px;font-weight:700;letter-spacing:.06em;color:#0F6E56;">EN</span> Hello! To complete your EduFY registration, please confirm your email address.</td></tr></table></td></tr>
<tr><td style="padding:4px 32px 24px 32px;">
<a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0F6E56;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:8px;">Подтвердить · Tasdiqlash · Confirm</a>
</td></tr>
<tr><td style="padding:0 32px 24px 32px;font-size:12px;line-height:1.5;color:#6b7673;">Кнопка не работает? · Tugma ishlamayaptimi? · Button not working?<br><a href="{{ .ConfirmationURL }}" style="color:#0F6E56;word-break:break-all;">{{ .ConfirmationURL }}</a></td></tr>
<tr><td style="padding:16px 32px 24px 32px;border-top:1px solid #e3e8e6;font-size:12px;line-height:1.6;color:#6b7673;">Если вы не регистрировались в EduFY, просто проигнорируйте это письмо.<br>Agar siz EduFY’da ro‘yxatdan o‘tmagan bo‘lsangiz, ushbu xatga e’tibor bermang.<br>If you did not sign up for EduFY, you can safely ignore this email.</td></tr>
</table>
<p style="margin:16px 0 0 0;font-size:12px;color:#8a9491;font-family:Arial,Helvetica,sans-serif;">EduFY — школьная платформа · maktab platformasi · school platform</p>
</td></tr>
</table>
```

## Reset password

Subject:
```
Смена пароля · Parolni tiklash · Password reset — EduFY
```

Body:
```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f5f4;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e8e6;border-radius:12px;">
<tr><td style="padding:28px 32px 8px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="width:30px;height:30px;background:#0F6E56;border-radius:7px;text-align:center;vertical-align:middle;color:#ffffff;font-size:16px;font-weight:700;">E</td>
<td style="padding-left:10px;font-size:18px;font-weight:700;color:#0f1513;">EduFY</td>
</tr></table>
</td></tr>
<tr><td style="padding:16px 32px 4px 32px;font-size:20px;font-weight:700;line-height:1.3;color:#0f1513;">Смена пароля · Parolni tiklash · Password reset</td></tr>
<tr><td style="padding:12px 32px 4px 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 0 14px 0;font-size:15px;line-height:1.55;color:#1f2a27;"><span style="display:inline-block;min-width:26px;font-size:11px;font-weight:700;letter-spacing:.06em;color:#0F6E56;">RU</span> Мы получили запрос на смену пароля для вашей учётной записи EduFY. Нажмите кнопку ниже, чтобы задать новый пароль.</td></tr><tr><td style="padding:0 0 14px 0;font-size:15px;line-height:1.55;color:#1f2a27;"><span style="display:inline-block;min-width:26px;font-size:11px;font-weight:700;letter-spacing:.06em;color:#0F6E56;">UZ</span> EduFY hisobingiz parolini almashtirish so‘rovini oldik. Yangi parol o‘rnatish uchun quyidagi tugmani bosing.</td></tr><tr><td style="padding:0 0 14px 0;font-size:15px;line-height:1.55;color:#1f2a27;"><span style="display:inline-block;min-width:26px;font-size:11px;font-weight:700;letter-spacing:.06em;color:#0F6E56;">EN</span> We received a request to reset the password for your EduFY account. Use the button below to set a new password.</td></tr></table></td></tr>
<tr><td style="padding:4px 32px 24px 32px;">
<a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0F6E56;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:8px;">Задать пароль · Parol o‘rnatish · Set password</a>
</td></tr>
<tr><td style="padding:0 32px 24px 32px;font-size:12px;line-height:1.5;color:#6b7673;">Кнопка не работает? · Tugma ishlamayaptimi? · Button not working?<br><a href="{{ .ConfirmationURL }}" style="color:#0F6E56;word-break:break-all;">{{ .ConfirmationURL }}</a></td></tr>
<tr><td style="padding:16px 32px 24px 32px;border-top:1px solid #e3e8e6;font-size:12px;line-height:1.6;color:#6b7673;">Если вы не запрашивали смену пароля, проигнорируйте это письмо — пароль останется прежним.<br>Agar siz bu so‘rovni yubormagan bo‘lsangiz, xatga e’tibor bermang — parolingiz o‘zgarmaydi.<br>If you did not request this, ignore this email — your password will not change.</td></tr>
</table>
<p style="margin:16px 0 0 0;font-size:12px;color:#8a9491;font-family:Arial,Helvetica,sans-serif;">EduFY — школьная платформа · maktab platformasi · school platform</p>
</td></tr>
</table>
```
