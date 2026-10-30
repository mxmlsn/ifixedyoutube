# I Fixed YouTube 1.8.6

- Fixed fullscreen video rendering: windowed layout overrides no longer apply during fullscreen, including when YouTube fullscreens an ancestor of the player. Kept page scrolling disabled in fullscreen.
- Restored rounded corners on the windowed player, including its video and controls.
- Keyboard shortcuts now go through the native player handler first and reveal the timeline and controls for two seconds. Media controls remain a fallback if the native handler does not act. Text inputs keep normal typing behavior.

Validation: 19 automated checks plus browser regressions at five viewport widths (390–1920 px). Tests now use a real colored video and inspect screenshot pixels in both fullscreen paths, check restored corners and visible controls, and exercise native shortcut dispatch and its fallback. Live YouTube was not tested.

## Русский

- Исправлена отрисовка полноэкранного видео: стили обычного плеера больше не действуют в fullscreen, в том числе при открытии на весь экран родительского элемента. Прокрутка страницы остаётся выключенной.
- Возвращены скругления обычного плеера, включая видео и элементы управления.
- Горячие клавиши сначала передаются штатному обработчику плеера, а полоса времени и кнопки показываются на две секунды. При отсутствии штатной обработки предусмотрено управление медиаэлементом. Ввод текста сохранён.

Проверка: 19 автоматических тестов и браузерные проверки на пяти размерах окна (390–1920 px). Теперь тесты используют настоящее цветное видео и проверяют пиксели скриншотов в двух вариантах fullscreen, скругления, видимость управления, передачу клавиш штатному обработчику и резервный путь. На реальном YouTube не проверялось.
