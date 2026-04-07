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
map.attributionControl.addAttribution('他・データ &copy; <a href="https://p2pquake.net/" target="_blank">P2P地震情報</a>')
map.attributionControl.addAttribution('<a href="https://weathernews.jp/" target="_blank">Weathernews</a>');
map.attributionControl.addAttribution('&copy WNI再現＋雨雲┃Version : 1.0');
L.control.scale({ maxWidth: 150, position: 'bottomright', imperial: false }).addTo(map);
map.zoomControl.setPosition('topright');
// 追加
var mapA = L.layerGroup().addTo(map); // 今の天気マップ
var mapB = L.layerGroup();            // 
var mapC = L.layerGroup();            // 予報マップ（未使用）
map.createPane("world_map").style.zIndex = 2; //世界地図
map.createPane("pane_map2").style.zIndex = 3; //地図（市町村）
map.createPane("pane_map3").style.zIndex = 4; //地図（細分）別のマップ
var PolygonLayer_Style_nerv = {
    "color": "#ffffff",
    "weight": 1.5,
    "opacity": 1,
    "fillColor": "#145906",
    "fillOpacity": 1
};
var PolygonLayer_Style_world = {
    "color": "#ffffff",
    "weight": 1.5,
    "opacity": 1,
    "fillColor": "#3a3a3a",
    "fillOpacity": 1
}
$.getJSON("saibun.geojson", function (data) {
    L.geoJson(data, { style: PolygonLayer_Style_nerv, pane: "pane_map3" }).addTo(mapA);
    
});
$.getJSON("world.geojson", function (data) {
    L.geoJson(data, { style: PolygonLayer_Style_world, pane: "world_map" }).addTo(mapA);
});
var weatherEnabled = true;
var regionTimer = null;
var radarTimer = null;
function wxIconUrl(code) {
    return 'https://weathernews.jp/s/topics/img/wxicon/' + code + '.png';
}

/* ============================================================
   スタイル定義
   ============================================================ */
var style = document.createElement('style');
style.textContent = [
/* ── カード全体 ── */
'.wx-pin{',
'  display:inline-flex;',
'  flex-direction:column;',
'  cursor:pointer;',
'  transition:transform .18s cubic-bezier(.34,1.56,.64,1), filter .18s;',
'  white-space:nowrap;',
'  filter:drop-shadow(0 4px 10px rgba(0,0,0,.5));',
'  border-radius:10px;',
'  overflow:hidden;',
'  border:1px solid rgba(255,255,255,.32);',
'  background:rgba(255,255,255,.16);',
'  backdrop-filter:blur(10px) saturate(160%);',
'  -webkit-backdrop-filter:blur(10px) saturate(160%);',
'  box-shadow:0 2px 8px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.5);',
'  width:98px;',
'  height:76px;',
'}',
'.wx-pin:hover{',
'  transform:scale(1.15) translateY(-3px);',
'  filter:drop-shadow(0 8px 20px rgba(0,0,0,.65));',
'}',

/* ── 地名エリア（上段） ── */
'.wx-name{',
'  font-size:16px;',
'  font-family:"Hiragino Sans","Yu Gothic UI",sans-serif;',
'  font-weight:700;',
'  letter-spacing:.04em;',
'  color:rgba(255,255,255,.95);',
'  background:rgba(0,0,0,.28);',
'  border-bottom:1px solid rgba(255,255,255,.18);',
'  text-align:center;',
'  padding:2px 6px;',
'  line-height:1.5;',
'}',

/* ── 下段（アイコン＋気温） ── */
'.wx-body{',
'  display:flex;',
'  align-items:center;',
'  padding:4px 6px 4px 4px;',
'  gap:4px;',
'}',

/* ── アイコン画像 ── */
'.wx-pin img{',
'  width:40px;',
'  height:40px;',
'  display:block;',
'  flex-shrink:0;',
'  filter:drop-shadow(0 1px 2px rgba(0,0,0,.3));',
'}',

/* ── 気温列（縦並び） ── */
'.wx-temps{',
'  display:flex;',
'  flex-direction:column;',
'  gap:1px;',
'}',

/* ── 最高気温 ── */
'.wx-temp-max{',
'  font-size:15px;',
'  font-family:"Hiragino Sans","Yu Gothic UI",sans-serif;',
'  font-weight:700;',
'  color:#ffb3a0;',
'  line-height:1.3;',
'}',

/* ── 最低気温 ── */
'.wx-temp-min{',
'  font-size:15px;',
'  font-family:"Hiragino Sans","Yu Gothic UI",sans-serif;',
'  font-weight:700;',
'  color:#a0c8ff;',
'  line-height:1.3;',
'}',

/* ── 地域ラベル ── */
'#wx-region-label{',
'  position:absolute;',
'  top:10px;',
'  left:10px;',
'  z-index:10000;',
'  background:rgba(12,18,28,.78);',
'  border:1px solid rgba(255,255,255,.16);',
'  border-radius:999px;',
'  padding:8px 18px;',
'  display:inline-flex;',
'  align-items:center;',
'  gap:10px;',
'  box-shadow:0 4px 20px rgba(0,0,0,.4);',
'  pointer-events:none;',
'}',
'#wx-region-label .label-main{',
'  display:flex;',
'  align-items:center;',
'  gap:5px;',
'}',
'#wx-region-label .label-name{',
'  font-size:28px;',
'  font-weight:700;',
'  color:#fff;',
'  font-family:"Hiragino Sans","Yu Gothic UI",sans-serif;',
'  letter-spacing:.04em;',
'}',
'#wx-region-label .label-divider{',
'  width:1px;',
'  height:14px;',
'  background:rgba(255,255,255,.2);',
'}',
'#wx-region-label .label-time-wrap{',
'  display:flex;',
'  align-items:center;',
'  gap:4px;',
'}',
'#wx-region-label .label-time{',
'  font-size:24px;',
'  color:rgba(255,255,255,.5);',
'  font-family:"Hiragino Sans","Yu Gothic UI",sans-serif;',
'}',
].join('\n');
document.head.appendChild(style);

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

/* ── 時刻を毎秒更新 ── */
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
    "北海道":   [43.1811, 142.5037, 7],
    "東北":     [38.8055, 141.2732, 7],
    "関東":     [35.6841, 140.2625, 8],
    "中部":     [35.9202, 137.3181, 8],
    "近畿":     [34.6332, 135.6702, 8],
    "中国/四国":[34.3298, 133.1708, 8],
    "九州":     [32.4773, 130.9131, 8],
    "沖縄本島": [25.2049, 126.5295, 7],
};
var regionKeys = Object.keys(regions);
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
function addPin(lat, lon, name, code, maxT, minT) {
    var maxHtml = (maxT !== null && maxT !== '') ? '<span class="wx-temp-max">' + maxT + '℃</span>' : '';
    var minHtml = (minT !== null && minT !== '') ? '<span class="wx-temp-min">' + minT + '℃</span>' : '';
    var tempsHtml = '<div class="wx-temps">' + maxHtml + minHtml + '</div>';

    var html =
        '<div class="wx-pin">' +
            '<div class="wx-name">' + name + '</div>' +
            '<div class="wx-body">' +
                '<img src="' + wxIconUrl(code) + '" alt="">' +
                tempsHtml +
            '</div>' +
        '</div>';

    var icon = L.divIcon({
        html: html,
        className: '',
        iconSize: [86, 70],
        iconAnchor: [43, 35]
    });

    weatherLayer.addLayer(L.marker([lat, lon], { icon: icon }));
}

/* ============================================================
   ユーティリティ
   ============================================================ */
function getLatLonFromUrl(url) {
    var latMatch = url.match(/lat=([0-9.\-]+)/);
    var lonMatch = url.match(/lon=([0-9.\-]+)/);
    if (!latMatch || !lonMatch) return null;
    return [parseFloat(latMatch[1]), parseFloat(lonMatch[1])];
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
    if (currentRegion === "北海道")   return hokkaidoCities.includes(name);
    if (currentRegion === "東北")     return tohokuCities.includes(name);
    if (currentRegion === "関東")     return kantoCities.includes(name);
    if (currentRegion === "中部")     return chubuCities.includes(name);
    if (currentRegion === "近畿")     return kinkiCities.includes(name);
    if (currentRegion === "中国/四国") return chugokuCities.includes(name) || shikokuCities.includes(name);
    if (currentRegion === "九州")     return kyushuCities.includes(name);
    if (currentRegion === "沖縄本島") return okinawaCities.includes(name);
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
    "会津若松":[37.6253,139.1630],
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
    "南大東":  [25.3142, 130.0452]
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

            var code = weatherEl ? weatherEl.textContent.split(',')[0].trim() : '';
            var maxT = maxtempEl ? maxtempEl.textContent.split(',')[0].trim() : null;
            var minT = mintempEl ? mintempEl.textContent.split(',')[0].trim() : null;

            var url    = pt.getAttribute('url');
            var ptName = pt.getAttribute('name');
            var coord  = fixedCoords[ptName] || getLatLonFromUrl(url);
            if (coord && cityInCurrentRegion(ptName)) {
                addPin(coord[0], coord[1], ptName, code, maxT, minT);
            }
            count++;
        }
    }

    showNote('🌐 ' + count + ' 地点の天気を表示中（Weathernews）');
}

/* ============================================================
   フェッチ
   ============================================================ */
var XML_URL = 'https://weathernews.jp/forecast/xml/all.xml';
var URLS = [
    XML_URL,
    'https://api.allorigins.win/raw?url=' + encodeURIComponent(XML_URL),
    'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(XML_URL),
    'https://thingproxy.freeboard.io/fetch/' + XML_URL,
];

function tryFetch(idx) {
    if(!weatherEnabled) return;
    if (idx >= URLS.length) {
        showNote('⚠ 天気データを取得できませんでした');
        return;
    }
    fetch(URLS[idx], { cache: 'no-cache' })
        .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(function (txt) {
            var xml = new DOMParser().parseFromString(txt, 'application/xml');
            if (xml.querySelector('parsererror')) throw new Error('parse error');
            if (!xml.getElementsByTagName('weathernews').length) throw new Error('unexpected xml');
            parseXML(xml);
        })
        .catch(function (err) {
            console.warn('URL[' + idx + '] failed:', err);
            tryFetch(idx + 1);
        });
}

/* ============================================================
   通知バナー
   ============================================================ */
function showNote(msg) {
    var el = document.getElementById('wx-note');
    if (!el) {
        el = document.createElement('div');
        el.id = 'wx-note';
        el.style.cssText =
            'position:absolute;bottom:36px;left:50%;transform:translateX(-50%);'
            + 'background:rgba(15,15,25,.72);color:#e8e8f0;'
            + 'backdrop-filter:blur(10px) saturate(150%);'
            + '-webkit-backdrop-filter:blur(10px) saturate(150%);'
            + 'border:1px solid rgba(255,255,255,.15);'
            + 'padding:6px 16px;'
            + 'border-radius:10px;font-size:11px;'
            + 'font-family:"Hiragino Sans","Yu Gothic UI",sans-serif;'
            + 'letter-spacing:.04em;'
            + 'z-index:9999;pointer-events:none;transition:opacity .6s;';
        document.getElementById('map').appendChild(el);
    }
    el.style.opacity = '1';
    el.textContent = msg;
    setTimeout(function () { el.style.opacity = '0'; }, 8000);
}
function switchRegionAuto() {

    regionIndex++;

    // ★ 最後（沖縄）の次は雨雲
    if (regionIndex >= regionKeys.length) {

        // 天気 → 雨雲
        switchMap(); // A→B

        // 20秒後 → 警報
        radarTimer = setTimeout(function(){

            switchMap(); // B→C

            // さらに20秒後 → 天気
            radarTimer = setTimeout(function(){

                switchMap(); // C→A

                // 北海道から再開
                regionIndex = 0;
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
    var r = regions[name];
    currentRegion = name;

    var nameEl = document.getElementById('wx-region-name');
    if (nameEl) nameEl.textContent = name + "の天気";

    map.flyTo([r[0], r[1]], r[2], { duration: 0.6 });
    tryFetch(0);
}
/* ============================================================
   起動
   ============================================================ */
   
tryFetch(0);
regionTimer = setInterval(function(){
    if(weatherEnabled){
        switchRegionAuto();
    }
}, 100);
function disableWeather(){

    weatherEnabled = false;

    weatherLayer.clearLayers();

    if(regionTimer){
        clearInterval(regionTimer);
        regionTimer = null;
    }

}
function enableWeather(){

    weatherEnabled = true;

    if(radarTimer){
        clearTimeout(radarTimer);
        radarTimer = null;
    }

    tryFetch(0);

    regionTimer = setInterval(function(){
        if(weatherEnabled){
            switchRegionAuto();
        }
    },8000);

}

var otherLayer = L.layerGroup().addTo(mapB);

var currentMap = "A";

function switchMap(){

    var nameEl = document.getElementById('wx-region-name');

    /* =======================
       A → B (天気 → 雨雲)
       ======================= */
    if(currentMap === "A"){

        disableWeather();

        map.removeLayer(weatherLayer);
        map.addLayer(otherLayer);

        map.flyTo([38.2127,136.8887], 5.8, { duration: 0.6 });

        showNowcast();

        if(nameEl) nameEl.textContent = "雨雲レーダー";

        currentMap = "B";
        return;
    }

if(currentMap === "B"){

    map.removeLayer(otherLayer);

    if(nowcastLayer){
        map.removeLayer(nowcastLayer);
        nowcastLayer = null;
    }

    /* ★ これ追加（沖縄インセットの雨雲削除） */
    if(insetNowcastLayer){
        insetMap.removeLayer(insetNowcastLayer);
        insetNowcastLayer = null;
    }

    map.addLayer(mapC);

    warningFillLayer.clearLayers();
    loadWarningMap();

    if(nameEl) nameEl.textContent = "警報・注意報";

    currentMap = "C";
    return;
}
if(currentMap === "C"){

    map.removeLayer(mapC);

    /* ★ 追加：警報消す */
    warningFillLayer.clearLayers();

    /* ★ 追加：沖縄側も消す */
    if(insetWarningLayer){
        insetMap.removeLayer(insetWarningLayer);
        insetWarningLayer = null;
    }

    map.addLayer(weatherLayer);

    enableWeather();

    if(nameEl) nameEl.textContent = currentRegion + "の天気";

    currentMap = "A";
    return;
}
}

var btn = document.createElement("button");
btn.textContent = "マップ切替";
btn.style.position = "absolute";
btn.style.top = "10px";
btn.style.right = "10px";
btn.style.zIndex = "10000";
btn.onclick = switchMap;
document.getElementById("map").appendChild(btn);
// 雨雲レーダー
var nowcastLayer = null;


function createNowcastLayer(offsetMin){

    var d = new Date();
    d.setMinutes(d.getMinutes() - offsetMin);
    d.setMinutes(Math.floor(d.getMinutes()/5)*5);
    d.setSeconds(0);

    var y = d.getFullYear();
    var M = ('0'+(d.getMonth()+1)).slice(-2);
    var D = ('0'+d.getDate()).slice(-2);
    var h = ('0'+d.getHours()).slice(-2);
    var m = ('0'+d.getMinutes()).slice(-2);

    var t = y+M+D+h+m+"00";

    return L.tileLayer(
        "https://www.jma.go.jp/bosai/jmatile/data/nowc/" +
        t +
        "/none/" +
        t +
        "/surf/hrpns/{z}/{x}/{y}.png",
        { opacity:0.7, zIndex:500 }
    );
}
async function showNowcast(){

    const res = await fetch(
        "https://www.jma.go.jp/bosai/jmatile/data/nowc/targetTimes_N1.json"
    );

    const json = await res.json();

    // 一番上が最新
    const basetime = json[0].basetime;

    const url =
    "https://www.jma.go.jp/bosai/jmatile/data/nowc/" +
    basetime +
    "/none/" +
    basetime +
    "/surf/hrpns/{z}/{x}/{y}.png";

    if(nowcastLayer){
        map.removeLayer(nowcastLayer);
    }

    nowcastLayer = L.tileLayer(url,{
        opacity:0.9,
        zIndex:999
    });

    map.addLayer(nowcastLayer);
}


setInterval(showNowcast, 300000);
/* ============================================================
   右クリックで視点（中心座標 + ズーム）コピー
   ============================================================ */

map.on('contextmenu', function(e){

    // ★ 沖縄ミニ地図の視点取得
    var center = insetMap.getCenter();
    var zoom = insetMap.getZoom();

    var lat = center.lat.toFixed(4);
    var lon = center.lng.toFixed(4);

    var text = lat + ',' + lon + ',' + zoom;

    navigator.clipboard.writeText(text).then(function(){
        showNote('📋 沖縄視点コピー: ' + text);
    });

});
async function showNowcast(){
    const res = await fetch(
        "https://www.jma.go.jp/bosai/jmatile/data/nowc/targetTimes_N1.json"
    );
    const json = await res.json();
    const basetime = json[0].basetime;

    const url =
        "https://www.jma.go.jp/bosai/jmatile/data/nowc/" +
        basetime + "/none/" + basetime +
        "/surf/hrpns/{z}/{x}/{y}.png";

    /* メインマップ */
    if(nowcastLayer){ map.removeLayer(nowcastLayer); }
    nowcastLayer = L.tileLayer(url, { opacity: 0.9, zIndex: 999 });
    map.addLayer(nowcastLayer);

    /* ★ インセットマップにも同じタイルを適用 */
    if(insetNowcastLayer){ insetMap.removeLayer(insetNowcastLayer); }
    insetNowcastLayer = L.tileLayer(url, { opacity: 0.9, zIndex: 999 });
    insetMap.addLayer(insetNowcastLayer);
}

/* ============================================================
   ② 末尾に追加（インセットマップ本体）
   ============================================================ */

var insetContainer = document.createElement('div');
insetContainer.id = 'wx-inset-map';
insetContainer.style.cssText = [
    'position:absolute',
    'bottom:36px',
    'right:10px',
    'width:500px',
    'height:250px',
    'z-index:9000',
    'border-radius:10px',
    'overflow:hidden',
    'background:rgba(12,18,28,.72)',
    'backdrop-filter:blur(10px) saturate(160%)',
    '-webkit-backdrop-filter:blur(10px) saturate(160%)',
    'display:none',
    'clip-path:polygon(150px 0,100% 0,100% 100%,0 100%,0 120px)',
].join(';');
document.getElementById('map').appendChild(insetContainer);
var insetBorder = document.createElement('div');
insetBorder.style.cssText = [
    'position:absolute',
    'top:0',
    'left:0',
    'width:100%',
    'height:100%',
    'pointer-events:none',
    'z-index:20'
].join(';');

insetBorder.innerHTML = `
<svg width="100%" height="100%" viewBox="0 0 500 250" preserveAspectRatio="none">
    <!-- 上辺 -->
    <line x1="150" y1="0" x2="500" y2="0"
          stroke="white" stroke-width="1.5"/>

    <!-- 斜線 -->
    <line x1="0" y1="120" x2="150" y2="0"
          stroke="white" stroke-width="1.5"/>
</svg>
`;

insetContainer.appendChild(insetBorder);
var insetLabel = document.createElement('div');
insetLabel.style.cssText = [
    'position:absolute',
    'top:6px','left:0','right:0',
    'text-align:center',
    'font-size:11px',
    'font-family:"Hiragino Sans","Yu Gothic UI",sans-serif',
    'font-weight:700',
    'color:rgba(255,255,255,.9)',
    'letter-spacing:.06em',
    'z-index:10',
    'pointer-events:none',
    'text-shadow:0 1px 4px rgba(0,0,0,.8)',
    
].join(';');
insetLabel.textContent = '沖縄';
insetContainer.appendChild(insetLabel);

var insetMap = L.map('wx-inset-map', {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: true,
    dragging: true,
    doubleClickZoom: true,
    boxZoom: false,
    keyboard: false,
    tap: false,
    touchZoom: true,
}).setView([27.2963, 127.5618], 5.63);

$.getJSON("saibun.geojson", function(data){
    L.geoJson(data, { style: PolygonLayer_Style_nerv }).addTo(insetMap);
});
$.getJSON("world.geojson", function(data){
    L.geoJson(data, { style: PolygonLayer_Style_world }).addTo(insetMap);
});

var insetNowcastLayer = null;

/* switchMap をラップして表示/非表示 */
var _origSwitchMap = switchMap;
switchMap = function(){
    _origSwitchMap();

    if(currentMap === "B" || currentMap === "C"){
        insetContainer.style.display = 'block';
        setTimeout(function(){ insetMap.invalidateSize(); }, 100);
    }else{
        insetContainer.style.display = 'none';
    }
};
var insetContainer3 = document.createElement('div');
insetContainer3.id = 'wx-inset-map3';
insetContainer3.style.cssText = [
    'position:absolute',
    'bottom:36px',
    'left:320px',   // ← 位置だけ調整（被らないように）
    'width:300px',
    'height:200px',
    'z-index:9000',
    'border-radius:10px',
    'overflow:hidden',
    'background:rgba(12,18,28,.72)',
    'backdrop-filter:blur(10px) saturate(160%)',
    '-webkit-backdrop-filter:blur(10px) saturate(160%)',
    'display:none'
].join(';');

document.getElementById('map').appendChild(insetContainer3);

var warningFillLayer = L.layerGroup().addTo(mapC);

function warningColor(name){
    if(name.includes("特別警報")) return "#800080";
    if(name.includes("警報")) return "#ff0000";
    if(name.includes("注意報")) return "#ffe600";
    return null;
}
var insetWarningLayer = null;
async function loadWarningMap(){
    warningFillLayer.clearLayers();

    const res = await fetch('https://www.data.jma.go.jp/developer/xml/feed/extra.xml');
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");
    const NS = "http://www.w3.org/2005/Atom";
    const entries = xml.getElementsByTagNameNS(NS, "entry");

    // 地域名 → 最高警戒レベルのwarning名 を集約するMap
    const areaWarnings = {}; // { "地域名": "大雨警報" }

    for(let i = 0; i < entries.length; i++){
        const linkEl = entries[i].getElementsByTagNameNS(NS, "link")[0];
        if(!linkEl) continue;
        const href = linkEl.getAttribute("href");
        if(!href) continue;

        try {
            const r = await fetch(href);
            const t = await r.text();
            const rxm = parser.parseFromString(t, "application/xml");
            const nsBody = "http://xml.kishou.go.jp/jmaxml1/body/meteorology1/";
            const warnings = rxm.getElementsByTagNameNS(nsBody, "Warning");

            for(let w = 0; w < warnings.length; w++){
                const items = warnings[w].getElementsByTagNameNS(nsBody, "Item");
                for(let j = 0; j < items.length; j++){
                    const areaEl = items[j].getElementsByTagNameNS(nsBody, "Area")[0]
                                || items[j].getElementsByTagName("Area")[0];
                    const kindEl = items[j].getElementsByTagNameNS(nsBody, "Kind")[0]
                                || items[j].getElementsByTagName("Kind")[0];
                    if(!areaEl || !kindEl) continue;

                    const areaName   = areaEl.getElementsByTagName("Name")[0]?.textContent || "";
                    const warnName   = kindEl.getElementsByTagName("Name")[0]?.textContent || "";
                    const status     = kindEl.getElementsByTagName("Status")[0]?.textContent || "";

                    if(status.includes("解除")) continue;
                    if(!warnName || status === "発表警報・注意報はなし") continue;

                    // 既存より強い警報なら上書き
                    const existing = areaWarnings[areaName];
                    if(!existing || warningLevel(warnName) > warningLevel(existing)){
                        areaWarnings[areaName] = warnName;
                    }
                }
            }
        } catch(e){
            console.warn("地域XML取得失敗:", href, e);
        }
    }

    console.log("areaWarnings件数:", Object.keys(areaWarnings).length, areaWarnings);

    // GeoJSONのname属性と突合して色付け
    $.getJSON("saibun.geojson", function(geo){
        L.geoJson(geo, {
            style: function(f){
                const name  = f.properties.name || f.properties.NAME || "";
                const nameN = normalizeAreaName(name);

                let wname = null;
                for(const key in areaWarnings){
                    const keyN = normalizeAreaName(key);
                    if(nameN.includes(keyN) || keyN.includes(nameN)){
                        wname = areaWarnings[key];
                        break;
                    }
                }

    const color = warningColor(wname || "");
    if(!color) return { opacity:0, fillOpacity:0 };

    return {
        fillColor:   color,
        fillOpacity: 0.6,
        color:       "#ffffff",
        weight:      0.6,
        opacity:     1
    };
}
        }).addTo(warningFillLayer);
    });
    $.getJSON("saibun.geojson", function(geo){

    /* メイン */
    L.geoJson(geo, { style: styleFunc }).addTo(warningFillLayer);

    /* ★ 沖縄インセットにも適用 */
    if(insetWarningLayer){
        insetMap.removeLayer(insetWarningLayer);
    }

    insetWarningLayer = L.geoJson(geo, { style: styleFunc });
    insetWarningLayer.addTo(insetMap);

});
}

// 警報レベル数値化（比較用）
function warningLevel(name){
    if(!name) return 0;
    if(name.includes("特別警報")) return 3;
    if(name.includes("警報"))     return 2;
    if(name.includes("注意報"))   return 1;
    return 0;
}
function normalizeAreaName(str){
    return str
        .replace(/地方/g,'')
        .replace(/県/g,'')
        .replace(/・/g,'')
        .replace(/\s/g,'');
}