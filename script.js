/** Horaroのuser名 */
const HORARO_USER = "rtaij";
/** 1ページに表示するゲーム数の上限 */
let LIST_PAGENATION_NUM = 11;
/** eventId未指定時のリダイレクト */
const REDIRECT_QUERY = "?eventId=rtaijw2023";

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/** クエリパラメータ取得 */
const parseParam = () => {
  const queries = location.search.replace("?", "").split("&");
  let eventId = "";
  for (const q of queries) {
    const [key, value] = q.split("=");
    if (key === "eventId") {
      eventId = value;
    }

    if (key === "max" && value.match(/\d+/)) {
      LIST_PAGENATION_NUM = Number(value);
    }
  }
  if (!eventId) {
    alert("eventIdをクエリパラメータに指定してください");
    // window.location.reload = `${window.location}`;
    // throw new Error("query param Error");
    window.location.search = REDIRECT_QUERY;
  }
  return eventId;
}

const getHoraro = async (user, eventId) => {

  // データ取得
  const url = `https://rtain.jp/api/ajax/index.php?url=https://horaro.org/-/api/v1/events/${user}/schedules/${eventId}`;
  const res = await (await fetch(url)).json();
  // const res = await (await fetch("./test/horaro.json")).json();

  // 必要なデータを抽出
  const tmplist = res.data.items.map(item => {
    const [gameName, category, gameConsole, runType, est, runners] = item.data;

    /** @example "2023-08-10T12:00:00+09:00" */
    const scheduled = item.scheduled;
    console.log(runners);

    return {
      gameName: gameName.replace(/\\/g, ""),
      category: category.replace(/\\/g, ""),
      runners: runners.replace(/\\/g, ""),
      scheduled,
    }
  });

  // 日毎に分類
  let list = [];
  /** @type {number[]} 日のリスト。日付更新用トリガーとして記録 */
  const dateList = [];
  let index = -1;
  for (const item of tmplist) {
    const day = new Date(item.scheduled).getDate();
    if (!dateList.includes(day)) {
      dateList.push(day);
      index++;
      list.push([item]);
    } else {
      list[index].push(item);
    }
  }

  return list;
}

/**
 * Trackerからゲーム情報を取得
 * @param {string} eventId 8とか 
 */
const getTracker = async (eventId) => {
  const url = `https://tracker.rtain.jp/search/?type=run&event=${eventId}`;
  // const res = await (await fetch(url)).json();
  const res = await (await fetch("./test/tracker.json")).json();

  // 必要なデータを抽出
  const tmplist = res.map(item => {
    const { name, category, deprecated_runners } = item.fields;

    /** @example "2023-08-10T12:00:00+09:00" */
    const starttime = item.fields.starttime;

    return {
      gameName: name,
      category: category,
      runners: deprecated_runners,
      scheduled: starttime
    }
  });

  /** @type {object[][]} ゲームリスト。日付ごとの２次元配列 */
  let list = [];
  /** @type {Day[]} 日のリスト。日付更新用トリガーとして記録 */
  const dateList = [];
  let index = -1;
  for (const item of tmplist) {
    const day = new Date(item.scheduled).getDate();
    if (!dateList.includes(day)) {
      dateList.push(day);
      index++;
      list.push([item]);
    } else {
      list[index].push(item);
    }
  }

  return list;
}

/** @type {{gameName:string; category:string;runners:string;scheduled:string;}[][]} */
var gameList = [];

const handleChangeDay = (day) => {
  replaceSelectPage();
  draw();
}

const handleChangePage = (page) => {
  draw();
}

/** x日目のプルダウンを生成 */
const insertSelectDays = () => {
  console.log("[insertSelectDays]");
  const days = window.gameList.length;
  const dom = document.getElementById("day");

  let str = "";
  for (let i = 0; i < days; i++) {
    str += `<option value="${i}">${i + 1}日目</option>`
  }

  dom.insertAdjacentHTML("afterbegin", str);
}

/** pageのリスト再生成 */
const replaceSelectPage = () => {
  console.log("[replaceSelectPage]");
  const day = document.getElementById("day").value;
  console.log(`day=${day}`);
  const gameNum = gameList[day].length;
  console.log(`gameNum=${gameNum}`);

  // option要素を全削除
  const dom = document.getElementById("page");
  while (dom.firstChild) {
    dom.removeChild(dom.firstChild);
  }

  // 追加
  let str = "";
  const pageNum = Math.ceil(gameNum / LIST_PAGENATION_NUM);
  console.log(`pageNum=${pageNum}`);
  for (let i = 0; i < pageNum; i++) {
    str += `<option value="${i}">${i + 1}</option>`;
  }
  dom.insertAdjacentHTML("afterbegin", str);
}


const drawString = (ctx, font, textAlign, textBaseline, color, text, x, y) => {
  ctx.font = font;
  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;
  ctx.fillStyle = color;
  // ctx.strokeStyle = "#FFFFFF#";
  ctx.fillText(text, x, y);
}

/**
 * 日付整形
 * @param {string} str 日時の文字列
 * @returns "8/10(木)" みたいな形式
 */
const toDateStr = (str) => {
  const d = new Date(str);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const date = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()]

  return `${month}/${day}(${date})`;
}

/**
 * 
 * @param {string} text テキスト
 * @param {number} maxFontsize 最大のフォントサイズ 
 * @param {number} minFontsize 最小のフォントサイズ 
 * @param {number} maxWidth 最大幅
 * @returns {number}
 */
const calcFontSize = (text, fontFamily, maxFontsize, minFontsize, maxWidth) => {
  /** @type HTMLElement */
  const dom = document.getElementById("calcFont");
  while (dom.firstChild) {
    dom.removeChild(dom.firstChild);
  }
  dom.innerHTML = text;
  dom.style.width = "fit-content";
  dom.style.fontFamily = fontFamily;
  dom.style.fontSize = `${maxFontsize}px`;

  let fontSize = maxFontsize;
  let width = dom.clientWidth;
  // console.log(`maxWidth=${maxWidth} width=${width} fontSize=${fontSize} ${text}`);
  while (width > maxWidth && minFontsize < fontSize) {
    fontSize--;
    dom.style.fontSize = `${fontSize}px`;
    width = dom.clientWidth;
    // console.log(`maxWidth=${maxWidth} width=${width} fontSize=${fontSize}`);
  }

  return fontSize;
}

/** canvas描画 */
const draw = async () => {
  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById("gamelist");
  const dayIndex = Number(document.getElementById("day").value);
  const pageIndex = Number(document.getElementById("page").value);
  const targetGames = gameList[dayIndex].filter((v, i) => {
    const minNum = pageIndex * LIST_PAGENATION_NUM;
    const maxNum = (pageIndex + 1) * LIST_PAGENATION_NUM;
    return minNum <= i && i < maxNum;
  });
  const targetGameLen = targetGames.length;
  const isMultiPage = gameList[dayIndex].length > LIST_PAGENATION_NUM;
  const date = toDateStr(targetGames[0].scheduled)

  const HEADER_HEIGHT = 250;
  const FOOTER_HEIGHT = 50 - 10;
  const WIDTH = 800;
  const height = HEADER_HEIGHT + targetGameLen * (80 + 10) + FOOTER_HEIGHT;

  // canvasのサイズを設定
  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // canvasの背景
  const backgroundImg = await loadImage("./img/gamelist_background.png");
  const pattern = ctx.createPattern(backgroundImg, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, WIDTH, height);

  // ヘッダー
  const hedaerImage = await loadImage("./img/gamelist_head.png");
  ctx.drawImage(hedaerImage, 0, 0);

  // 日付表示
  const TEXT_COLOR = "rgb(37,48,58)";
  // x日目
  if (!isMultiPage) {
    drawString(ctx, `100px ab-kokoro-no3`, "center", "bottom", TEXT_COLOR, Number(dayIndex) + 1, 600, 45 + 94); // ほんとは85だけど下が揃わないので
    drawString(ctx, `40px ab-kokoro-no3`, "left", "bottom", TEXT_COLOR, "日目", 640, 45 + 85);
  } else {
    drawString(ctx, `100px ab-kokoro-no3`, "center", "bottom", TEXT_COLOR, Number(dayIndex) + 1, 580, 45 + 94); // ほんとは85だけど下が揃わないので
    drawString(ctx, `40px ab-kokoro-no3`, "left", "bottom", TEXT_COLOR, `日目-${pageIndex + 1}`, 620, 45 + 85);
  }
  // 日付
  drawString(ctx, `30px ab-kokoro-no3`, "center", "bottom", TEXT_COLOR, date, 650, 150 + 35);

  // ゲームリスト
  for (let i = 0; i < targetGames.length; i++) {
    const game = targetGames[i];
    const category_runner = `${game.category} / Runner: ${game.runners}`;
    const y = 250 + i * 90;
    const center_x = 400;

    // 背景色
    ctx.beginPath()
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(50, y, 700, 80);
    ctx.closePath();

    console.log(`----------------------\n ${game.gameName}`);
    // ゲーム情報
    const title_y = y + 30;
    const fontFamily = "MPLUS1p-Bold";
    let text = game.gameName;
    let size = calcFontSize(text, fontFamily, 30, 10, 700);
    drawString(ctx, `${size}px ${fontFamily}`, "center", "middle", TEXT_COLOR, text, center_x, title_y);

    // カテゴリ、走者
    const runners_y = y + 80 - 18;
    let len = category_runner.length;
    text = category_runner;
    size = calcFontSize(text, fontFamily, 18, 8, 695);
    console.log(`category size=${size}`);
    drawString(ctx, `${size}px ${fontFamily}`, "center", "middle", TEXT_COLOR, category_runner, center_x, runners_y);
  }
}

const init = async () => {
  console.log("init");
  const eventId = parseParam();

  gameList = await getHoraro(HORARO_USER, eventId);
  // gameList = await getTracker(eventId);
  console.log(gameList);
  insertSelectDays();
  replaceSelectPage();

  draw();
  draw();
}

init();