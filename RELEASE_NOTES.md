# I Fixed YouTube 1.8.5

- Fixed how the player and controls resize when chapters, transcript or Ask/Gemini panels open. Video scales proportionally inside its container; the timeline and right-side controls stay visible.
- Arrow keys, M and Space now control the watch-page video without first focusing the player: left/right seek five seconds, up/down adjust volume, M toggles mute, Space toggles playback.
- Preserved typing in comment editors, search, Gemini and other text fields. Prevented duplicate shortcut actions, page scrolling and accidental activation of focused buttons.
- Removed page scrollbars and page scrolling while the video is fullscreen. Normal vertical scrolling returns on exit.
- Kept recommendations hidden and native fullscreen/theater sizing intact.

Validation: 19 automated checks plus browser regressions at five viewport widths (390–1920 px), covering stale native player sizes, open/closed panels, real media seeking and playback, volume/mute, typing and keyboard focus. Live YouTube/Gemini were not tested.

## Русский

- Исправлено масштабирование плеера и кнопок при открытии глав, расшифровки или Ask/Gemini. Видео пропорционально вписывается в свой контейнер; полоса времени и правые кнопки остаются видимыми.
- Стрелки, M и пробел управляют видео на странице просмотра без предварительного фокуса на плеере: влево/вправо — пять секунд, вверх/вниз — громкость, M — звук, пробел — пауза/воспроизведение.
- Сохранён ввод текста в комментариях, поиске, Gemini и других полях. Исключены двойное срабатывание, прокрутка страницы и случайное нажатие кнопок с клавиатуры.
- Убраны полосы прокрутки и листание страницы в полноэкранном видео. После выхода обычная вертикальная прокрутка возвращается.
- Сохранено скрытие рекомендаций и нативные размеры в полноэкранном и широком режимах.

Проверка: 19 автоматических тестов и браузерные проверки на пяти размерах экрана (390–1920 px), включая устаревшие размеры плеера, открытие/закрытие панелей, перемотку и воспроизведение реального медиаэлемента, громкость, звук и ввод текста. На реальном YouTube/Gemini не проверялось.
