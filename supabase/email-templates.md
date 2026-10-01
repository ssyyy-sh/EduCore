# Шаблоны писем для Supabase

Supabase → Authentication → Emails → вкладка **Templates**. Для каждого шаблона замените **Subject** и **Body** (Source) и нажмите Save.
Простое письмо с понятным текстом и одной ссылкой реже попадает в «Спам», чем стандартное английское.

## Confirm signup

Subject:
```
EduFY: подтвердите почту / Pochtani tasdiqlang
```

Body:
```html
<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;max-width:520px">
  <p><b>EduFY</b></p>
  <p>Здравствуйте! Чтобы закончить регистрацию в EduFY, подтвердите почту:</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:10px 18px;background:#0F6E56;color:#ffffff;text-decoration:none;border-radius:6px">Подтвердить почту</a></p>
  <p>Assalomu alaykum! EduFY’da ro‘yxatdan o‘tishni yakunlash uchun yuqoridagi tugmani bosing.</p>
  <p style="color:#666;font-size:13px">Если вы не регистрировались в EduFY, просто удалите это письмо.<br>Agar siz ro‘yxatdan o‘tmagan bo‘lsangiz, bu xatni o‘chirib tashlang.</p>
</div>
```

## Reset password

Subject:
```
EduFY: новый пароль / Yangi parol
```

Body:
```html
<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;max-width:520px">
  <p><b>EduFY</b></p>
  <p>Вы запросили смену пароля в EduFY. Нажмите кнопку, чтобы задать новый пароль:</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:10px 18px;background:#0F6E56;color:#ffffff;text-decoration:none;border-radius:6px">Задать новый пароль</a></p>
  <p>EduFY’da parolni almashtirishni so‘radingiz. Yangi parol uchun yuqoridagi tugmani bosing.</p>
  <p style="color:#666;font-size:13px">Если вы не запрашивали смену пароля, просто удалите это письмо — пароль останется прежним.<br>Agar siz so‘ramagan bo‘lsangiz, bu xatni o‘chirib tashlang.</p>
</div>
```
