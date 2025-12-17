// --- ファイル名: script_saved_teams.js ---

const BATTLE_JSON = 'battle_data.json';
const BLESSING_JSON = 'blessing_data.json';
const STORAGE_KEY = 'maoryu_teams_v1';

let allBattleData = [];
let allBlessingData = [];

// === 戦闘キャラ用 列設定 ===
const BATTLE_CONFIG = [
    { header: "画像", key: "画像リンク", show: true, type: "image", width: "60px" },
    { header: "称号", key: "称号", show: true, width: "150px" },
    { header: "キャラ名", key: "キャラ名", show: true, width: "150px" },
    { header: "属性", key: "属性", show: true, width: "60px" },
    { header: "レア", key: "レアリティ", show: false, width: "50px" },
    { header: "物理/魔法", key: "物理or魔法", show: true, width: "80px" },
    { header: "戦略タイプ", key: "戦略タイプ", show: true, width: "80px" },
    { header: "勢力", key: "勢力", show: true, width: "200px" },
    { header: "奥義ダメ", key: "奥義ダメ", show: true, width: "100px" },
    { header: "奥義付属", key: "奥義付属", show: true, width: "200px" },
    { header: "奥義対象", key: "単体or全体", show: true, width: "80px" },
    { header: "S1概要", key: "スキル1概要", show: true, width: "200px" },
    { header: "S1詳細", key: "スキル1詳細", show: false, width: "300px" },
    { header: "S1コスト", key: "スキル1コスト", show: true, width: "70px" },
    { header: "S2概要", key: "スキル2概要", show: true, width: "200px" },
    { header: "S2詳細", key: "スキル2詳細", show: false, width: "300px" },
    { header: "S2コスト", key: "スキル2コスト", show: true, width: "70px" },
    { header: "特性", key: "特性", show: true, width: "150px" }
];

// === 加護キャラ用 列設定 ===
const BLESSING_CONFIG = [
    { header: "画像", key: "画像リンク", show: true, type: "image", width: "60px" },
    { header: "称号", key: "称号", show: true, width: "150px" },
    { header: "キャラ名", key: "キャラ名", show: true, width: "150px" },
    { header: "有利属性", key: "有利な属性", show: true, width: "80px" },
    { header: "加護勢力", key: "加護対象勢力", show: true, width: "120px" },
    { header: "レア", key: "レアリティ", show: false, width: "50px" },
    { header: "物理/魔法", key: "物理or魔法", show: true, width: "80px" },
    { header: "導き詳細", key: "加護の導き詳細", show: true, width: "250px" },
    { header: "スキル概要", key: "加護スキル概要", show: true, width: "200px" },
    { header: "スキル詳細", key: "加護スキル詳細", show: false, width: "300px" },
    { header: "コスト上限", key: "スキルコスト上限up", show: false, width: "100px" },
    { header: "ゲージバフ", key: "ゲージバフ", show: false, width: "80px" },
    { header: "支援対象", key: "支援加護対象", show: true, width: "100px" }
];

// === 初期化処理 ===
window.addEventListener('load', async () => {
    await loadAllData();
    setupSavedTeamsSelector();
    setupColumnSelectors();
});

async function loadAllData() {
    try {
        const [resBattle, resBlessing] = await Promise.all([
            fetch(BATTLE_JSON),
            fetch(BLESSING_JSON)
        ]);

        if (resBattle.ok) allBattleData = await resBattle.json();
        if (resBlessing.ok) allBlessingData = await resBlessing.json();

    } catch (e) {
        console.error("データの読み込みに失敗しました", e);
    }
}

// === チーム選択プルダウン生成 ===
function setupSavedTeamsSelector() {
    const savedTeams = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const select = document.getElementById('savedTeamSelect');
    
    select.innerHTML = '<option value="">-- チームを選択してください --</option>';

    const teamNames = Object.keys(savedTeams);
    if (teamNames.length === 0) {
        document.getElementById('teamInfo').textContent = "保存されたチームがありません。";
        return;
    }

    teamNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

// === メイン：選択されたチームを表示 ===
function loadSelectedTeam() {
    const teamName = document.getElementById('savedTeamSelect').value;
    const info = document.getElementById('teamInfo');

    if (!teamName) {
        document.getElementById('battleTableBody').innerHTML = '';
        document.getElementById('blessingTableBody').innerHTML = '';
        info.textContent = '';
        return;
    }

    const savedTeams = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const teamData = savedTeams[teamName];

    if (!teamData) return;

    // データの抽出
    const battleChars = [];
    const blessingChars = [];

    Object.values(teamData).forEach(member => {
        if (member.type === 'battle') {
            battleChars.push(findCharacter(allBattleData, member));
        } else if (member.type === 'protection') {
            blessingChars.push(findCharacter(allBlessingData, member));
        }
    });

    // 各テーブルの描画
    renderGenericTable('battleTable', BATTLE_CONFIG, battleChars);
    renderGenericTable('blessingTable', BLESSING_CONFIG, blessingChars);

    info.textContent = `表示中: ${teamName} （戦闘: ${battleChars.length} / 加護: ${blessingChars.length}）`;
}

// キャラクター詳細検索
function findCharacter(dataset, member) {
    // パス修正済みの画像名で比較
    const memberImg = member.imgSrc ? member.imgSrc.replace(/^image\//, '') : '';
    
    const found = dataset.find(d => {
        const dImg = d['画像リンク'] ? d['画像リンク'].replace(/^image\//, '') : '';
        return d['キャラ名'] === member.name && dImg === memberImg;
    });

    return found || { 
        "キャラ名": member.name, 
        "画像リンク": member.imgSrc, 
        "称号": "データ未取得" 
    };
}

// === 汎用テーブル生成関数 ===
function renderGenericTable(tableId, config, data) {
    const table = document.getElementById(tableId);
    const tbody = table.querySelector('tbody') || table.createTBody();
    tbody.innerHTML = '';

    const visibleColumns = config.filter(col => col.show);

    // ヘッダー(Thead)の更新
    let thead = table.querySelector('thead');
    if (!thead) thead = table.createTHead();
    thead.innerHTML = '';
    const headerRow = thead.insertRow();

    visibleColumns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.header;
        th.style.width = col.width;
        headerRow.appendChild(th);
    });

    if (data.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = visibleColumns.length;
        cell.textContent = "このカテゴリのキャラは編成されていません";
        cell.style.textAlign = "center";
        cell.style.padding = "20px";
        return;
    }

    // データ行の作成
    data.forEach(chara => {
        const row = tbody.insertRow();
        visibleColumns.forEach(col => {
            const cell = row.insertCell();
            let value = chara[col.key];

            if (col.type === "image") {
                const img = document.createElement('img');
                const cleanPath = value ? value.replace(/^image\//, '') : 'placeholder.jpg';
                img.src = 'image/' + cleanPath;
                img.style.width = '45px';
                img.style.height = '45px';
                img.style.display = 'block';
                img.style.margin = 'auto';
                cell.appendChild(img);
            } else if ((col.key === "奥義ダメ" || col.key === "ダメ上昇率") && typeof value === 'number') {
                cell.textContent = `${(value * 100).toFixed(0)}%`;
            } else {
                cell.textContent = value ?? '-';
            }
        });
    });
}

// === 列表示切替UI生成 ===
function setupColumnSelectors() {
    createCheckboxes('battleColumnCheckboxes', BATTLE_CONFIG, 'battle');
    createCheckboxes('blessingColumnCheckboxes', BLESSING_CONFIG, 'blessing');
}

function createCheckboxes(containerId, config, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    config.forEach((col, index) => {
        // 画像と名前は常に表示（任意で変更可）
        const isEssential = (col.key === "画像リンク" || col.key === "キャラ名");

        const wrapper = document.createElement('div');
        wrapper.style.display = 'inline-flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.marginRight = '15px';
        wrapper.style.marginBottom = '8px';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `${type}-col-${index}`;
        checkbox.checked = col.show;
        if (isEssential) checkbox.disabled = true; // 必須列は解除不可に
        
        checkbox.onchange = (e) => {
            config[index].show = e.target.checked;
            loadSelectedTeam(); // リアルタイム反映
        };

        const label = document.createElement('label');
        label.htmlFor = `${type}-col-${index}`;
        label.textContent = col.header;
        label.style.marginLeft = '5px';
        label.style.cursor = 'pointer';

        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    });
}

// ボタン用：全選択
function checkAllColumns(type) {
    const config = (type === 'battle') ? BATTLE_CONFIG : BLESSING_CONFIG;
    config.forEach(col => col.show = true);
    refreshUI(type, config);
}

// ボタン用：全解除（基本項目以外）
function uncheckAllColumns(type) {
    const config = (type === 'battle') ? BATTLE_CONFIG : BLESSING_CONFIG;
    config.forEach(col => {
        if (col.key !== '画像リンク' && col.key !== 'キャラ名' && col.key !== '称号') {
            col.show = false;
        }
    });
    refreshUI(type, config);
}

// UIと表示を一括更新
function refreshUI(type, config) {
    const container = document.getElementById(`${type}ColumnCheckboxes`);
    container.querySelectorAll('input[type="checkbox"]').forEach((cb, idx) => {
        cb.checked = config[idx].show;
    });
    loadSelectedTeam();
}