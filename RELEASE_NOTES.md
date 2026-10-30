# I Fixed YouTube 1.8.8

- Blocked horizontal page scrolling on the watch page at the document/app boundary, without changing player sizing or clipping its ambient-light container.
- Blocked wheel and touch scrolling only during fullscreen video, including YouTube's wheel gesture that reveals page details. Fullscreen page scrollbars are hidden; normal wheel behavior returns on exit.
- Kept native video sizing, rounded corners, controls, keyboard feedback and side panels.

Validation: automated tests, five local viewport sizes, and live YouTube checks for horizontal wheel scrolling, fullscreen wheel gestures at multiple positions and directions, native keyboard feedback and chapter-panel sizing.

## Русский

- Убрана горизонтальная прокрутка страницы видео на уровне документа и приложения, без изменения размеров плеера и обрезки фоновой подсветки.
- Колесо и сенсорная прокрутка блокируются только в полноэкранном видео, включая жест YouTube для показа деталей страницы. Полосы прокрутки в fullscreen скрыты, после выхода обычная обработка колеса возвращается.
- Сохранены штатные размеры, скругления, управление, индикация клавиш и боковые панели.

Проверка: автоматические тесты, пять локальных размеров окна и настоящий YouTube — горизонтальное колесо, жесты в fullscreen в разных направлениях и точках, штатные клавиши и размеры видео при открытии глав.
