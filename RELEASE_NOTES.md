# I Fixed YouTube 1.8.7

- Restored the native player layout, ambient lighting, rounded corners, fullscreen and scrolling behavior. Removed extension overrides for video dimensions, clipping, positioning and controls visibility.
- Kept native chapters/transcript/Ask panels available. On panel open/close, YouTube receives a resize notification and calculates its own video and control sizes.
- Shortcuts inside the player are untouched. Outside it, arrows, M and Space are forwarded to the native player, except in text inputs. Removed direct media manipulation and custom feedback timers.

Validation: automated checks and five local viewport sizes, plus a fresh signed-out browser on the actual YouTube watch page. Confirmed native seeking/mute/playback feedback, fullscreen without page scrolling, chapter-panel resizing and no horizontal overflow. Signed-in Gemini responses were not tested.

## Русский

- Возвращена штатная разметка плеера: подсветка фона, скругления, fullscreen и прокрутка. Удалены переопределения размеров, обрезки, позиционирования видео и видимости управления.
- Сохранён доступ к панелям глав, расшифровки и Ask. При открытии/закрытии панели YouTube получает уведомление об изменении размера и сам пересчитывает видео и кнопки.
- Клавиши внутри плеера не перехватываются. Вне него стрелки, M и пробел передаются штатному плееру, кроме полей ввода. Убраны прямое изменение медиа и собственные таймеры индикации.

Проверено автоматическими тестами, на пяти локальных размерах окна и на настоящей странице YouTube в новом браузере без входа в аккаунт: перемотка, звук, пауза, штатная индикация, fullscreen без прокрутки, главы и отсутствие горизонтального переполнения. Ответы Gemini с авторизацией не проверялись.
