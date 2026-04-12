/* ============================================================
   weather.js  ―  天気マップ ロジック
   依存: Leaflet, jQuery, weather.css
   ============================================================ */

var map = L.map('map', {
    preferCanvas: false,
    scrollWheelZoom: false,
    smoothWheelZoom: true,
    smoothSensitivity: 1.5,
}).setView([36.575, 137.984], 6);

map.attributionControl.addAttribution(
    "<a href='https://github.com/mutsuyuki/Leaflet.SmoothWheelZoom' target='_blank'>SmoothWheelZoom</a>"
);
map.attributionControl.addAttribution('地図データ &copy; <a href="https://www.jma.go.jp/jma/index.html" target="_blank">気象庁</a><a href="https://www.naturalearthdata.com/" target="_blank">/Natural Earth</a>');
map.attributionControl.addAttribution('他・データ &copy; <a href="https://p2pquake.net/" target="_blank">P2P地震情報</a>');
map.attributionControl.addAttribution('<a href="https://weathernews.jp/" target="_blank">Weathernews</a>');
map.attributionControl.addAttribution('&copy WNI再現＋雨雲┃Version : 1.0');

L.control.scale({ maxWidth: 150, position: 'bottomright', imperial: false }).addTo(map);
map.zoomControl.setPosition('topright');

/* ── レイヤーグループ ── */
var mapA = L.layerGroup().addTo(map); // 今の天気マップ
var mapB = L.layerGroup();
var mapC = L.layerGroup();
var mapD = L.layerGroup();
/* ── ペイン ── */
map.createPane("world_map").style.zIndex  = 2;
map.createPane("pane_map2").style.zIndex  = 3;
map.createPane("pane_map3").style.zIndex  = 4;

/* ── GeoJSON スタイル ── */
var PolygonLayer_Style_nerv = {
    color: "#ffffff", weight: 1.5, opacity: 1,
    fillColor: "#145906", fillOpacity: 1
};
var PolygonLayer_Style_world = {
    color: "#ffffff", weight: 1.5, opacity: 1,
    fillColor: "#3a3a3a", fillOpacity: 1
};

var japanLayerMain = null;

$.getJSON("saibun.geojson", function(data) {
    japanLayerMain = L.geoJson(data, {
        style: PolygonLayer_Style_nerv,
        pane: "pane_map3"
    }).addTo(mapA);
});
$.getJSON("world.geojson", function(data) {
    L.geoJson(data, { style: PolygonLayer_Style_world, pane: "world_map" }).addTo(mapA);
});

/* ============================================================
   ユーティリティ
   ============================================================ */
function wxIconUrl(code) {
    return 'https://weathernews.jp/s/topics/img/wxicon/' + code + '.png';
}

function windColor(spd) {
    if (spd < 5)  return '#00c850';
    if (spd < 10) return '#ffb400';
    if (spd < 20) return '#ff6400';
    return '#dc0000';
}

var DIR16 = ['北','北北東','北東','東北東','東','東南東','南東','南南東',
             '南','南南西','南西','西南西','西','西北西','北西','北北西'];

function windDirText(deg) {
    if (deg === null || deg === '') return '';
    var idx = Math.round(parseFloat(deg) / 22.5) % 16;
    return DIR16[idx];
}

function windArrowSvg(deg, spd) {
    var color    = windColor(spd);
    var rotate   = (parseFloat(deg) + 180) % 360;
    var bigArrow = spd >= 20;
    return [
        '<svg width="36" height="36" viewBox="0 0 36 36">',
        '<circle cx="18" cy="18" r="16"',
        ' fill="' + color + '22"',
        ' stroke="' + color + '88" stroke-width="1"/>',
        '<g transform="translate(18,18) rotate(' + rotate.toFixed(0) + ')">',
        '<polygon points="0,-11 ' + (bigArrow ? 5 : 4) + ',2 0,-1 -' + (bigArrow ? 5 : 4) + ',2"',
        ' fill="' + color + '"/>',
        '<line x1="0" y1="10" x2="0" y2="-2"',
        ' stroke="' + color + '" stroke-width="' + (bigArrow ? 2 : 1.5) + '"',
        ' stroke-linecap="round"/>',
        '</g>',
        (bigArrow ? '<circle cx="18" cy="18" r="2.5" fill="rgba(255,255,255,.45)"/>' : ''),
        '</svg>'
    ].join('');
}

function getLatLonFromUrl(url) {
    var latMatch = url.match(/lat=([0-9.\-]+)/);
    var lonMatch = url.match(/lon=([0-9.\-]+)/);
    if (!latMatch || !lonMatch) return null;
    return [parseFloat(latMatch[1]), parseFloat(lonMatch[1])];
}

/* ============================================================
   通知バナー
   ============================================================ */
function showNote(msg) {
    var el = document.getElementById('wx-note');
    if (!el) {
        el = document.createElement('div');
        el.id = 'wx-note';
        document.getElementById('map').appendChild(el);
    }
    el.style.opacity = '1';
    el.textContent = msg;
    setTimeout(function() { el.style.opacity = '0'; }, 8000);
}

/* ============================================================
   地域ラベル生成
   ============================================================ */
var regionLabel = document.createElement('div');
regionLabel.id = 'wx-region-label';
regionLabel.innerHTML =
    '<div class="label-main">' +
        '<span style="font-size:28px;line-height:1;"></span>' +
        '<span class="label-name" id="wx-region-name">北海道の天気</span>' +
    '</div>' +
    '<div class="label-divider"></div>' +
    '<div class="label-time-wrap">' +
        '<svg width="22" height="22" viewBox="0 0 12 12" fill="none">' +
            '<circle cx="6" cy="6" r="5" stroke="rgba(255,255,255,.4)" stroke-width="1.2"/>' +
            '<path d="M6 3.5V6l2 1.5" stroke="rgba(255,255,255,.4)" stroke-width="1.2" stroke-linecap="round"/>' +
        '</svg>' +
        '<span class="label-time" id="wx-region-time"></span>' +
    '</div>';
document.getElementById('map').appendChild(regionLabel);

function updateTime() {
    var d = new Date();
    var h = ('0' + d.getHours()).slice(-2);
    var m = ('0' + d.getMinutes()).slice(-2);
    var s = ('0' + d.getSeconds()).slice(-2);
    var el = document.getElementById('wx-region-time');
    if (el) el.textContent = h + ':' + m + ':' + s;
}
updateTime();
setInterval(updateTime, 900);

/* ============================================================
   天気レイヤー・地域定義
   ============================================================ */
var weatherLayer = L.layerGroup().addTo(mapA);
var regions = {
    "北海道":    [43.1811, 142.5037, 7],
    "東北":      [38.8055, 141.2732, 7],
    "関東":      [35.6841, 140.2625, 8],
    "中部":      [35.9202, 137.3181, 8],
    "近畿":      [34.6332, 135.6702, 8],
    "中国/四国": [34.3298, 133.1708, 8],
    "九州":      [32.4773, 130.9131, 8],
    "沖縄本島":  [25.2049, 126.5295, 7],
};
var regionKeys  = Object.keys(regions);
var regionIndex = 0;
var currentRegion = "北海道";

/* ============================================================
   ピン重なり防止
   ============================================================ */
var placedPins = [];

function offsetIfOverlap(lat, lon) {
    var minDist = 0.35;
    for (var i = 0; i < placedPins.length; i++) {
        var dLat = lat - placedPins[i][0];
        var dLon = lon - placedPins[i][1];
        var dist = Math.sqrt(dLat * dLat + dLon * dLon);
        if (dist < minDist) {
            var angle = Math.random() * Math.PI * 2;
            lat += Math.cos(angle) * minDist;
            lon += Math.sin(angle) * minDist;
        }
    }
    placedPins.push([lat, lon]);
    return [lat, lon];
}

/* ============================================================
   ピン生成
   ============================================================ */
function addPin(lat, lon, name, code, maxT, minT, windSpd, windDeg) {

    var maxHtml = (maxT !== null && maxT !== '') ? '<span class="wx-temp-max">' + maxT + '℃</span>' : '';
    var minHtml = (minT !== null && minT !== '') ? '<span class="wx-temp-min">' + minT + '℃</span>' : '';

    var uid = 'wx' + Date.now() + Math.random().toString(36).slice(2, 6);

    var tempFace =
        '<div class="wx-card-face" id="wxf-temp-' + uid + '">' +
            '<div class="wx-body">' +
                '<img src="' + wxIconUrl(code) + '" alt="">' +
                '<div class="wx-temps">' + maxHtml + minHtml + '</div>' +
            '</div>' +
        '</div>';

    var spdNum   = (windSpd !== null && windSpd !== '') ? parseFloat(windSpd) : null;
    var windFace = '';
    if (spdNum !== null && windDeg !== null && windDeg !== '') {
        var color   = windColor(spdNum);
        var dirText = windDirText(windDeg);
        windFace =
            '<div class="wx-card-face" id="wxf-wind-' + uid + '" style="display:none">' +
                '<div class="wx-wind-body">' +
                    '<div class="wx-wind-arrow-wrap">' + windArrowSvg(windDeg, spdNum) + '</div>' +
                    '<div class="wx-wind-info">' +
                        '<span class="wx-wind-speed" style="color:' + color + '">' + spdNum.toFixed(0) + ' m/s</span>' +
                        '<span class="wx-wind-dir">' + dirText + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }

    var html =
        '<div class="wx-pin">' +
            '<div class="wx-name">' + name + '</div>' +
            tempFace + windFace +
        '</div>';

    var icon   = L.divIcon({ html: html, className: '', iconSize: [98, 76], iconAnchor: [49, 38] });
    var marker = L.marker([lat, lon], { icon: icon });
    weatherLayer.addLayer(marker);

    if (windFace) {
        setTimeout(function() {
            var tf = document.getElementById('wxf-temp-' + uid);
            var wf = document.getElementById('wxf-wind-' + uid);
            if (!tf || !wf) return;
            setInterval(function() {
                var showingTemp = tf.style.display !== 'none';
                tf.style.display = showingTemp ? 'none' : '';
                wf.style.display = showingTemp ? '' : 'none';
            }, 4000);
        }, 200);
    }
}

/* ============================================================
   都市リスト
   ============================================================ */
var hokkaidoCities = ["稚内","旭川","小樽","函館","室蘭","札幌","帯広","釧路","根室","網走"];
var tohokuCities   = ["青森","八戸","秋田","山形","会津若松","福島","仙台","盛岡"];
var kantoCities    = ["前橋","宇都宮","さいたま","東京","横浜","大島","千葉","水戸"];
var chubuCities    = ["金沢","福井","岐阜","津","名古屋","静岡","甲府","長野","富山","新潟"];
var kinkiCities    = ["舞鶴","神戸","大阪","和歌山","新宮","奈良","京都","大津"];
var chugokuCities  = ["山口","広島","岡山","松江","鳥取"];
var shikokuCities  = ["高松","徳島","高知","松山"];
var kyushuCities   = ["福岡","大分","宮崎","鹿児島","奄美","熊本","長崎","佐賀"];
var okinawaCities  = ["名護","南大東","那覇","石垣島","西表島","与那国島","宮古島","久米島"];

function cityInCurrentRegion(name) {
    if (currentRegion === "北海道")    return hokkaidoCities.includes(name);
    if (currentRegion === "東北")      return tohokuCities.includes(name);
    if (currentRegion === "関東")      return kantoCities.includes(name);
    if (currentRegion === "中部")      return chubuCities.includes(name);
    if (currentRegion === "近畿")      return kinkiCities.includes(name);
    if (currentRegion === "中国/四国") return chugokuCities.includes(name) || shikokuCities.includes(name);
    if (currentRegion === "九州")      return kyushuCities.includes(name);
    if (currentRegion === "沖縄本島")  return okinawaCities.includes(name);
    return true;
}

/* ============================================================
   固定座標
   ============================================================ */
var fixedCoords = {
    "稚内":    [44.7540, 142.0532],
    "小樽":    [43.5964, 140.3284],
    "札幌":    [42.6900, 141.8445],
    "室蘭":    [42.5284, 139.9109],
    "八戸":    [40.2306, 142.0862],
    "盛岡":    [39.1065, 141.5369],
    "山形":    [38.7221, 139.5483],
    "福島":    [37.3383, 140.9216],
    "会津若松":[37.6253, 139.1630],
    "千葉":    [35.4000, 140.4602],
    "宇都宮":  [36.6865, 139.8065],
    "さいたま":[35.9513, 140.0977],
    "横浜":    [35.3084, 139.5978],
    "東京":    [35.7404, 139.2709],
    "新潟":    [37.2656, 138.9716],
    "富山":    [36.8449, 137.7081],
    "金沢":    [37.1121, 136.7963],
    "長野":    [36.1520, 138.0542],
    "岐阜":    [35.8722, 137.1313],
    "名古屋":  [34.9910, 137.1753],
    "津":      [35.3263, 136.6479],
    "神戸":    [35.0265, 135.0439],
    "和歌山":  [33.8857, 135.2472],
    "奈良":    [34.3267, 136.2579],
    "大津":    [35.4293, 136.1536],
    "京都":    [34.8454, 136.4063],
    "大阪":    [34.5247, 135.2527],
    "鳥取":    [35.5859, 134.3353],
    "山口":    [34.9940, 131.6656],
    "徳島":    [33.8157, 134.4067],
    "岡山":    [34.9400, 133.9948],
    "広島":    [34.4935, 132.6160],
    "福岡":    [33.7335, 131.0614],
    "大分":    [32.9764, 131.6766],
    "佐賀":    [33.5506, 130.0946],
    "熊本":    [32.6209, 130.8197],
    "奄美":    [31.6581, 129.5178],
    "名護":    [26.8045, 128.9026],
    "那覇":    [25.5127, 127.6721],
    "久米島":  [26.7652, 126.6614],
    "宮古島":  [25.4433, 125.6946],
    "石垣島":  [23.8557, 124.9365],
    "与那国島":[25.1851, 122.9810],
    "西表島":  [23.4229, 122.7942],
    "南大東":  [25.3142, 130.0452],
};

/* ============================================================
   XML パース
   ============================================================ */
function parseXML(xml) {
    weatherLayer.clearLayers();
    placedPins = [];
    var count = 0, seen = {};
    var maps = xml.getElementsByTagName('map');

    for (var m = 0; m < maps.length; m++) {
        if (maps[m].getAttribute('id') === '0') continue;

        var points = maps[m].getElementsByTagName('point');
        for (var p = 0; p < points.length; p++) {
            var pt = points[p];

            var x = parseFloat(pt.getAttribute('x'));
            var y = parseFloat(pt.getAttribute('y'));
            if (isNaN(x) || isNaN(y)) continue;

            var key = x.toFixed(4) + '_' + y.toFixed(4);
            if (seen[key]) continue;
            seen[key] = true;

            var weatherEl = pt.getElementsByTagName('weather')[0];
            var maxtempEl = pt.getElementsByTagName('maxtemp')[0];
            var mintempEl = pt.getElementsByTagName('mintemp')[0];
            var windspdEl = pt.getElementsByTagName('windspeed')[0];
            var winddirEl = pt.getElementsByTagName('winddir')[0];

            var code    = weatherEl  ? weatherEl.textContent.split(',')[0].trim()  : '';
            var maxT    = maxtempEl  ? maxtempEl.textContent.split(',')[0].trim()  : null;
            var minT    = mintempEl  ? mintempEl.textContent.split(',')[0].trim()  : null;
            var windSpd = windspdEl  ? windspdEl.textContent.split(',')[0].trim()  : null;
            var windDeg = winddirEl  ? winddirEl.textContent.split(',')[0].trim()  : null;

            var url    = pt.getAttribute('url');
            var ptName = pt.getAttribute('name');
            var coord  = fixedCoords[ptName] || getLatLonFromUrl(url);
            if (coord && cityInCurrentRegion(ptName)) {
                addPin(coord[0], coord[1], ptName, code, maxT, minT, windSpd, windDeg);
            }
            count++;
        }
    }

    showNote('🌐 ' + count + ' 地点の天気を表示中（Weathernews）');
}

/* ============================================================
   フェッチ
   ============================================================ */
var weatherEnabled = true;
var regionTimer    = null;
var radarTimer     = null;

var XML_URL = 'https://weathernews.jp/forecast/xml/all.xml';
var URLS = [
    XML_URL,
    'https://api.allorigins.win/raw?url='       + encodeURIComponent(XML_URL),
    'https://api.codetabs.com/v1/proxy?quest='  + encodeURIComponent(XML_URL),
    'https://thingproxy.freeboard.io/fetch/'    + XML_URL,
];

function tryFetch(idx) {
    if (!weatherEnabled) return;
    if (idx >= URLS.length) {
        showNote('⚠ 天気データを取得できませんでした');
        return;
    }
    fetch(URLS[idx], { cache: 'no-cache' })
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(function(txt) {
            var xml = new DOMParser().parseFromString(txt, 'application/xml');
            if (xml.querySelector('parsererror')) throw new Error('parse error');
            if (!xml.getElementsByTagName('weathernews').length) throw new Error('unexpected xml');
            parseXML(xml);
        })
        .catch(function(err) {
            console.warn('URL[' + idx + '] failed:', err);
            tryFetch(idx + 1);
        });
}

/* ============================================================
   地域切り替え
   ============================================================ */
function switchRegionAuto() {
    regionIndex++;

    if (regionIndex >= regionKeys.length) {
        switchMap(); // A→B（雨雲）

        radarTimer = setTimeout(function() {
            switchMap(); // B→C（警報）

            radarTimer = setTimeout(function() {
                switchMap(); // C→A（天気）

                regionIndex   = 0;
                currentRegion = regionKeys[0];

                var r = regions[currentRegion];
                map.flyTo([r[0], r[1]], r[2], { duration: 0.6 });

                var nameEl = document.getElementById('wx-region-name');
                if (nameEl) nameEl.textContent = currentRegion + "の天気";

                tryFetch(0);
            }, 20000);
        }, 20000);

        return;
    }

    var name = regionKeys[regionIndex];
    var r    = regions[name];
    currentRegion = name;

    var nameEl = document.getElementById('wx-region-name');
    if (nameEl) nameEl.textContent = name + "の天気";

    map.flyTo([r[0], r[1]], r[2], { duration: 0.6 });
    tryFetch(0);
}

function disableWeather() {
    weatherEnabled = false;
    weatherLayer.clearLayers();
    if (regionTimer) { clearInterval(regionTimer); regionTimer = null; }
}

function enableWeather() {
    weatherEnabled = true;
    if (radarTimer) { clearTimeout(radarTimer); radarTimer = null; }
    tryFetch(0);
    regionTimer = setInterval(function() {
        if (weatherEnabled) switchRegionAuto();
    }, 8000);
}

/* ============================================================
   マップ切替ボタン
   ============================================================ */
var currentMap = "A";

var btn = document.createElement("button");
btn.textContent = "マップ切替";
btn.style.cssText = "position:absolute;top:10px;right:10px;z-index:10000;";
btn.onclick = switchMap;
document.getElementById("map").appendChild(btn);

var autoSwitchEnabled = true;
var autoBtn = document.createElement("button");
autoBtn.textContent = "自動切替 ON";
autoBtn.style.cssText = [
    "position:absolute",
    "top:44px",
    "right:10px",
    "z-index:10000",
    "background:#2a6e2a",
    "color:#fff",
    "border:none",
    "border-radius:4px",
    "padding:4px 8px",
    "cursor:pointer",
].join(';');

autoBtn.onclick = function() {
    autoSwitchEnabled = !autoSwitchEnabled;
    if (autoSwitchEnabled) {
        autoBtn.textContent = "自動切替 ON";
        autoBtn.style.background = "#2a6e2a";
        if (!regionTimer) {
            regionTimer = setInterval(function() {
                if (weatherEnabled) switchRegionAuto();
            }, 8000);
        }
    } else {
        autoBtn.textContent = "自動切替 OFF";
        autoBtn.style.background = "#6e2a2a";
        if (regionTimer) { clearInterval(regionTimer); regionTimer = null; }
        if (radarTimer)  { clearTimeout(radarTimer);   radarTimer  = null; }
    }
};
document.getElementById("map").appendChild(autoBtn);

/* ============================================================
   その他レイヤー
   ============================================================ */
var otherLayer = L.layerGroup().addTo(mapB);

function setJapanColor(color) {
    if (japanLayerMain)  japanLayerMain.setStyle({ fillColor: color });
    if (insetJapanLayer) insetJapanLayer.setStyle({ fillColor: color });
}

/* ============================================================
   マップ切替ロジック (A→B→C→A)
   ============================================================ */
function switchMap() {
    var nameEl = document.getElementById('wx-region-name');

    /* A → B（天気 → 雨雲） */
    if (currentMap === "A") {
        disableWeather();
        map.removeLayer(weatherLayer);
        map.addLayer(otherLayer);
        map.flyTo([38.2127, 136.8887], 5.8, { duration: 0.6 });
        setJapanColor("#145906");
        showNowcast();
        if (nameEl) nameEl.textContent = "雨雲レーダー";
        currentMap = "B";
        return;
    }

    /* B → C（雨雲 → 警報） */
    if (currentMap === "B") {
        map.removeLayer(otherLayer);
        if (nowcastLayer)      { map.removeLayer(nowcastLayer);       nowcastLayer      = null; }
        if (insetNowcastLayer) { insetMap.removeLayer(insetNowcastLayer); insetNowcastLayer = null; }
        setJapanColor("#c8c8cb");
        warningLegend.style.display = "block";
        map.addLayer(mapC);
        warningFillLayer.clearLayers();
        loadWarningMap();
        if (nameEl) nameEl.textContent = "警報・注意報";
        currentMap = "C";
        return;
    }

    /* C → A（警報 → 天気） */
    if (currentMap === "C") {
        map.removeLayer(mapC);
        warningLegend.style.display = "none";
        warningFillLayer.clearLayers();
        setJapanColor("#145906");
        if (insetWarningLayer) { insetMap.removeLayer(insetWarningLayer); insetWarningLayer = null; }
        map.addLayer(weatherLayer);
        enableWeather();
        if (nameEl) nameEl.textContent = currentRegion + "の天気";
        currentMap = "A";
        return;
    }
}

/* ── switchMap をラップして沖縄インセットの表示/非表示 ── */
var _origSwitchMap = switchMap;
switchMap = function() {
    _origSwitchMap();
    if (currentMap === "B" || currentMap === "C") {
        insetContainer.style.display = 'block';
        setTimeout(function() { insetMap.invalidateSize(); }, 100);
    } else {
        insetContainer.style.display = 'none';
    }
};

/* ============================================================
   雨雲レーダー
   ============================================================ */
var nowcastLayer = null;

async function showNowcast() {
    const res  = await fetch("https://www.jma.go.jp/bosai/jmatile/data/nowc/targetTimes_N1.json");
    const json = await res.json();
    const basetime = json[0].basetime;
    const url = "https://www.jma.go.jp/bosai/jmatile/data/nowc/" +
        basetime + "/none/" + basetime + "/surf/hrpns/{z}/{x}/{y}.png";

    if (nowcastLayer)      { map.removeLayer(nowcastLayer); }
    nowcastLayer = L.tileLayer(url, { opacity: 0.9, zIndex: 999 });
    map.addLayer(nowcastLayer);

    if (insetNowcastLayer) { insetMap.removeLayer(insetNowcastLayer); }
    insetNowcastLayer = L.tileLayer(url, { opacity: 0.9, zIndex: 999 });
    insetMap.addLayer(insetNowcastLayer);
}

setInterval(function() {
    if (currentMap === "B") showNowcast();
}, 300000);

/* ============================================================
   沖縄インセットマップ
   ============================================================ */
var insetContainer = document.createElement('div');
insetContainer.id  = 'wx-inset-map';
document.getElementById('map').appendChild(insetContainer);

/* ── 縁取り SVG ── */
var insetBorder = document.createElement('div');
insetBorder.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:20;";
insetBorder.innerHTML = `
<svg width="100%" height="100%" viewBox="0 0 500 250" preserveAspectRatio="none">
    <line x1="150" y1="0"   x2="500" y2="0"   stroke="white" stroke-width="1.5"/>
    <line x1="0"   y1="120" x2="150" y2="0"   stroke="white" stroke-width="1.5"/>
</svg>`;
insetContainer.appendChild(insetBorder);

/* ── ラベル ── */
var insetLabel = document.createElement('div');
insetLabel.style.cssText = [
    "position:absolute","top:6px","left:0","right:0",
    "text-align:center","font-size:11px",
    "font-family:\"Hiragino Sans\",\"Yu Gothic UI\",sans-serif",
    "font-weight:700","color:rgba(255,255,255,.9)","letter-spacing:.06em",
    "z-index:10","pointer-events:none","text-shadow:0 1px 4px rgba(0,0,0,.8)",
].join(';');
insetLabel.textContent = '沖縄';
insetContainer.appendChild(insetLabel);

var insetMap = L.map('wx-inset-map', {
    zoomControl: false, attributionControl: false,
    scrollWheelZoom: true, dragging: true,
    doubleClickZoom: true, boxZoom: false,
    keyboard: false, tap: false, touchZoom: true,
}).setView([27.2963, 127.5618], 5.63);

var insetJapanLayer   = null;
var insetNowcastLayer = null;
var insetWarningLayer = null;

$.getJSON("saibun.geojson", function(data) {
    insetJapanLayer = L.geoJson(data, { style: PolygonLayer_Style_nerv }).addTo(insetMap);
});
$.getJSON("world.geojson", function(data) {
    L.geoJson(data, { style: PolygonLayer_Style_world }).addTo(insetMap);
});

/* ============================================================
   警報凡例
   ============================================================ */
var warningLegend = document.createElement('div');
warningLegend.id = 'warning-legend';
warningLegend.innerHTML = `
<div style="display:flex;flex-direction:column;gap:6px">
  <div style="font-weight:700;color:#ffb3a0;letter-spacing:.06em">凡例</div>
  <div style="display:flex;align-items:center;gap:8px">
    <span style="width:16px;height:10px;background:#c8c8cb;display:inline-block;border:1px solid #fff"></span>発表なし
  </div>
  <div style="display:flex;align-items:center;gap:8px">
    <span style="width:16px;height:10px;background:#800080;display:inline-block;border:1px solid #fff"></span>特別警報
  </div>
  <div style="display:flex;align-items:center;gap:8px">
    <span style="width:16px;height:10px;background:#ff0000;display:inline-block;border:1px solid #fff"></span>警報
  </div>
  <div style="display:flex;align-items:center;gap:8px">
    <span style="width:16px;height:10px;background:#ffe600;display:inline-block;border:1px solid #fff"></span>注意報
  </div>
</div>`;
document.getElementById('map').appendChild(warningLegend);

/* ============================================================
   警報マップ
   ============================================================ */
var warningFillLayer = L.layerGroup().addTo(mapC);

function warningColor(name) {
    if (name.includes("特別警報")) return "#800080";
    if (name.includes("警報"))     return "#ff0000";
    if (name.includes("注意報"))   return "#ffe600";
    return null;
}

function warningLevel(name) {
    if (!name) return 0;
    if (name.includes("特別警報")) return 3;
    if (name.includes("警報"))     return 2;
    if (name.includes("注意報"))   return 1;
    return 0;
}

function normalizeAreaName(str) {
    return str
        .replace(/地方/g, '')
        .replace(/県/g,   '')
        .replace(/・/g,   '')
        .replace(/\s/g,   '');
}

async function loadWarningMap() {
    warningFillLayer.clearLayers();

    const res  = await fetch('https://www.data.jma.go.jp/developer/xml/feed/extra.xml');
    const text = await res.text();
    const parser  = new DOMParser();
    const xml     = parser.parseFromString(text, "application/xml");
    const NS      = "http://www.w3.org/2005/Atom";
    const entries = xml.getElementsByTagNameNS(NS, "entry");

    const areaWarnings = {};
    const tasks = [];

    for (let i = 0; i < entries.length; i++) {
        const linkEl = entries[i].getElementsByTagNameNS(NS, "link")[0];
        if (!linkEl) continue;
        const href = linkEl.getAttribute("href");
        if (!href) continue;

        tasks.push(
            fetch(href).then(r => r.text()).then(t => {
                const rxm    = parser.parseFromString(t, "application/xml");
                const nsBody = "http://xml.kishou.go.jp/jmaxml1/body/meteorology1/";
                const warnings = rxm.getElementsByTagNameNS(nsBody, "Warning");

                for (let w = 0; w < warnings.length; w++) {
                    const items = warnings[w].getElementsByTagNameNS(nsBody, "Item");
                    for (let j = 0; j < items.length; j++) {
                        const areaEl = items[j].getElementsByTagNameNS(nsBody, "Area")[0]
                            || items[j].getElementsByTagName("Area")[0];
                        const kindEl = items[j].getElementsByTagNameNS(nsBody, "Kind")[0]
                            || items[j].getElementsByTagName("Kind")[0];
                        if (!areaEl || !kindEl) continue;

                        const areaName = areaEl.getElementsByTagName("Name")[0]?.textContent || "";
                        const warnName = kindEl.getElementsByTagName("Name")[0]?.textContent || "";
                        const status   = kindEl.getElementsByTagName("Status")[0]?.textContent || "";

                        if (status.includes("解除")) return;
                        if (!warnName) return;

                        const existing = areaWarnings[areaName];
                        if (!existing || warningLevel(warnName) > warningLevel(existing)) {
                            areaWarnings[areaName] = warnName;
                        }
                    }
                }
            }).catch(() => {})
        );
    }

    await Promise.all(tasks);

    $.getJSON("saibun.geojson", function(geo) {
        const styleFunc = function(f) {
            const nameN = normalizeAreaName(f.properties.name || "");
            let wname = null;
            for (const key in areaWarnings) {
                const keyN = normalizeAreaName(key);
                if (nameN.includes(keyN) || keyN.includes(nameN)) {
                    wname = areaWarnings[key];
                    break;
                }
            }
            const color = warningColor(wname || "");
            if (!color) return { opacity: 0, fillOpacity: 0 };
            return { fillColor: color, fillOpacity: 0.6, color: "#ffffff", weight: 0.6, opacity: 1 };
        };

        L.geoJson(geo, { style: styleFunc }).addTo(warningFillLayer);

        if (insetWarningLayer) insetMap.removeLayer(insetWarningLayer);
        insetWarningLayer = L.geoJson(geo, { style: styleFunc }).addTo(insetMap);
    });
}

/* ============================================================
   右クリック → 沖縄視点コピー
   ============================================================ */
map.on('contextmenu', function() {
    var center = insetMap.getCenter();
    var zoom   = insetMap.getZoom();
    var text   = center.lat.toFixed(4) + ',' + center.lng.toFixed(4) + ',' + zoom;
    navigator.clipboard.writeText(text).then(function() {
        showNote('📋 沖縄視点コピー: ' + text);
    });
});

/* ============================================================
   起動
   ============================================================ */
tryFetch(0);
regionTimer = setInterval(function() {
    if (weatherEnabled) switchRegionAuto();
}, 8000);
