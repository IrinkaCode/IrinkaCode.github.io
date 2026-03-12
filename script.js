const API_KEY = '9bd718ac7f81d3d09bdec17036727878';

let forecastData   = null;   // сюда сохраняем прогноз на 5 дней
let selectedDayIdx = 0;      // какой день выбран во вкладке forecast
let currentTab     = 'today';

  // Фиксированный список городов для блока "Nearby"
const nearbyCities = [
    { name: 'London', lat: 51.51, lon: -0.13 },
    { name: 'Paris',  lat: 48.85, lon:  2.35 },
    { name: 'Berlin', lat: 52.52, lon: 13.41 },
    { name: 'Warsaw', lat: 52.23, lon: 21.01 },
    { name: 'Vienna', lat: 48.21, lon: 16.37 },
    { name: 'Rome',   lat: 41.90, lon: 12.50 },
];

const dayNames   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];


// ЗАПУСК — определяем местоположение
// =============================================

window.onload = function() {
  if (navigator.geolocation) {
      // Браузер поддерживает геолокацию — запрашиваем координаты
    navigator.geolocation.getCurrentPosition(
      function(pos) {
          // Пользователь разрешил — грузим по координатам
        loadByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      function() {
          // Пользователь запретил — грузим Москву
        loadByCity('Moscow');
      }
    );
  } else {
      // Браузер не умеет геолокацию — грузим Москву
    loadByCity('Moscow');
  }
};


  // =============================================
  // ПОИСК ГОРОДА
  // =============================================

  function searchCity() {
    var city = document.getElementById('cityInput').value.trim();
    if (!city) return;
    loadByCity(city);
  }

  // Enter в поле поиска — тоже ищет
  document.getElementById('cityInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') searchCity();
  });


  // =============================================
  // ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
  // =============================================

  function showTab(name) {
    currentTab = name;

    // Убираем active у обеих кнопок, потом ставим нужной
    document.getElementById('tab-today').classList.remove('active');
    document.getElementById('tab-forecast').classList.remove('active');
    document.getElementById('tab-' + name).classList.add('active');

    // Скрываем обе панели, показываем нужную
    document.getElementById('panel-today').classList.add('hidden');
    document.getElementById('panel-forecast').classList.add('hidden');
    document.getElementById('panel-' + name).classList.remove('hidden');

    // Если открыли forecast и данные уже есть — рисуем
    if (name === 'forecast' && forecastData) {
      renderForecast();
    }
  }


  // =============================================
  // ЗАГРУЗКА ПО НАЗВАНИЮ ГОРОДА
  // =============================================

  function loadByCity(city) {
    showLoading();

    // Запрос текущей погоды
    var weatherUrl = 'https://api.openweathermap.org/data/2.5/weather'
      + '?q=' + encodeURIComponent(city)
      + '&units=metric&lang=en&appid=' + API_KEY;

    // Запрос прогноза на 5 дней
    var forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast'
      + '?q=' + encodeURIComponent(city)
      + '&units=metric&lang=en&appid=' + API_KEY;

    // Шаг 1: запрашиваем текущую погоду
    fetch(weatherUrl)
      .then(function(response) { return response.json(); })
      .then(function(weather) {

        // Проверяем ошибки API
        if (weather.cod === 401) { showError('Неверный API ключ.'); return; }
        if (weather.cod === '404') { showNotFound(); return; }

        // Ставим официальное название в строку поиска
        document.getElementById('cityInput').value = weather.name;

        // Шаг 2: запрашиваем прогноз
        fetch(forecastUrl)
          .then(function(response) { return response.json(); })
          .then(function(forecast) {
            forecastData   = forecast;
            selectedDayIdx = 0;
            renderToday(weather, forecast);
            if (currentTab === 'forecast') renderForecast();
          });
      })
      .catch(function() {
        showError('Нет соединения с сервером.');
      });
  }


  // =============================================
  // ЗАГРУЗКА ПО КООРДИНАТАМ (геолокация)
  // =============================================

  function loadByCoords(lat, lon) {
    showLoading();

    var weatherUrl = 'https://api.openweathermap.org/data/2.5/weather'
      + '?lat=' + lat + '&lon=' + lon
      + '&units=metric&lang=en&appid=' + API_KEY;

    var forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast'
      + '?lat=' + lat + '&lon=' + lon
      + '&units=metric&lang=en&appid=' + API_KEY;

    fetch(weatherUrl)
      .then(function(response) { return response.json(); })
      .then(function(weather) {
        if (weather.cod === 401 || weather.cod === '401') {
          showError('Неверный API ключ.');
          return;
        }

        document.getElementById('cityInput').value = weather.name;

        fetch(forecastUrl)
          .then(function(response) { return response.json(); })
          .then(function(forecast) {
            forecastData   = forecast;
            selectedDayIdx = 0;
            renderToday(weather, forecast);
          });
      })
      .catch(function() {
        // Если координаты не сработали — грузим Москву
        loadByCity('Moscow');
      });
  }


  // =============================================
  // РИСУЕМ ВКЛАДКУ TODAY
  // =============================================

  function renderToday(weather, forecast) {
    var html = '';

    // Считаем рассвет, закат и длительность дня
    var sunrise = new Date(weather.sys.sunrise * 1000);
    var sunset  = new Date(weather.sys.sunset  * 1000);
    var diffMs  = sunset - sunrise;
    var diffH   = Math.floor(diffMs / 3600000);
    var diffM   = Math.floor((diffMs % 3600000) / 60000);

    // --- Блок 1: Текущая погода ---
    html += '<div class="block">';
    html += '  <div class="block-title">CURRENT WEATHER - ' + weather.name + '';
    html += '    <span class="current-date">' + formatDate(new Date()) + '</span>';
    html += '  </div>';
    html += '  <div class="current-body">';
    html += '    <div class="current-icon">';
    html += '      <div class="icon">' + getIcon(weather.weather[0].id, weather.weather[0].icon) + '</div>';
    html += '      <div class="desc">' + cap(weather.weather[0].description) + '</div>';
    html += '    </div>';
    html += '    <div class="current-temp">';
    html += '      <div class="temp">' + Math.round(weather.main.temp) + '°C</div>';
    html += '      <div class="feels">Real Feel ' + Math.round(weather.main.feels_like) + '°</div>';
    html += '    </div>';
    html += '    <div class="current-sun">';
    html += '      <div><span class="label">Sunrise:</span> '  + time12(sunrise) + '</div>';
    html += '      <div><span class="label">Sunset:</span> '   + time12(sunset)  + '</div>';
    html += '      <div><span class="label">Duration:</span> ' + diffH + ':' + pad(diffM) + ' hr</div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';

    // --- Блок 2: Почасовой прогноз ---
    // Собираем записи на сегодня из forecast.list
    var todayKey  = dateKey(new Date());
    var hours     = [];

    for (var i = 0; i < forecast.list.length; i++) {
      if (dateKey(new Date(forecast.list[i].dt * 1000)) === todayKey) {
        hours.push(forecast.list[i]);
      }
    }

    // Если сегодняшних нет (конец дня) — берём первые записи
    if (hours.length === 0) {
      hours = forecast.list.slice(0, 6);
    }

    html += '<div class="block">';
    html += '  <div class="block-title">HOURLY</div>';
    html += '  <table class="hourly-table">';
    html += renderHourlyTable(hours);
    html += '  </table>';
    html += '</div>';

    // --- Блок 3: Ближайшие города ---
    html += '<div class="block">';
    html += '  <div class="block-title">NEARBY PLACES</div>';
    html += '  <div class="nearby-grid" id="nearbyGrid">';
    html += '    <div style="padding:15px;color:#bbb;grid-column:span 2">Загрузка...</div>';
    html += '  </div>';
    html += '</div>';

    document.getElementById('panel-today').innerHTML = html;

    // Загружаем ближайшие города отдельно
    loadNearby();
  }


  // =============================================
  // СТРОИМ ТАБЛИЦУ ПОЧАСОВОГО ПРОГНОЗА
  // (используется и в Today, и в Forecast)
  // =============================================

  function renderHourlyTable(hours) {
    let html = '';

    // Строка 1: заголовок — "TODAY" + часы
    html += '<tr class="row-head">';
    html += '  <td class="lbl">TODAY</td>';
    for (var i = 0; i < hours.length; i++) {
      html += '<td>' + time12(new Date(hours[i].dt * 1000)) + '</td>';
    }
    html += '</tr>';

    // Строка 2: иконки
    html += '<tr><td class="lbl"></td>';
    for (var i = 0; i < hours.length; i++) {
    html += '<td class="icon-cell">' + getIcon(hours[i].weather[0].id, hours[i].weather[0].icon) + '</td>';
    }
    html += '</tr>';

    // Строка 3: описание
    html += '<tr><td class="lbl">Forecast</td>';
    for (var i = 0; i < hours.length; i++) {
      html += '<td class="desc-cell">' + cap(hours[i].weather[0].description) + '</td>';
    }
    html += '</tr>';

    // Строка 4: температура
    html += '<tr><td class="lbl">Temp (°C)</td>';
    for (var i = 0; i < hours.length; i++) {
      html += '<td class="temp-cell">' + Math.round(hours[i].main.temp) + '°</td>';
    }
    html += '</tr>';

    // Строка 5: ощущаемая
    html += '<tr><td class="lbl">RealFeel</td>';
    for (var i = 0; i < hours.length; i++) {
      html += '<td class="feels-cell">' + Math.round(hours[i].main.feels_like) + '°</td>';
    }
    html += '</tr>';

    // Строка 6: ветер
    html += '<tr><td class="lbl">Wind (m/s)</td>';
    for (var i = 0; i < hours.length; i++) {
      html += '<td class="wind-cell">' + Math.round(hours[i].wind.speed) + ' ' + windDir(hours[i].wind.deg) + '</td>';
    }
    html += '</tr>';

    return html;
  }


  // =============================================
  // БЛИЖАЙШИЕ ГОРОДА
  // =============================================

  function loadNearby() {
    var results = [];
    var loaded  = 0;

    for (var i = 0; i < nearbyCities.length; i++) {
      // Замыкание — фиксируем переменную city для каждой итерации
      (function(city) {
        var url = 'https://api.openweathermap.org/data/2.5/weather'
          + '?lat=' + city.lat + '&lon=' + city.lon
          + '&units=metric&lang=en&appid=' + API_KEY;

        fetch(url)
          .then(function(r) { return r.json(); })
          .then(function(data) {
            results.push({
              name: data.name,
              temp: data.main.temp,
              id:   data.weather[0].id,
              icon: data.weather[0].icon
            });
          })
          .catch(function() { /* пропускаем если город не загрузился */ })
          .finally(function() {
            loaded++;
            // Когда все города загружены — рисуем
            if (loaded === nearbyCities.length) {
              var el = document.getElementById('nearbyGrid');
              if (!el) return;

              var html = '';
              for (var j = 0; j < results.length; j++) {
                var c = results[j];
                html += '<div class="nearby-item">';
                html += '  <span class="name">' + c.name + '</span>';
                html += '  <span class="icon">' + getIcon(c.id, c.icon) + '</span>';
                html += '  <span class="temp">' + Math.round(c.temp) + '°C</span>';
                html += '</div>';
              }
              el.innerHTML = html || '<div style="padding:15px;color:#bbb">Нет данных</div>';
            }
          });
      })(nearbyCities[i]);
    }
  }


  // =============================================
  // РИСУЕМ ВКЛАДКУ 5-DAY FORECAST
  // =============================================

  function renderForecast() {
    if (!forecastData) return;

    // Группируем все записи прогноза по дням
    let days     = {};   // { '2024-01-15': [item, item, ...] }
    let dayOrder = [];   // порядок дней

    for (var i = 0; i < forecastData.list.length; i++) {
      var item = forecastData.list[i];
      var key  = dateKey(new Date(item.dt * 1000));
      if (!days[key]) {
        days[key] = [];
        dayOrder.push(key);
      }
      days[key].push(item);
    }

    dayOrder = dayOrder.slice(0, 5);  // только 5 дней

    let html = '';

    // --- Блок 1: карточки дней ---
    html += '<div class="block">';
    html += '  <div class="block-title">5-DAY FORECAST</div>';
    html += '  <div class="days-row">';

    for (var i = 0; i < dayOrder.length; i++) {
      let items = days[dayOrder[i]];
      let noon  = noonItem(items);        // запись ближайшая к 12:00
      let d     = new Date(noon.dt * 1000);

      // Мин и макс температура за день
      let minT = items[0].main.temp_min;
      let maxT = items[0].main.temp_max;
      for (var j = 1; j < items.length; j++) {
        if (items[j].main.temp_min < minT) minT = items[j].main.temp_min;
        if (items[j].main.temp_max > maxT) maxT = items[j].main.temp_max;
      }

      let sel = (i === selectedDayIdx) ? 'selected' : '';

      html += '<div class="day-card ' + sel + '" onclick="selectDay(' + i + ')">';
      html += '  <div class="day-name">' + dayNames[d.getDay()] + '</div>';
      html += '  <div class="day-date">' + d.getDate() + ' ' + monthNames[d.getMonth()] + '</div>';
      html += '  <div class="icon">'     + getIcon(noon.weather[0].id, noon.weather[0].icon) + '</div>';
      html += '  <div class="temp">'     + Math.round(maxT) + '° / ' + Math.round(minT) + '°</div>';
      html += '  <div class="desc">'     + cap(noon.weather[0].description) + '</div>';
      html += '</div>';
    }

    html += '  </div>';
    html += '</div>';

    // --- Блок 2: почасовой прогноз выбранного дня ---
    let selItems = days[dayOrder[selectedDayIdx]];
    let selDate  = new Date(selItems[0].dt * 1000);

    html += '<div class="block">';
    html += '  <div class="block-title">HOURLY — '
      + selDate.getDate() + ' ' + monthNames[selDate.getMonth()] + '</div>';
    html += '  <table class="hourly-table">';
    html += renderHourlyTable(selItems);
    html += '  </table>';
    html += '</div>';

    document.getElementById('panel-forecast').innerHTML = html;
  }

  // Клик по карточке дня
  function selectDay(idx) {
    selectedDayIdx = idx;
    renderForecast();
  }


  // =============================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // =============================================

  function showLoading() {
    document.getElementById('panel-today').innerHTML =
      '<div class="message"><div class="icon">⏳</div><div>Загружаем данные...</div></div>';
  }

  function showError(msg) {
    document.getElementById('panel-today').innerHTML =
      '<div class="error-box"><b>Ошибка:</b> ' + msg + '</div>';
  }

  function showNotFound() {
    document.getElementById('panel-today').innerHTML =
      '<div class="message">'
      + '<div class="icon">🔍</div>'
      + '<div><b>Город не найден</b></div>'
      + '<div style="margin-top:8px;font-size:13px;color:#bbb">Проверьте написание</div>'
      + '</div>';
  }

  // Формат даты: "30.06.2024"
  function formatDate(date) {
    return pad(date.getDate()) + '.' + pad(date.getMonth() + 1) + '.' + date.getFullYear();
  }

  // Формат времени: "7:04 AM"
  function time12(date) {
    var h    = date.getHours();
    var m    = date.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return h + ':' + pad(m) + ' ' + ampm;
  }

  // Добавляет ноль: 9 → "09"
  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  // Ключ для группировки: "2024-01-15"
  function dateKey(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  // Направление ветра по градусам
  function windDir(deg) {
    var dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  }

  // Запись прогноза ближайшая к 12:00
  function noonItem(items) {
    var best     = items[0];
    var bestDiff = Math.abs(new Date(items[0].dt * 1000).getHours() - 12);
    for (var i = 1; i < items.length; i++) {
      var diff = Math.abs(new Date(items[i].dt * 1000).getHours() - 12);
      if (diff < bestDiff) { bestDiff = diff; best = items[i]; }
    }
    return best;
  }

  // Первая буква заглавная: "sunny" → "Sunny"
  function cap(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Emoji иконка по коду погоды
  function getIcon(id, icon) {
    var night = icon && icon.endsWith('n');
    if (id >= 200 && id < 300) return '⛈';
    if (id >= 300 && id < 400) return '🌦';
    if (id >= 500 && id < 504) return '🌧';
    if (id === 511)             return '🌨';
    if (id >= 520 && id < 600) return '🌧';
    if (id >= 600 && id < 700) return '❄️';
    if (id >= 700 && id < 800) return '🌫';
    if (id === 800) return night ? '🌙' : '☀️';
    if (id === 801) return night ? '🌙' : '🌤';
    if (id === 802) return '⛅';
    if (id >= 803)  return '☁️';
    return '🌡';
  }
