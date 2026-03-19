const API_KEY = '9bd718ac7f81d3d09bdec17036727878';

let forecastData   = null;  
let selectedDayIdx = 0;      
let currentTab     = 'today';

// список городов
const nearbyCities = [
  { name: 'London', lat: 51.51, lon: -0.13 },
  { name: 'Paris',  lat: 48.85, lon:  2.35 },
  { name: 'Berlin', lat: 52.52, lon: 13.41 },
  { name: 'Warsaw', lat: 52.23, lon: 21.01 },
  { name: 'Vienna', lat: 48.21, lon: 16.37 },
  { name: 'Rome',   lat: 41.89, lon: 12.48 },
];

const dayNames   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];


//определяем местоположение

window.onload = function() {
  if (navigator.geolocation) {
      //Браузер поддерживает геолокацию — запрашиваем координаты
    navigator.geolocation.getCurrentPosition(
      function(pos) {
          //Пользователь разрешил — грузим по координатам
        loadByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      function() {
          //Пользователь запретил — грузим Калининград
        loadByCity('Kaliningrad');
      }
    );
  } else {
      //Браузер не поддерживает геолокацию — грузим Калининград
    loadByCity('Kaliningrad');
  }
};

//Поиск города

function searchCity() {
  let city = document.getElementById('cityInput').value.trim();
  if (!city) return;
  loadByCity(city);
}

//Enter
document.getElementById('cityInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') searchCity();
});


//Переключение вкладок

function showTab(name) {
  currentTab = name;

  document.getElementById('tab-today').classList.remove('active');
  document.getElementById('tab-forecast').classList.remove('active');
  document.getElementById('tab-' + name).classList.add('active');

  document.getElementById('panel-today').classList.add('hidden');
  document.getElementById('panel-forecast').classList.add('hidden');
  document.getElementById('panel-' + name).classList.remove('hidden');

  if (name === 'forecast' && forecastData) {
    renderForecast();
  }
}


//Загрузка города по названию

function loadByCity(city) {
  showLoading();

  // Запрос текущей погоды
  let weatherUrl = 'https://api.openweathermap.org/data/2.5/weather'
    + '?q=' + encodeURIComponent(city)
    + '&units=metric&lang=en&appid=' + API_KEY;

  // Запрос прогноза на 5 дней
  let forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast'
    + '?q=' + encodeURIComponent(city)
    + '&units=metric&lang=en&appid=' + API_KEY;

  //текущая погода
  fetch(weatherUrl)
    .then(function(response) { return response.json(); })
    .then(function(weather) {

      //проверяем ошибки API
      if (weather.cod === 401) { showError('Неверный API ключ.'); return; }
      if (weather.cod === '404') { showNotFound(); return; }

      //ставим официальное название в строку поиска(на англ.яз.)
      document.getElementById('cityInput').value = weather.name;

      //запрашиваем прогноз
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



//загрузка по координатам(геолокация)

function loadByCoords(lat, lon) {
  showLoading();

  let weatherUrl = 'https://api.openweathermap.org/data/2.5/weather'
    + '?lat=' + lat + '&lon=' + lon
    + '&units=metric&lang=en&appid=' + API_KEY;

  let forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast'
    + '?lat=' + lat + '&lon=' + lon
    + '&units=metric&lang=en&appid=' + API_KEY;

  fetch(weatherUrl)
    .then(function(response) { return response.json(); })
    .then(function(weather) {
      if (weather.cod === 401 || weather.cod === '401') {
        showError('Invalid API key.');
        return;
      }

      document.getElementById('cityInput').value = weather.name;

      fetch(forecastUrl)
        .then(function(response) { 
          return response.json(); 
        })
        .then(function(forecast) {
          forecastData   = forecast;
          selectedDayIdx = 0;
          renderToday(weather, forecast);
        });
    })
    .catch(function() {
      loadByCity('Moscow');
    });
}


//========== вкладка TODAY =============//

  function renderToday(weather, forecast) {
    let html = '';

    const sunrise = new Date(weather.sys.sunrise * 1000);
    const sunset  = new Date(weather.sys.sunset  * 1000);
    const diffMs  = sunset - sunrise;
    const diffH   = Math.floor(diffMs / 3600000);
    const diffM   = Math.floor((diffMs % 3600000) / 60000);

    // Текущая погода
    html += '<div class="block">';
    html += '  <div class="block-title">CURRENT WEATHER — ' + weather.name + '<span class="current-date">' + formatDate(new Date()) + '</span></div>';
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
    html += '      <div><span class="label">Sunrise:</span> '  + formatTime(sunrise) + '</div>';
    html += '      <div><span class="label">Sunset:</span> '   + formatTime(sunset)  + '</div>';
    html += '      <div><span class="label">Duration:</span> ' + diffH + ':' + pad(diffM) + ' hr</div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';

    //Почасовой прогноз
    let todayKey = dateKey(new Date());
    let hours = [];

    for (let i = 0; i < forecast.list.length; i++) {
      if (dateKey(new Date(forecast.list[i].dt * 1000)) === todayKey) {
        hours.push(forecast.list[i]);
      }
    }

    //Если сегодняшних часов нет (конец дня) — берём первые записи
    if (hours.length === 0) {
      hours = forecast.list.slice(0, 6);
    }

    html += '<div class="block">';
    html += '  <div class="block-title">HOURLY</div>';
    html += '  <table class="hourly-table">';
    html += renderHourlyTable(hours);
    html += '  </table>';
    html += '</div>';

    //ближайшие города
    html += '<div class="block">';
    html += '  <div class="block-title">NEARBY PLACES</div>';
    html += '  <div class="nearby-grid" id="nearbyGrid">';
    html += '    <div style="padding:15px;color:#bbb;grid-column:span 2">Загрузка...</div>';
    html += '  </div>';
    html += '</div>';

    document.getElementById('panel-today').innerHTML = html;

    loadNearby();
  }


//таблица почасового прогноза
function renderHourlyTable(hours) {
  let html = '';

  //TODAY + часы
  html += '<tr class="row-head">';
  html += '  <td class="lbl">TODAY</td>';
  for (let i = 0; i < hours.length; i++) {
    html += '<td>' + formatTime(new Date(hours[i].dt * 1000)) + '</td>';
  }
  html += '</tr>';

  //иконки
  html += '<tr><td class="lbl"></td>';
  for (let i = 0; i < hours.length; i++) {
  html += '<td class="icon-cell">' + getIcon(hours[i].weather[0].id, hours[i].weather[0].icon) + '</td>';
  }
  html += '</tr>';

  //описание
  html += '<tr><td class="lbl">Forecast</td>';
  for (let i = 0; i < hours.length; i++) {
    html += '<td class="desc-cell">' + cap(hours[i].weather[0].description) + '</td>';
  }
  html += '</tr>';

  //температура
  html += '<tr><td class="lbl">Temp (°C)</td>';
  for (let i = 0; i < hours.length; i++) {
    html += '<td class="temp-cell">' + Math.round(hours[i].main.temp) + '°</td>';
  }
  html += '</tr>';

  //ощущаемая темпа
  html += '<tr><td class="lbl">RealFeel</td>';
  for (let i = 0; i < hours.length; i++) {
    html += '<td class="feels-cell">' + Math.round(hours[i].main.feels_like) + '°</td>';
  }
  html += '</tr>';

  //ветер
  html += '<tr><td class="lbl">Wind (m/s)</td>';
  for (let i = 0; i < hours.length; i++) {
    html += '<td class="wind-cell">' + Math.round(hours[i].wind.speed) + ' ' + windDir(hours[i].wind.deg) + '</td>';
  }
  html += '</tr>';

  return html;
}


//Ближайшие города
function loadNearby() {
  let results = [];
  let loaded  = 0;

  for (var i = 0; i < nearbyCities.length; i++) {
    (function(city) {
      const url = 'https://api.openweathermap.org/data/2.5/weather'
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
        .catch(function() { })
        .finally(function() {
          loaded++;
          
          if (loaded === nearbyCities.length) {
            let el = document.getElementById('nearbyGrid');
            if (!el) return;

            let html = '';
            for (let j = 0; j < results.length; j++) {
              let c = results[j];
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


//Вкладка 5-day forecast

function renderForecast() {
  if (!forecastData) return;

  //прогноз по дням
  let days     = {};  
  let dayOrder = [];  

  for (let i = 0; i < forecastData.list.length; i++) {
    let item = forecastData.list[i];
    let key  = dateKey(new Date(item.dt * 1000));
    if (!days[key]) {
      days[key] = [];
      dayOrder.push(key);
    }
    days[key].push(item);
  }

  dayOrder = dayOrder.slice(0, 5);  // 5 дней

  let html = '';

  //карточки дней
  html += '<div class="block">';
  html += '  <div class="block-title">5-DAY FORECAST - ' + forecastData.city.name + '</div>';
  html += '  <div class="days-row">';

  for (var i = 0; i < dayOrder.length; i++) {
    let items = days[dayOrder[i]];
    let noon  = noonItem(items);       
    let d     = new Date(noon.dt * 1000);

    // Мин и макс температура за день
    let minT = items[0].main.temp_min;
    let maxT = items[0].main.temp_max;
    for (let j = 1; j < items.length; j++) {
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

  // почасовой прогноз выбранного дня
  let selItems = days[dayOrder[selectedDayIdx]];
  let selDate  = new Date(selItems[0].dt * 1000);

  html += '<div class="block">';
  html += '  <div class="block-title">HOURLY - ' + selDate.getDate() + ' ' + monthNames[selDate.getMonth()] + '</div>';
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

function showLoading() {
  document.getElementById('panel-today').innerHTML =
    '<div class="message"><div class="icon">⏳</div><div>Loading...</div></div>';
}

function showError(msg) {
  document.getElementById('panel-today').innerHTML =
    '<div class="error-box"><b>Error:</b> ' + msg + '</div>';
}

function showNotFound() {
  document.getElementById('panel-today').innerHTML =
    '<div class="message">'
    + '<div class="icon">🔍</div>'
    + '<div><b>City not found</b></div>'
    + '<div style="margin-top:8px;font-size:13px;color:#bbb">Check and try again</div>'
    + '</div>';
}

//формат даты - 30.03.2026
function formatDate(date) {
  return pad(date.getDate()) + '.' + pad(date.getMonth() + 1) + '.' + date.getFullYear();
}

//формат времени - 22:14
function formatTime(date) {
  return pad(date.getHours()) + ':' + pad(date.getMinutes());
}

//добавляем ноль перед цифрой: 9 - 09
function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

// Ключ для группировки: "2024-01-15"
function dateKey(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

// Направление ветра по градусам
function windDir(deg) {
  let dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

  //прогноз ближайший к 00:00
  function noonItem(items) {
    let best     = items[0];
    let bestDiff = Math.abs(new Date(items[0].dt * 1000).getHours() - 12);
    for (let i = 1; i < items.length; i++) {
      var diff = Math.abs(new Date(items[i].dt * 1000).getHours() - 12);
      if (diff < bestDiff) { bestDiff = diff; best = items[i]; }
    }
    return best;
  }

  // Первая заглавная буква : "sunny" → "Sunny"
  function cap(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

//иконки погоды
function getIcon(id, icon) {
  return '<img src="https://openweathermap.org/img/wn/' + icon + '@2x.png" width="40" height="40">';
}
