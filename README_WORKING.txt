EVOptima working clean build

Что исправлено:
- устранена ошибка JavaScript из-за отсутствующих openAlertModal / closeAlertModal
- снова работает инициализация карты
- снова работают кнопки и всплывающие окна, включая подписку
- добавлен favicon.ico
- добавлен VERSION.txt

Как проверить, что запущена именно эта версия:
1. Откройте:
   http://localhost:5500/VERSION.txt
   Там должно быть:
   EVOPTIMA-WORKING-2026-04-22

2. Откройте DevTools -> Console
   Там будет:
   EVOptima build: EVOPTIMA-WORKING-2026-04-22
