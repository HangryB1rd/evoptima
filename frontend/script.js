window.EVOPTIMA_BUILD = 'EVOPTIMA-V16-2026-04-22';
console.log('EVOptima build:', window.EVOPTIMA_BUILD);

(() => {
  const savedBase = localStorage.getItem('evoptima-api-base');
  const fallbackBase = `${location.protocol}//${location.hostname || 'localhost'}:8000/api`;
  const API_BASE = savedBase || fallbackBase;
  const YMAPS_API_KEY = '9ead158c-0113-4c69-8765-a3d36cc04348';
  const page = document.body.dataset.page || 'index';

  let currentTheme = localStorage.getItem('evoptima-theme') || 'dark';
  let currentLang = localStorage.getItem('evoptima-lang') || 'RU';
  let token = localStorage.getItem('evoptima-token') || '';
  let currentUser = null;
  let map, userPlacemark, destinationPlacemark, routeLine, chargerCollection, routeStopCollection;
  let lastKnownLocation = null;
  let lastKnownAddress = localStorage.getItem('evoptima-last-address') || '';
  let destinationCoords = null;
  let faqLoaded = false;
  let faqItems = [];

const FAQ_CATALOG = {
  "RU": [
    {
      "question": "Как EVOptima строит маршрут?",
      "answer": "EVOptima использует адрес отправления, адрес назначения, марку, модель и заряд автомобиля, чтобы помочь построить маршрут для электромобиля."
    },
    {
      "question": "Нужен ли доступ к геопозиции?",
      "answer": "Нет, это не обязательно. Вы можете разрешить доступ, чтобы стартовый адрес подставлялся автоматически, или ввести адрес вручную."
    },
    {
      "question": "Как выбирается автомобиль?",
      "answer": "Марка и модель выбираются из встроенного списка. Можно начать вводить название и выбрать подходящий вариант из выпадающего списка."
    },
    {
      "question": "Что дают бесплатные запросы?",
      "answer": "Бесплатные запросы позволяют несколько раз построить маршрут до оформления подписки. Лимит относится именно к построению маршрута."
    },
    {
      "question": "Зачем нужна подписка?",
      "answer": "Подписка снимает ограничение на бесплатные построения маршрута и открывает дальнейшее использование сервиса без лимита."
    },
    {
      "question": "Как работает история поездок?",
      "answer": "История поездок доступна после входа в аккаунт. Она сохраняет построенные маршруты и позволяет просматривать их позже."
    },
    {
      "question": "Можно ли увидеть зарядки на карте?",
      "answer": "Да. На карте отображаются ближайшие зарядные станции рядом с вашим текущим местоположением."
    },
    {
      "question": "Что есть в профиле?",
      "answer": "В профиле отображаются фото, имя, часть почты, статус подписки, история поездок и статистика пользователей."
    }
  ],
  "EN": [
    {
      "question": "How does EVOptima build a route?",
      "answer": "EVOptima uses the start address, destination, vehicle make, model, and battery level to help build an EV route."
    },
    {
      "question": "Is geolocation access required?",
      "answer": "No. You can allow access to fill the start address automatically, or enter the address manually."
    },
    {
      "question": "How is the vehicle selected?",
      "answer": "The make and model are selected from the built-in list. You can type part of the name and choose a matching option from the dropdown."
    },
    {
      "question": "What do free requests include?",
      "answer": "Free requests let you build a few routes before getting a subscription. The limit applies specifically to route building."
    },
    {
      "question": "Why is a subscription needed?",
      "answer": "The subscription removes the free route-building limit and lets you continue using the service without that cap."
    },
    {
      "question": "How does trip history work?",
      "answer": "Trip history is available after logging in. It stores built routes so you can view them later."
    },
    {
      "question": "Can I see charging stations on the map?",
      "answer": "Yes. The map shows nearby charging stations around your current location."
    },
    {
      "question": "What is available in the profile?",
      "answer": "The profile shows your photo, name, partial email, subscription status, trip history, and user statistics."
    }
  ],
  "DE": [
    {
      "question": "Wie erstellt EVOptima eine Route?",
      "answer": "EVOptima verwendet Startadresse, Zieladresse, Marke, Modell und Akkustand des Fahrzeugs, um eine Route für ein Elektroauto zu erstellen."
    },
    {
      "question": "Ist der Zugriff auf den Standort erforderlich?",
      "answer": "Nein. Sie können den Zugriff erlauben, damit die Startadresse automatisch eingetragen wird, oder die Adresse manuell eingeben."
    },
    {
      "question": "Wie wird das Fahrzeug ausgewählt?",
      "answer": "Marke und Modell werden aus einer eingebauten Liste ausgewählt. Sie können einen Teil des Namens eingeben und einen passenden Eintrag aus dem Dropdown wählen."
    },
    {
      "question": "Was beinhalten die kostenlosen Anfragen?",
      "answer": "Mit den kostenlosen Anfragen können Sie einige Routen erstellen, bevor Sie ein Abo abschließen. Das Limit gilt speziell für die Routenplanung."
    },
    {
      "question": "Warum braucht man ein Abo?",
      "answer": "Das Abo entfernt das Limit für kostenlose Routenplanungen und ermöglicht die weitere Nutzung des Dienstes ohne diese Begrenzung."
    },
    {
      "question": "Wie funktioniert der Fahrtenverlauf?",
      "answer": "Der Fahrtenverlauf ist nach der Anmeldung verfügbar. Er speichert erstellte Routen, damit Sie sie später ansehen können."
    },
    {
      "question": "Kann ich Ladestationen auf der Karte sehen?",
      "answer": "Ja. Auf der Karte werden nahegelegene Ladestationen in der Umgebung Ihres aktuellen Standorts angezeigt."
    },
    {
      "question": "Was gibt es im Profil?",
      "answer": "Im Profil sehen Sie Ihr Foto, Ihren Namen, einen Teil Ihrer E-Mail-Adresse, den Abo-Status, den Fahrtenverlauf und Nutzerstatistiken."
    }
  ]
};

  const tr = {
    RU: {
      map:'Карта', profile:'Профиль', faq:'FAQ', subtitle:'интеллектуальный AI-помощник',
      routePlanner:'Параметры поездки',
      routePlannerSub:'Старт определяется автоматически, но его можно изменить вручную. Пункт назначения выберите на карте или введите адрес.',
      from:'Откуда', to:'Куда', carMake:'Марка', carModel:'Модель', battery:'Заряд, %', buildRoute:'Построить маршрут',
      fromPlaceholder:'Определяется автоматически или вводится вручную', toPlaceholder:'Выберите точку на карте или введите адрес',
      makePlaceholder:'Выберите марку', modelPlaceholder:'Выберите модель', batteryPlaceholder:'Например, 54',
      search:'Поиск...', noResults:'Ничего не найдено',
      chatbot:'EVOptima AI', chatbotSub:'Планирование поездок для электромобилей', send:'Недоступно', messagePlaceholder:'Чат скоро будет доступен', chatDisabledNotice:'Чат будет доступен после подключения ИИ.', guestSubscriptionHint:'Чтобы получить пробные запросы и купить подписку, войдите в аккаунт.', routeLoginRequired:'Чтобы строить маршруты, войдите в аккаунт.', mapLoadFailed:'Не удалось загрузить Яндекс.Карту. Проверьте интернет и API-ключ.',
      welcome:'Здравствуйте! Я EVOptima AI. Подскажите, пожалуйста: куда вы едете, какая у вас марка и модель автомобиля и сколько сейчас заряда?',
      welcomeWithAddress: a => `Здравствуйте! Я EVOptima AI. Я уже определил ваш адрес: ${a}. Подскажите, пожалуйста: куда вы едете, какая у вас марка и модель автомобиля и сколько сейчас заряда?`,
      mapSelectedDestination: a => `Я отметил точку назначения: ${a}. Могу помочь с маршрутом, зарядками, остановками на еду и бытовыми вопросами в дороге.`,
      routeNeedDestination:'Сначала укажите пункт назначения.', routeNeedVehicleFields:'Чтобы построить маршрут, заполните марку, модель и заряд автомобиля.', guestHistoryHint:'Чтобы посмотреть историю поездок, войдите в аккаунт.', alertTitle:'Внимание', alertOk:'Понятно',
      routeBuilt:'Маршрут построен. Я могу подсказать удобные зарядки, еду по пути и полезные остановки.',
      routeSaveFailed:'Маршрут построен, но сохранить его в историю пока не удалось.',
      geoUnavailable:'Не удалось определить местоположение автоматически. Вы можете ввести стартовый адрес вручную.',
      trialDone:'Бесплатные запросы закончились. Купите подписку, чтобы продолжить.',
      authRequired:'Чтобы сохранять историю и пользоваться лимитом запросов аккаунта, войдите в профиль.',
      buySubscription:'Купить подписку', extendSubscription:'Продлить подписку', trialLeft:n=>`У вас есть ${n} пробных запросов`, subscriptionActive:'Подписка активна. Запросы к AI доступны без ограничений.', extendSubscriptionText:'Подписка уже активна. Вы можете продлить её ещё на один период.', editName:'Изменить имя', newNamePlaceholder:'Новое имя', footerNote:'стартап кафедры АСУ 09.03.01',
      login:'Войти в аккаунт', logout:'Выйти из аккаунта', editPhoto:'Изменить фото', save:'Сохранить',
      historyEmpty:'История поездок пуста.',
      authFailed:'Не удалось связаться с сервером. Проверьте backend.',
      loginTitle:'Вход в аккаунт', registerTitle:'Регистрация', authLoginSub:'Используйте почту и пароль, чтобы открыть профиль EVOptima и синхронизировать историю поездок.', authRegisterSub:'Создайте аккаунт, а после регистрации войдите в него на следующем экране.', authEmailPlaceholder:'Почта', authPasswordPlaceholder:'Пароль', authNicknamePlaceholder:'Имя', authNoAccount:'Нет аккаунта? Зарегистрироваться', authHaveAccount:'Уже есть аккаунт? Войти', registerAction:'Зарегистрироваться', back:'Назад', profileTitle:'Профиль', profileIntro:'', statsTitle:'Статистика пользователей', statsUsersLabel:'Активных пользователей за месяц', statsTripsLabel:'Среднее число поездок в неделю', statsMapLabel:'Планирование через карту', statsBatteryLabel:'Средняя экономия заряда на маршруте', subscriptionCardTitle:'Подписка', historyTitle:'История поездок', modalSubscriptionTitle:'Подписка EVOptima', modalSubscriptionText:'Подписка снимает лимит пробных запросов, открывает расширенные рекомендации по поездке, помогает находить зарядки и удобнее хранить историю маршрутов.', modalSubscriptionPrice:'499 ₽ / месяц', modalSubscriptionHint:'В прототипе оплата имитируется. После подтверждения подписка активируется сразу.', modalLater:'Позже', modalPay:'Перейти к оплате', modalNeedLoginText:'Чтобы оформить подписку, сначала войдите в аккаунт. После входа вы сможете перейти к оплате.', modalNeedLoginPay:'Войти в аккаунт', guestTrials:n=>`У вас есть ${n} пробных построений маршрута без входа в аккаунт`, routeTrialDone:'Бесплатные построения маршрута закончились. Чтобы продолжить, оформите подписку.', routeGuestLimitInfo:'Лимит касается построения маршрута, а не обычных сообщений в чате.'
    },
    EN: {
      map:'Map', profile:'Profile', faq:'FAQ', subtitle:'intelligent AI assistant',
      routePlanner:'Trip settings', routePlannerSub:'The start point is detected automatically, but you can edit it manually. Choose a destination on the map or type the address.',
      from:'From', to:'To', carMake:'Make', carModel:'Model', battery:'Battery, %', buildRoute:'Build route',
      fromPlaceholder:'Detected automatically or entered manually', toPlaceholder:'Choose a point on the map or enter an address',
      makePlaceholder:'Choose make', modelPlaceholder:'Choose model', batteryPlaceholder:'For example, 54',
      search:'Search...', noResults:'No results',
      chatbot:'EVOptima AI', chatbotSub:'EV trip planning', send:'Unavailable', messagePlaceholder:'Chat will be available soon', chatDisabledNotice:'The chat will be available after the AI connection is added.', guestSubscriptionHint:'Log in to get trial requests and buy a subscription.', routeLoginRequired:'Log in to build routes.', mapLoadFailed:'Failed to load Yandex Map. Check your internet connection and API key.',
      welcome:'Hello! I am EVOptima AI. Please tell me where you are going, what the make and model of your car is, and what your battery level is.',
      welcomeWithAddress: a => `Hello! I am EVOptima AI. I have already determined your address: ${a}. Please tell me where you are going, what the make and model of your car is, and what your battery level is.`,
      mapSelectedDestination: a => `I marked the destination point: ${a}. I can help with the route, charging points, food stops and useful roadside stops.`,
      routeNeedDestination:'Please specify a destination first.', routeNeedVehicleFields:'To build a route, fill in the vehicle make, model, and battery charge.', guestHistoryHint:'Log in to view trip history.', alertTitle:'Notice', alertOk:'OK',
      routeBuilt:'The route is built. I can suggest charging stations, food stops and useful places on the way.',
      routeSaveFailed:'The route is built, but it could not be saved to your history.',
      geoUnavailable:'Could not determine your location automatically. You can type the starting address manually.',
      trialDone:'Your free requests are over. Buy a subscription to continue.',
      authRequired:'Log in to save history and use account-based AI request limits.',
      buySubscription:'Buy subscription', extendSubscription:'Extend subscription', trialLeft:n=>`You have ${n} trial requests`, subscriptionActive:'Subscription active. AI requests are unlimited.', extendSubscriptionText:'Your subscription is already active. You can extend it for one more period.', editName:'Edit name', newNamePlaceholder:'New name', footerNote:'startup of the ASU department 09.03.01',
      login:'Log in', logout:'Log out', editPhoto:'Change photo', save:'Save',
      historyEmpty:'Trip history is empty.',
      authFailed:'Could not reach the server. Check the backend.',
      loginTitle:'Log in', registerTitle:'Register', authLoginSub:'Use your email and password to open your EVOptima profile and sync trip history.', authRegisterSub:'Create an account and then sign in on the next screen.', authEmailPlaceholder:'Email', authPasswordPlaceholder:'Password', authNicknamePlaceholder:'Name', authNoAccount:'No account? Sign up', authHaveAccount:'Already have an account? Log in', registerAction:'Sign up', back:'Back', profileTitle:'Profile', profileIntro:'', statsTitle:'User statistics', statsUsersLabel:'Active users this month', statsTripsLabel:'Average trips per week', statsMapLabel:'Route planning through map', statsBatteryLabel:'Average battery saving on route', subscriptionCardTitle:'Subscription', historyTitle:'Trip history', modalSubscriptionTitle:'EVOptima subscription', modalSubscriptionText:'The subscription removes the trial request limit, unlocks richer trip recommendations, helps find chargers and makes route history more convenient.', modalSubscriptionPrice:'499 RUB / month', modalSubscriptionHint:'In this prototype, payment is simulated. After confirmation, the subscription is activated immediately.', modalLater:'Later', modalPay:'Go to payment', modalNeedLoginText:'To buy a subscription, first log in to your account. After that you will be able to continue to payment.', modalNeedLoginPay:'Log in', guestTrials:n=>`You have ${n} guest route builds`, routeTrialDone:'Free route builds are over. To continue, buy a subscription.', routeGuestLimitInfo:'The limit applies to route building, not regular chat messages.'
    },
    DE: {
      map:'Karte', profile:'Profil', faq:'FAQ', subtitle:'intelligenter KI-Assistent',
      routePlanner:'Fahrtdaten', routePlannerSub:'Der Start wird automatisch erkannt, kann aber manuell geändert werden. Wählen Sie das Ziel auf der Karte oder geben Sie die Adresse ein.',
      from:'Von', to:'Nach', carMake:'Marke', carModel:'Modell', battery:'Ladung, %', buildRoute:'Route erstellen',
      fromPlaceholder:'Automatisch erkannt oder manuell eingegeben', toPlaceholder:'Punkt auf der Karte wählen oder Adresse eingeben',
      makePlaceholder:'Marke wählen', modelPlaceholder:'Modell wählen', batteryPlaceholder:'Zum Beispiel 54',
      search:'Suche...', noResults:'Keine Treffer',
      chatbot:'EVOptima AI', chatbotSub:'Fahrtenplanung für Elektroautos', send:'Nicht verfügbar', messagePlaceholder:'Chat wird bald verfügbar sein', chatDisabledNotice:'Der Chat wird verfügbar sein, sobald die KI angebunden ist.', guestSubscriptionHint:'Melden Sie sich an, um Testanfragen zu erhalten und ein Abo zu kaufen.', routeLoginRequired:'Melden Sie sich an, um Routen zu erstellen.', mapLoadFailed:'Die Yandex-Karte konnte nicht geladen werden. Prüfen Sie die Internetverbindung und den API-Schlüssel.',
      welcome:'Hallo! Ich bin EVOptima AI. Bitte sagen Sie mir, wohin Sie fahren, welche Marke und welches Modell Ihr Auto hat und wie hoch Ihr Akkustand ist.',
      welcomeWithAddress: a => `Hallo! Ich bin EVOptima AI. Ich habe Ihre Adresse bereits bestimmt: ${a}. Bitte sagen Sie mir, wohin Sie fahren, welche Marke und welches Modell Ihr Auto hat und wie hoch Ihr Akkustand ist.`,
      mapSelectedDestination: a => `Ich habe den Zielpunkt markiert: ${a}. Ich kann bei der Route, Ladesäulen, Essensstopps und nützlichen Halten helfen.`,
      routeNeedDestination:'Bitte geben Sie zuerst ein Ziel an.', routeNeedVehicleFields:'Um eine Route zu erstellen, geben Sie Marke, Modell und Akkustand des Fahrzeugs an.', guestHistoryHint:'Melden Sie sich an, um den Fahrtenverlauf zu sehen.', alertTitle:'Hinweis', alertOk:'OK',
      routeBuilt:'Die Route wurde erstellt. Ich kann Ladestationen, Essen und nützliche Stopps entlang der Strecke empfehlen.',
      routeSaveFailed:'Die Route wurde erstellt, aber der Verlauf konnte nicht gespeichert werden.',
      geoUnavailable:'Der Standort konnte nicht automatisch bestimmt werden. Sie können die Startadresse manuell eingeben.',
      trialDone:'Die Gratisanfragen sind aufgebraucht. Kaufen Sie ein Abo, um fortzufahren.',
      authRequired:'Melden Sie sich an, um den Verlauf zu speichern und kontobasierte KI-Limits zu nutzen.',
      buySubscription:'Abo kaufen', extendSubscription:'Abo verlängern', trialLeft:n=>`Sie haben ${n} Testanfragen`, subscriptionActive:'Abo aktiv. KI-Anfragen sind unbegrenzt.', extendSubscriptionText:'Ihr Abo ist bereits aktiv. Sie können es um einen weiteren Zeitraum verlängern.', editName:'Name bearbeiten', newNamePlaceholder:'Neuer Name', footerNote:'Startup des Lehrstuhls ASU 09.03.01',
      login:'Anmelden', logout:'Abmelden', editPhoto:'Foto ändern', save:'Speichern',
      historyEmpty:'Der Fahrtenverlauf ist leer.',
      authFailed:'Der Server ist nicht erreichbar. Prüfen Sie das Backend.',
      loginTitle:'Anmeldung', registerTitle:'Registrierung', authLoginSub:'Verwenden Sie E-Mail und Passwort, um Ihr EVOptima-Profil zu öffnen und den Fahrtenverlauf zu synchronisieren.', authRegisterSub:'Erstellen Sie ein Konto und melden Sie sich danach auf der nächsten Seite an.', authEmailPlaceholder:'E-Mail', authPasswordPlaceholder:'Passwort', authNicknamePlaceholder:'Name', authNoAccount:'Kein Konto? Registrieren', authHaveAccount:'Sie haben schon ein Konto? Anmelden', registerAction:'Registrieren', back:'Zurück', profileTitle:'Profil', profileIntro:'', statsTitle:'Nutzerstatistik', statsUsersLabel:'Aktive Nutzer pro Monat', statsTripsLabel:'Durchschnittliche Fahrten pro Woche', statsMapLabel:'Planung über die Karte', statsBatteryLabel:'Durchschnittliche Akkuersparnis auf der Route', subscriptionCardTitle:'Abo', historyTitle:'Fahrtenverlauf', modalSubscriptionTitle:'EVOptima-Abo', modalSubscriptionText:'Das Abo hebt das Testlimit auf, schaltet umfangreichere Empfehlungen frei, hilft beim Finden von Ladesäulen und macht den Routenverlauf bequemer.', modalSubscriptionPrice:'499 RUB / Monat', modalSubscriptionHint:'Im Prototyp wird die Zahlung simuliert. Nach der Bestätigung wird das Abo sofort aktiviert.', modalLater:'Später', modalPay:'Zur Zahlung', modalNeedLoginText:'Um ein Abo abzuschließen, melden Sie sich zuerst an. Danach können Sie zur Zahlung weitergehen.', modalNeedLoginPay:'Anmelden', guestTrials:n=>`Sie haben ${n} Gast-Routenplanungen`, routeTrialDone:'Die kostenlosen Routenplanungen sind aufgebraucht. Um fortzufahren, kaufen Sie ein Abo.', routeGuestLimitInfo:'Das Limit gilt für Routenplanung, nicht für normale Chatnachrichten.'
    }
  };

  const $ = id => document.getElementById(id);
  const t = key => (tr[currentLang] && tr[currentLang][key]) || (tr.RU[key]) || key;

  const GUEST_TRIAL_LIMIT = 5;
  const GUEST_TRIAL_KEY = 'evoptima-guest-route-builds-v2';
  function getGuestQueriesUsed() {
    const raw = Number(localStorage.getItem(GUEST_TRIAL_KEY) || 0);
    if (!Number.isFinite(raw) || raw < 0) return 0;
    return Math.min(GUEST_TRIAL_LIMIT, Math.floor(raw));
  }
  function getGuestTrialsLeft() {
    return Math.max(0, GUEST_TRIAL_LIMIT - getGuestQueriesUsed());
  }
  function setGuestQueriesUsed(value) {
    const safe = Math.max(0, Math.min(GUEST_TRIAL_LIMIT, Math.floor(Number(value) || 0)));
    localStorage.setItem(GUEST_TRIAL_KEY, String(safe));
    return safe;
  }
  function consumeGuestTrial() {
    return setGuestQueriesUsed(getGuestQueriesUsed() + 1);
  }

function clearRenderedRoute() {
  try {
    if (routeLine && map) {
      map.geoObjects.remove(routeLine);
      routeLine = null;
    }
  } catch {}
  try {
    if (destinationPlacemark && map) {
      map.geoObjects.remove(destinationPlacemark);
      destinationPlacemark = null;
    }
  } catch {}
  try {
    if (routeStopCollection && map) {
      map.geoObjects.remove(routeStopCollection);
      routeStopCollection = null;
    }
  } catch {}
  destinationCoords = null;
  if ($('toInput')) $('toInput').value = '';
  clearRoutePlan();
}

function clearRoutePlan() {
  const box = $('routePlanResult');
  if (!box) return;
  box.classList.add('hidden');
  box.innerHTML = '';
}

function openAlertModal(text) {
  if ($('alertText')) $('alertText').textContent = text;
  $('alertOverlay')?.classList.add('open');
}

function closeAlertModal() {
  $('alertOverlay')?.classList.remove('open');
}

  
function resetProfileToLoggedOut() {
  if ($('loggedOutBox')) $('loggedOutBox').style.display = 'block';
  if ($('loggedInBox')) $('loggedInBox').style.display = 'none';
  if ($('avatarWrap')) $('avatarWrap').style.display = 'none';
  if ($('profileNick')) $('profileNick').textContent = 'EVOptima';
  if ($('profileMail')) $('profileMail').textContent = '';
  if ($('profileAvatar')) $('profileAvatar').textContent = 'EV';
  if ($('tripHistory')) {
    $('tripHistory').dataset.empty = 'true';
    $('tripHistory').textContent = t('guestHistoryHint');
  }
  if ($('subscriptionMeta')) $('subscriptionMeta').textContent = t('guestSubscriptionHint');
  if ($('nameEditRow')) $('nameEditRow').style.display = 'none';
}


  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const bases = [];
    if (savedBase) bases.push(savedBase);
    if (!bases.includes(fallbackBase)) bases.push(fallbackBase);
    const localhostBase = 'http://localhost:8000/api';
    if (!bases.includes(localhostBase)) bases.push(localhostBase);
    for (let i = 0; i < bases.length; i++) {
      const base = bases[i];
      try {
        const res = await fetch(`${base}${path}`, { ...options, headers });
        if (!res.ok) {
          let detail = 'Request failed';
          try {
            const data = await res.json();
            detail = data.detail || data.message || detail;
          } catch {}
          throw new Error(detail);
        }
        const ct = res.headers.get('content-type') || '';
        if (base !== savedBase) localStorage.setItem('evoptima-api-base', base);
        return ct.includes('application/json') ? res.json() : res.text();
      } catch (err) {
        if (i === bases.length - 1) throw err;
      }
    }
  }

  function applyTheme() {
    document.body.classList.toggle('light', currentTheme === 'light');
    const btn = $('themeBtn');
    if (btn) btn.textContent = currentTheme === 'light' ? '🌙' : '☀️';
    localStorage.setItem('evoptima-theme', currentTheme);
  }

  function toggleLangMenu() {
    const menu = $('langMenu');
    if (menu) menu.classList.toggle('open');
  }

  function applyTexts() {
    document.documentElement.lang = currentLang === 'RU' ? 'ru' : currentLang === 'EN' ? 'en' : 'de';
    const langBtn = $('langBtn');
    if (langBtn) langBtn.textContent = `${currentLang} ▾`;

    if ($('brandSubtitle')) $('brandSubtitle').textContent = t('subtitle');

    if ($('routeTitle')) $('routeTitle').textContent = t('routePlanner');
    if ($('routeSub')) $('routeSub').textContent = t('routePlannerSub');
    if ($('fromLabel')) $('fromLabel').textContent = t('from');
    if ($('toLabel')) $('toLabel').textContent = t('to');
    if ($('makeLabel')) $('makeLabel').textContent = t('carMake');
    if ($('modelLabel')) $('modelLabel').textContent = t('carModel');
    if ($('batteryLabel')) $('batteryLabel').textContent = t('battery');
    if ($('routeBtn')) $('routeBtn').textContent = t('buildRoute');

    if ($('chatTitle')) $('chatTitle').textContent = t('chatbot');
    if ($('chatSubtitle')) $('chatSubtitle').textContent = t('chatbotSub');
    if ($('sendBtn')) $('sendBtn').textContent = t('send');
    if ($('chatInput')) $('chatInput').placeholder = t('messagePlaceholder');
    if ($('chatInput')) $('chatInput').disabled = true;
    if ($('sendBtn')) $('sendBtn').disabled = true;


    if ($('fromInput')) $('fromInput').placeholder = t('fromPlaceholder');
    if ($('toInput')) $('toInput').placeholder = t('toPlaceholder');
    if ($('makeInput')) $('makeInput').placeholder = t('makePlaceholder');
    if ($('modelInput')) $('modelInput').placeholder = t('modelPlaceholder');
    if ($('batteryInput')) $('batteryInput').placeholder = t('batteryPlaceholder');

    if ($('buySubscriptionBtn')) $('buySubscriptionBtn').textContent = (currentUser && currentUser.subscription_active) ? t('extendSubscription') : t('buySubscription');
    if ($('loginBtn')) $('loginBtn').textContent = t('login');
    if ($('logoutBtn')) $('logoutBtn').textContent = t('logout');
    if ($('editPhotoBtn')) $('editPhotoBtn').textContent = t('editPhoto');
    if ($('saveNameBtn')) $('saveNameBtn').textContent = t('save');
    if ($('nameInput')) $('nameInput').placeholder = t('newNamePlaceholder');
    if ($('editNameBtn')) $('editNameBtn').title = t('editName');
    if ($('footerNote')) $('footerNote').textContent = t('footerNote');
    if ($('tripHistory') && $('tripHistory').dataset.empty === 'true') $('tripHistory').textContent = token ? t('historyEmpty') : t('guestHistoryHint');
    if ($('subscriptionMeta')) {
      if (!token) {
        $('subscriptionMeta').textContent = t('guestSubscriptionHint');
      } else if (currentUser && currentUser.subscription_active) {
        $('subscriptionMeta').textContent = t('subscriptionActive');
      } else if (currentUser) {
        $('subscriptionMeta').textContent = t('trialLeft')(currentUser.free_queries_left);
      }
    }
    if ($('makeSearch')) $('makeSearch').placeholder = t('search');
    if ($('modelSearch')) $('modelSearch').placeholder = t('search');

    if ($('navMapBtn')) $('navMapBtn').textContent = t('map');
    if ($('navProfileBtn')) $('navProfileBtn').textContent = t('profile');
    if ($('faqToggle')) $('faqToggle').textContent = t('faq');
    if ($('profileTitle')) $('profileTitle').textContent = t('profileTitle');
    if ($('profileIntro')) {
      const introText = (tr[currentLang] && Object.prototype.hasOwnProperty.call(tr[currentLang], 'profileIntro'))
        ? tr[currentLang].profileIntro
        : '';
      $('profileIntro').textContent = introText || '';
      $('profileIntro').style.display = introText ? 'block' : 'none';
    }
    if ($('statsTitle')) $('statsTitle').textContent = t('statsTitle');
    if ($('statsUsersLabel')) $('statsUsersLabel').textContent = t('statsUsersLabel');
    if ($('statsTripsLabel')) $('statsTripsLabel').textContent = t('statsTripsLabel');
    if ($('statsMapLabel')) $('statsMapLabel').textContent = t('statsMapLabel');
    if ($('statsBatteryLabel')) $('statsBatteryLabel').textContent = t('statsBatteryLabel');
    if ($('subscriptionTitleCard')) $('subscriptionTitleCard').textContent = t('subscriptionCardTitle');
    if ($('historyTitle')) $('historyTitle').textContent = t('historyTitle');
    if ($('modalSubscriptionTitle')) $('modalSubscriptionTitle').textContent = t('modalSubscriptionTitle');
    if ($('modalSubscriptionText')) $('modalSubscriptionText').textContent = t('modalSubscriptionText');
    if ($('modalSubscriptionPrice')) $('modalSubscriptionPrice').textContent = t('modalSubscriptionPrice');
    if ($('modalSubscriptionHint')) $('modalSubscriptionHint').textContent = t('modalSubscriptionHint');
    if ($('subscriptionLaterBtn')) $('subscriptionLaterBtn').textContent = t('modalLater');
    if ($('subscriptionPayBtn')) $('subscriptionPayBtn').textContent = t('modalPay');
    if ($('alertTitle')) $('alertTitle').textContent = t('alertTitle');
    if ($('alertOkBtn')) $('alertOkBtn').textContent = t('alertOk');

    if ($('authTitle')) $('authTitle').textContent = page === 'login' ? t('loginTitle') : t('registerTitle');
    if ($('authSub')) $('authSub').textContent = page === 'login'
      ? t('authLoginSub')
      : t('authRegisterSub');
    if ($('authSubmitBtn')) $('authSubmitBtn').textContent = page === 'login' ? t('login') : t('registerAction');
    if ($('authEmail')) $('authEmail').placeholder = t('authEmailPlaceholder');
    if ($('authPassword')) $('authPassword').placeholder = t('authPasswordPlaceholder');
    if ($('authNickname')) $('authNickname').placeholder = t('authNicknamePlaceholder');
    if ($('authSwitchLink')) $('authSwitchLink').textContent = page === 'login' ? t('authNoAccount') : t('authHaveAccount');
    if ($('backBtn')) $('backBtn').textContent = t('back');
  }

  function setupCommonUi() {
    applyTheme();
    applyTexts();
    $('themeBtn')?.addEventListener('click', () => {
      currentTheme = currentTheme === 'light' ? 'dark' : 'light';
      applyTheme();
    });
    $('langBtn')?.addEventListener('click', toggleLangMenu);
    document.querySelectorAll('[data-lang]').forEach(btn => btn.addEventListener('click', () => {
      currentLang = btn.dataset.lang;
      localStorage.setItem('evoptima-lang', currentLang);
      $('langMenu')?.classList.remove('open');
      applyTexts();
      loadFaq();
    }));
    document.addEventListener('click', e => {
      const wrap = document.querySelector('.lang-wrap');
      if (wrap && !wrap.contains(e.target)) $('langMenu')?.classList.remove('open');
    });
    $('faqToggle')?.addEventListener('click', async () => {
      await loadFaq();
      $('faqPanel')?.classList.toggle('open');
    });
  }

  
async function loadFaq() {
  faqItems = FAQ_CATALOG[currentLang] || FAQ_CATALOG.RU;
  faqLoaded = true;
  renderFaq();
}

function renderFaq() {
  const panel = $('faqPanel');
  if (!panel) return;
  panel.innerHTML = '';
  faqItems.forEach(item => {
    const wrap = document.createElement('div');
    wrap.className = 'faq-item';
    wrap.innerHTML = `<button class="faq-question" type="button">${item.question}</button><div class="faq-answer">${item.answer}</div>`;
    wrap.querySelector('.faq-question').addEventListener('click', () => wrap.classList.toggle('open'));
    panel.appendChild(wrap);
  });
}


  
function appendMessage(text, role='bot') {
  return;
}


  function setView(view) {
    $('mapView')?.classList.toggle('active', view === 'map');
    $('profileView')?.classList.toggle('active', view === 'profile');
    $('navMapBtn')?.classList.toggle('active', view === 'map');
    $('navProfileBtn')?.classList.toggle('active', view === 'profile');
    if (view === 'profile') loadProfile();
    if (location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
  }

  function maskEmail(value) {
    if (!value) return '';
    const [name, domain] = value.split('@');
    if (!domain) return value;
    return `${name.slice(0, 3)}***@${domain}`;
  }

  async function reverseGeocode(coords) {
    try {
      const result = await ymaps.geocode(coords, { results: 1 });
      const first = result.geoObjects.get(0);
      return first ? first.getAddressLine() : '';
    } catch {
      return '';
    }
  }

  function persistLocation(coords) {
    lastKnownLocation = coords;
    localStorage.setItem('evoptima-last-location', JSON.stringify(coords));
    localStorage.setItem('evoptima-location-ts', String(Date.now()));
  }

  async function setUserLocation(coords, center = true) {
    if (!map) return;
    persistLocation(coords);
    if (userPlacemark) map.geoObjects.remove(userPlacemark);
    userPlacemark = new ymaps.Placemark(coords, {}, { preset: 'islands#blueCircleDotIcon' });
    map.geoObjects.add(userPlacemark);
    if (center) map.setCenter(coords, Math.max(map.getZoom(), 13), { duration: 250 });
    const address = await reverseGeocode(coords);
    if (address) {
      lastKnownAddress = address;
      localStorage.setItem('evoptima-last-address', address);
      $('fromInput').value = address;

    }
    await loadChargingStations();
  }

  async function restoreSavedLocation() {
    const cached = localStorage.getItem('evoptima-last-location');
    const ts = Number(localStorage.getItem('evoptima-location-ts') || 0);
    if (!cached || Date.now() - ts > 1000 * 60 * 60 * 6) return false;
    try {
      const coords = JSON.parse(cached);
      if (Array.isArray(coords) && coords.length === 2) {
        await setUserLocation(coords, true);
        return true;
      }
    } catch {}
    return false;
  }

  function requestBrowserGeolocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('unavailable'));
      navigator.geolocation.getCurrentPosition(
        pos => resolve([pos.coords.latitude, pos.coords.longitude]),
        reject,
        { enableHighAccuracy: true, timeout: 9000, maximumAge: 600000 }
      );
    });
  }

  async function detectLocation(force = false) {
    if (!force && await restoreSavedLocation()) return;
    try {
      const coords = await requestBrowserGeolocation();
      await setUserLocation(coords, true);
    } catch {
      openAlertModal(t('geoUnavailable'));
    }
  }

  async function setDestination(coords) {
    destinationCoords = coords;
    if (destinationPlacemark) map.geoObjects.remove(destinationPlacemark);
    destinationPlacemark = new ymaps.Placemark(coords, {}, { preset: 'islands#redDotIcon' });
    map.geoObjects.add(destinationPlacemark);
    const address = await reverseGeocode(coords);
    if (address) {
      $('toInput').value = address;
      // destination selected message intentionally omitted to avoid duplicated system messages;
    }
  }

  async function ensureYMaps() {
    if (window.ymaps) {
      await new Promise(resolve => ymaps.ready(resolve));
      return;
    }
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YMAPS_API_KEY}&lang=ru_RU`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    await new Promise(resolve => ymaps.ready(resolve));
  }

  async function initMap() {
    try {
      await ensureYMaps();
    } catch (err) {
      console.error('Yandex Maps failed to load', err);
      openAlertModal(t('mapLoadFailed'));
      return;
    }
    map = new ymaps.Map('map', {
      center: [55.751244, 37.618423],
      zoom: 11,
      controls: []
    });
    map.events.add('click', e => setDestination(e.get('coords')));
    $('zoomInBtn').addEventListener('click', () => map.setZoom(map.getZoom() + 1, { duration: 150 }));
    $('zoomOutBtn').addEventListener('click', () => map.setZoom(map.getZoom() - 1, { duration: 150 }));
    $('geoBtn').addEventListener('click', () => detectLocation(true));
    await detectLocation(false);
  }

  async function loadChargingStations() {
    if (!lastKnownLocation || !map) return;
    try {
      const data = await api(`/charging/nearby?lat=${lastKnownLocation[0]}&lon=${lastKnownLocation[1]}&distance_km=25&max_results=25`);
      if (chargerCollection) map.geoObjects.remove(chargerCollection);
      chargerCollection = new ymaps.GeoObjectCollection();
      (data.items || []).forEach(item => {
        if (item.lat && item.lon) {
          chargerCollection.add(new ymaps.Placemark([item.lat, item.lon], {
            balloonContentHeader: item.title || 'Зарядная станция',
            balloonContentBody: `${item.address || ''}${item.town ? `, ${item.town}` : ''}<br>${item.status || ''}`
          }, { preset: 'islands#orangeCircleDotIcon' }));
        }
      });
      map.geoObjects.add(chargerCollection);
    } catch {}
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function formatKm(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(number >= 100 ? 0 : 1)} км` : '—';
  }

  function renderRoutePlan(plan) {
    const box = $('routePlanResult');
    if (!box || !plan) return;
    const stops = Array.isArray(plan.stops) ? plan.stops : [];
    const warnings = Array.isArray(plan.warnings) ? plan.warnings.filter(Boolean) : [];
    box.classList.remove('hidden');
    box.innerHTML = `
      <div class="route-plan-head">
        <div class="route-plan-title">${escapeHtml(plan.charging_required ? 'План зарядок' : 'Маршрут без зарядки')}</div>
        <div class="route-plan-summary">${escapeHtml(plan.summary || '')}</div>
      </div>
      <div class="route-metrics">
        <div class="route-metric"><span>Дистанция</span><strong>${escapeHtml(formatKm(plan.estimated_distance_km))}</strong></div>
        <div class="route-metric"><span>Энергия</span><strong>${escapeHtml(plan.estimated_energy_needed_kwh)} кВт*ч</strong></div>
        <div class="route-metric"><span>Остаток без зарядки</span><strong>${escapeHtml(plan.estimated_arrival_battery_without_charging_percent)}%</strong></div>
        <div class="route-metric"><span>Остановок</span><strong>${stops.length}</strong></div>
      </div>
      ${stops.length ? `<div class="route-stop-list">${stops.map(stop => `
        <div class="route-stop">
          <div class="route-stop-top">
            <div class="route-stop-name">${escapeHtml(stop.title || `Остановка ${stop.order}`)}</div>
            <div class="route-stop-chip">${escapeHtml(formatKm(stop.distance_from_start_km))}</div>
          </div>
          <div class="route-stop-meta">${escapeHtml([stop.address, stop.town].filter(Boolean).join(', ') || 'Точка рассчитана, конкретная станция не найдена')}</div>
          <div class="route-stop-meta">Приезд: ${escapeHtml(stop.battery_on_arrival_percent)}% · зарядить до ${escapeHtml(stop.recommended_charge_to_percent)}% · примерно ${escapeHtml(stop.estimated_charge_kwh)} кВт*ч</div>
          <div class="route-stop-meta">Время: ${stop.estimated_charge_minutes ? `${escapeHtml(stop.estimated_charge_minutes)} мин` : 'нет данных'} · мощность: ${stop.charger_power_kw ? `${escapeHtml(stop.charger_power_kw)} кВт` : 'нет данных'}</div>
          <div class="route-stop-meta">Разъём авто: ${escapeHtml(stop.vehicle_connector || 'не определён')}${stop.connector_match ? ' · подходит' : ''}</div>
          ${!stop.reachable_with_current_charge ? `<div class="route-warning">До этой точки не хватает текущего заряда. Нужно зарядиться ближе к старту.</div>` : ''}
          ${stop.connection_types?.length ? `<div class="route-stop-meta">${escapeHtml(stop.connection_types.join(', '))}</div>` : ''}
        </div>
      `).join('')}</div>` : ''}
      ${warnings.length ? warnings.slice(0, 3).map(item => `<div class="route-warning">${escapeHtml(item)}</div>`).join('') : ''}
    `;
  }

  function renderRouteStopMarkers(stops) {
    if (!map || !window.ymaps) return;
    try {
      if (routeStopCollection) map.geoObjects.remove(routeStopCollection);
      routeStopCollection = new ymaps.GeoObjectCollection();
      (stops || []).forEach(stop => {
        if (stop.lat && stop.lon) {
          routeStopCollection.add(new ymaps.Placemark([stop.lat, stop.lon], {
            balloonContentHeader: stop.title || `Остановка ${stop.order}`,
            balloonContentBody: `${stop.address || ''}<br>Зарядить до ${stop.recommended_charge_to_percent}%`
          }, { preset: 'islands#blueCircleDotIcon' }));
        }
      });
      map.geoObjects.add(routeStopCollection);
    } catch {}
  }

  function waypointCoords(point) {
    if (Array.isArray(point) && point.length >= 2) return [Number(point[0]), Number(point[1])];
    return null;
  }

  function samePoint(a, b) {
    const first = waypointCoords(a);
    const second = waypointCoords(b);
    if (!first || !second) return false;
    return Math.abs(first[0] - second[0]) < 0.003 && Math.abs(first[1] - second[1]) < 0.003;
  }

  async function renderPlannedRoute(plan, from, to) {
    if (!map || !window.ymaps) return;
    const geometry = Array.isArray(plan?.route_geometry)
      ? plan.route_geometry.map(point => [Number(point.lat), Number(point.lon)]).filter(point => Number.isFinite(point[0]) && Number.isFinite(point[1]))
      : [];
    if (geometry.length >= 2) {
      try {
        if (routeLine) map.geoObjects.remove(routeLine);
        routeLine = new ymaps.Polyline(geometry, {}, {
          strokeColor: '#118dff',
          strokeOpacity: 0.95,
          strokeWidth: 6,
        });
        map.geoObjects.add(routeLine);
        map.setBounds(ymaps.util.bounds.fromPoints(geometry), { checkZoomRange: true, duration: 250 });
        return;
      } catch (err) {
        console.warn('Failed to render backend route geometry', err);
      }
    }

    const waypoints = [from || lastKnownLocation].filter(Boolean);
    (plan?.stops || []).forEach(stop => {
      const point = stop.lat && stop.lon ? [Number(stop.lat), Number(stop.lon)] : null;
      if (point && !samePoint(waypoints[waypoints.length - 1], point)) waypoints.push(point);
    });
    const finish = destinationCoords || to;
    if (finish && !samePoint(waypoints[waypoints.length - 1], finish)) waypoints.push(finish);
    if (waypoints.length < 2) return;

    try {
      if (routeLine) map.geoObjects.remove(routeLine);
      const route = await ymaps.route(waypoints, {
        mapStateAutoApply: true,
        routingMode: 'auto',
      });
      if (route.getPaths && route.getPaths().each) {
        route.getPaths().each(path => path.options.set({
          strokeColor: '#118dff',
          strokeOpacity: 0.95,
          strokeWidth: 7,
        }));
      }
      if (route.getWayPoints && route.getWayPoints().options) {
        route.getWayPoints().options.set('visible', false);
      }
      if (route.getViaPoints && route.getViaPoints().options) {
        route.getViaPoints().options.set('visible', false);
      }
      routeLine = route;
      map.geoObjects.add(route);
      const bounds = route.getBounds && route.getBounds();
      if (bounds) map.setBounds(bounds, { checkZoomRange: true, duration: 250 });
    } catch (err) {
      console.warn('Failed to render planned route with charging stops', err);
      openAlertModal('Яндекс.Карты не смогли построить дорожный маршрут через выбранные зарядки. Попробуйте другую зарядку или конечный адрес.');
    }
  }

  async function buildRoute() {
    const from = $('fromInput').value.trim() || lastKnownAddress;
    const to = $('toInput').value.trim();
    const make = $('makeInput').value.trim();
    const model = $('modelInput').value.trim();
    const battery = $('batteryInput').value.trim();
    let routeDistanceKm = null;

    if (!token) {
      clearRenderedRoute();
      openAlertModal(t('routeLoginRequired'));
      return;
    }
    const accountBlocked = !!currentUser && !currentUser.subscription_active && currentUser.free_queries_left <= 0;
    if (accountBlocked) {
      clearRenderedRoute();
      openSubscriptionModal();
      return;
    }

    if (!make || !model || !battery) {
      openAlertModal(t('routeNeedVehicleFields'));
      return;
    }

    if (!to && !destinationCoords) {
      openAlertModal(t('routeNeedDestination'));
      return;
    }
    const routeBtn = $('routeBtn');
    const routeBtnText = routeBtn ? routeBtn.textContent : '';
    if (routeBtn) {
      routeBtn.disabled = true;
      routeBtn.textContent = 'Считаю маршрут...';
    }
    try {
      if (routeLine) map.geoObjects.remove(routeLine);
    } catch {}


    try {
      const plan = await api('/trips/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_address: from || '',
          to_address: to || '',
          vehicle_make: make || null,
          vehicle_model: model || null,
          battery_percent: battery || null,
          current_battery_percent: Number(battery),
          from_lat: lastKnownLocation ? lastKnownLocation[0] : null,
          from_lon: lastKnownLocation ? lastKnownLocation[1] : null,
          to_lat: destinationCoords ? destinationCoords[0] : null,
          to_lon: destinationCoords ? destinationCoords[1] : null,
          route_distance_km: routeDistanceKm,
          preferred_connector: null,
          save_trip: true,
        })
      });
      renderRoutePlan(plan);
      renderRouteStopMarkers(plan.stops);
      const plannedFrom = plan.from_point ? [plan.from_point.lat, plan.from_point.lon] : (lastKnownLocation || from);
      const plannedTo = plan.to_point ? [plan.to_point.lat, plan.to_point.lon] : (destinationCoords || to);
      await renderPlannedRoute(plan, plannedFrom, plannedTo);
      await loadProfile();
      if (currentUser && !currentUser.subscription_active && currentUser.free_queries_left <= 0) {
        clearRenderedRoute();
        openSubscriptionModal();
      }
    } catch (err) {
      if (String(err?.message || '').toLowerCase().includes('subscription') || String(err?.message || '').includes('402')) {
        clearRenderedRoute();
        openSubscriptionModal();
      } else {
        openAlertModal(t('routeSaveFailed'));
      }
    } finally {
      if (routeBtn) {
        routeBtn.disabled = false;
        routeBtn.textContent = routeBtnText || t('buildRoute');
      }
    }
  }

  
async function sendChatMessage() {
  return;
}


  
async function loadProfile() {
  if (!$('profileView')) return;
  if (!token) {
    currentUser = null;
    resetProfileToLoggedOut();
    if ($('subscriptionMeta')) $('subscriptionMeta').textContent = t('guestSubscriptionHint');
    if ($('tripHistory')) {
      $('tripHistory').dataset.empty = 'true';
      $('tripHistory').textContent = t('guestHistoryHint');
    }
    applyTexts();
    return;
  }

    try {
      currentUser = await api('/auth/me');
      $('loggedOutBox').style.display = 'none';
      $('loggedInBox').style.display = 'block';
      $('avatarWrap').style.display = 'flex';
      $('profileNick').textContent = currentUser.nickname;
      $('profileMail').textContent = maskEmail(currentUser.email);
      if (!currentUser.subscription_active && Number(currentUser.free_queries_left) === 0 && Number(currentUser.free_queries_used) === 0) {
        currentUser.free_queries_left = 5;
        currentUser.trial_limit = 5;
      }
      $('subscriptionMeta').textContent = currentUser.subscription_active ? t('subscriptionActive') : t('trialLeft')(currentUser.free_queries_left);
      applyTexts();
      if (currentUser.avatar_url) {
        const url = currentUser.avatar_url.startsWith('http') ? currentUser.avatar_url : `${API_BASE.replace('/api','')}${currentUser.avatar_url}`;
        $('profileAvatar').innerHTML = `<img src="${url}" alt="avatar">`;
      } else {
        $('profileAvatar').textContent = (currentUser.nickname || 'EV').slice(0,2).toUpperCase();
      }
      await loadTrips();
    } catch {
      token = '';
      localStorage.removeItem('evoptima-token');
      resetProfileToLoggedOut();
    }
  }

  async function loadTrips() {
    const box = $('tripHistory');
    if (!box || !token) return;
    try {
      const trips = await api('/trips');
      if (!trips.length) {
        box.dataset.empty = 'true';
        box.textContent = t('historyEmpty');
        return;
      }
      box.dataset.empty = 'false';
      box.innerHTML = trips.map(t => `
        <div class="trip-item">
          <div class="trip-from">${t.from_address}</div>
          <div class="trip-to">→ ${t.to_address}</div>
          <div class="trip-meta">${[t.vehicle_make, t.vehicle_model].filter(Boolean).join(' ')}${t.battery_percent ? ' • ' + t.battery_percent + '%' : ''}</div>
        </div>
      `).join('');
    } catch {
      box.dataset.empty = 'true';
      box.textContent = t('historyEmpty');
    }
  }

  async function loadMakes(query='') {
    try {
      const data = await api(`/vehicles/makes?query=${encodeURIComponent(query)}`);
      renderDropdownItems('makeItems', data.items || [], item => item, item => {
        $('makeInput').value = item;
        $('makeDropdown').classList.remove('open');
        $('modelInput').value = '';
        loadModels(item, '');
      });
    } catch {
      renderDropdownItems('makeItems', [], item => item, ()=>{});
    }
  }

  async function loadModels(make, query='') {
    if (!make) {
      renderDropdownItems('modelItems', [], item => item, ()=>{});
      return;
    }
    try {
      const data = await api(`/vehicles/models?make=${encodeURIComponent(make)}&query=${encodeURIComponent(query)}`);
      renderDropdownItems('modelItems', data.items || [], item => item.model, item => {
        $('modelInput').value = item.model;
        $('modelDropdown').classList.remove('open');
      });
    } catch {
      renderDropdownItems('modelItems', [], item => item, ()=>{});
    }
  }

  function renderDropdownItems(containerId, items, labelFn, onPick) {
    const container = $(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (!items.length) {
      const div = document.createElement('div');
      div.className = 'dropdown-empty';
      div.textContent = t('noResults');
      container.appendChild(div);
      return;
    }
    items.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dropdown-item';
      btn.textContent = labelFn(item);
      btn.addEventListener('click', () => onPick(item));
      container.appendChild(btn);
    });
  }

  function setupDropdowns() {
    const open = (id) => $(id).classList.add('open');
    const closeAll = () => ['makeDropdown','modelDropdown'].forEach(id => $(id)?.classList.remove('open'));

    $('makeInput').addEventListener('focus', async () => { open('makeDropdown'); await loadMakes(''); });
    $('makeInput').addEventListener('input', async e => { open('makeDropdown'); $('makeSearch').value = e.target.value; await loadMakes(e.target.value); });
    $('makeSearch').addEventListener('input', async e => { await loadMakes(e.target.value); });

    $('modelInput').addEventListener('focus', async () => { open('modelDropdown'); await loadModels($('makeInput').value.trim(), ''); });
    $('modelInput').addEventListener('input', async e => { open('modelDropdown'); $('modelSearch').value = e.target.value; await loadModels($('makeInput').value.trim(), e.target.value); });
    $('modelSearch').addEventListener('input', async e => { await loadModels($('makeInput').value.trim(), e.target.value); });

    document.addEventListener('click', e => {
      if (!e.target.closest('.dropdown-wrap')) closeAll();
    });
  }

  
function openSubscriptionModal() {
  if ($('modalSubscriptionText') && $('subscriptionPayBtn') && $('modalSubscriptionTitle')) {
    if (!token) {
      $('modalSubscriptionTitle').textContent = t('modalSubscriptionTitle');
      $('modalSubscriptionText').textContent = t('guestSubscriptionHint');
      $('subscriptionPayBtn').textContent = t('modalNeedLoginPay');
    } else if (currentUser && currentUser.subscription_active) {
      $('modalSubscriptionTitle').textContent = t('extendSubscription');
      $('modalSubscriptionText').textContent = t('extendSubscriptionText');
      $('subscriptionPayBtn').textContent = t('extendSubscription');
    } else {
      $('modalSubscriptionTitle').textContent = t('modalSubscriptionTitle');
      $('modalSubscriptionText').textContent = t('modalSubscriptionText');
      $('subscriptionPayBtn').textContent = t('modalPay');
    }
  }
  $('subscriptionOverlay').classList.add('open');
}

  function closeSubscriptionModal() { $('subscriptionOverlay').classList.remove('open'); }

  async function activateSubscription() {
    if (!token) {
      window.location.href = 'login.html';
      return;
    }
    try {
      await api('/subscription/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'monthly' })
      });
      closeSubscriptionModal();
      await loadProfile();

    } catch (err) {
      openAlertModal(err.message || 'Не удалось активировать подписку.');
    }
  }

  async function handlePhotoUpload(file) {
    if (!file || !token) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const data = await api('/profile/avatar', { method: 'POST', body: form });
      if (data.avatar_url) {
        const url = `${API_BASE.replace('/api','')}${data.avatar_url}`;
        $('profileAvatar').innerHTML = `<img src="${url}" alt="avatar">`;
      }
    } catch {}
  }

  async function saveNickname() {
    const nickname = $('nameInput').value.trim();
    if (!nickname || !token) return;
    try {
      const data = await api('/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname })
      });
      $('profileNick').textContent = data.nickname;
      $('nameEditRow').style.display = 'none';
    } catch {}
  }

  async function setupIndexPage() {
    const initialView = location.hash === '#profile' ? 'profile' : 'map';
    setView(initialView);

    $('navMapBtn').addEventListener('click', () => setView('map'));
    $('navProfileBtn').addEventListener('click', () => setView('profile'));
    if ($('messages')) $('messages').innerHTML = '';
    $('loginBtn').addEventListener('click', () => { window.location.href = 'login.html'; });
    $('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('evoptima-token');
      token = '';
      currentUser = null;
      resetProfileToLoggedOut();
      setView('profile');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    $('editNameBtn').addEventListener('click', () => {
      const row = $('nameEditRow');
      row.style.display = row.style.display === 'flex' ? 'none' : 'flex';
      $('nameInput').value = $('profileNick').textContent.trim();
    });
    $('saveNameBtn').addEventListener('click', saveNickname);
    $('editPhotoBtn').addEventListener('click', () => $('photoInput').click());
    $('photoInput').addEventListener('change', e => handlePhotoUpload(e.target.files && e.target.files[0]));
    $('routeBtn').addEventListener('click', buildRoute);
    $('sendBtn').disabled = true;
    $('chatInput').disabled = true;
    $('sendBtn').addEventListener('click', sendChatMessage);
    $('subscriptionLaterBtn').addEventListener('click', closeSubscriptionModal);
    $('subscriptionPayBtn').addEventListener('click', activateSubscription);
    $('alertOkBtn')?.addEventListener('click', closeAlertModal);
    $('buySubscriptionBtn').addEventListener('click', openSubscriptionModal);
    $('subscriptionOverlay').addEventListener('click', e => { if (e.target === $('subscriptionOverlay')) closeSubscriptionModal(); });
    $('alertOverlay')?.addEventListener('click', e => { if (e.target === $('alertOverlay')) closeAlertModal(); });

    setupDropdowns();
    await initMap();
    await loadFaq();
    await loadProfile();
  }

  async function setupAuthPage(mode) {
    const form = $('authForm');
    const error = $('authError');
    await loadFaq();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      error.textContent = '';
      const fd = new FormData(form);
      try {
        if (mode === 'register') {
          await api('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nickname: String(fd.get('nickname') || '').trim(),
              email: String(fd.get('email') || '').trim(),
              password: String(fd.get('password') || '').trim()
            })
          });
          window.location.href = 'login.html';
        } else {
          const loginData = await api('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: String(fd.get('email') || '').trim(),
              password: String(fd.get('password') || '').trim()
            })
          });
          localStorage.setItem('evoptima-token', loginData.access_token);
          token = loginData.access_token;
          try { setGuestQueriesUsed(0); } catch {}
          window.location.href = 'index.html#profile';
        }
      } catch (err) {
        error.textContent = err.message || t('authFailed');
      }
    });
  }

  setupCommonUi();
  if (page === 'login') setupAuthPage('login');
  if (page === 'register') setupAuthPage('register');
  if (page === 'index') setupIndexPage();
})();
