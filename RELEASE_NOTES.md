# I Fixed YouTube 1.8.4

- Fixed horizontal watch-page overflow so arrow keys no longer scroll the page sideways.
- Restored five-second left/right seeking in the focused windowed player, with no duplicate seeking. Fullscreen, text input and native volume controls keep their existing keyboard behavior.
- Restored native chapters and Ask/Gemini buttons and panels while keeping recommendations hidden.

Validation: 19 automated checks and browser regression checks at five viewport widths (390–1920 px), including seeking on a real media timeline. Live Gemini responses were not tested.

## Русский

- Исправлена горизонтальная прокрутка страницы видео: стрелки больше не сдвигают страницу вбок.
- Восстановлена перемотка влево/вправо на пять секунд при фокусе на обычном плеере, без двойного срабатывания. Сохранено поведение клавиш в полноэкранном режиме, при вводе текста и управлении громкостью.
- Восстановлены кнопки и панели глав и Ask/Gemini при сохранении скрытия рекомендаций.

Проверка: 19 автоматических тестов и браузерные проверки на пяти размерах экрана (390–1920 px), включая перемотку реального медиаэлемента. Ответы сервиса Gemini не проверялись.
