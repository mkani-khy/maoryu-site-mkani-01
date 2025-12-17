// --- ファイル名: script_organization.js ---

// ファイル名設定
const BATTLE_JSON = 'battle_data.json';
const BLESSING_JSON = 'blessing_data.json';
const STORAGE_KEY = 'maoryu_teams_v1';

let battleData = [];
let blessingData = [];
let currentTab = 'battle'; // 'battle' or 'protection'
let selectedCharaData = null; // スマホ用：タップ選択中のキャラデータ

// === 初期化処理 ===
window.addEventListener('load', async () => {
    await loadAllData();
    renderCharacterPool();
    loadSavedTeams();
    setupSlotClickEvents(); // スマホ用クリックイベント設定
});

// データの読み込み
async function loadAllData() {
    try {
        const resBattle = await fetch(BATTLE_JSON);
        if (resBattle.ok) battleData = await resBattle.json();

        try {
            const resBlessing = await fetch(BLESSING_JSON);
            if (resBlessing.ok) blessingData = await resBlessing.json();
        } catch (e) {
            console.warn('加護データが見つかりません。', e);
        }
    } catch (error) {
        console.error('データの読み込みに失敗しました', error);
        alert('データの読み込みに失敗しました。');
    }
}

// === タブ切り替え ===
function switchTab(type) {
    currentTab = type;
    selectedCharaData = null; // タブを変えたら選択解除
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    const btns = document.querySelectorAll('.tab-btn');
    if(type === 'battle') btns[0].classList.add('active');
    else btns[1].classList.add('active');

    renderCharacterPool();
}

// === キャラクタープールの描画 ===
function renderCharacterPool() {
    const pool = document.getElementById('characterPool');
    const searchVal = document.getElementById('charSearch').value.toLowerCase();
    pool.innerHTML = '';

    const targetData = (currentTab === 'battle') ? battleData : blessingData;
    const charaList = document.createElement('div');
    charaList.className = 'chara-list';

    targetData.forEach((chara, index) => {
        if (searchVal && !chara['キャラ名'].toLowerCase().includes(searchVal)) return;

        const div = document.createElement('div');
        div.className = 'chara-item';
        div.id = `pool-chara-${currentTab}-${index}`;
        div.draggable = true;

        const imgPath = chara['画像リンク'] ? chara['画像リンク'].replace(/^image\//, '') : 'placeholder.jpg';
        const fullData = {
            type: currentTab,
            imgSrc: imgPath,
            name: chara['キャラ名']
        };

        // PC用：ドラッグ開始
        div.ondragstart = (e) => {
            e.dataTransfer.setData("text/plain", JSON.stringify(fullData));
        };

        // スマホ用：タップ選択
        div.onclick = () => {
            if (selectedCharaData && selectedCharaData.id === div.id) {
                div.classList.remove('selected-chara');
                selectedCharaData = null;
            } else {
                document.querySelectorAll('.chara-item').forEach(el => el.classList.remove('selected-chara'));
                div.classList.add('selected-chara');
                selectedCharaData = { ...fullData, id: div.id };
            }
        };

        const img = document.createElement('img');
        img.src = 'image/' + imgPath;
        img.alt = chara['キャラ名'];
        img.title = chara['キャラ名'];

        div.appendChild(img);
        charaList.appendChild(div);
    });
    pool.appendChild(charaList);
}

// === 配置ロジック (共通) ===
function handlePlacement(slot, charaData) {
    // 重複チェック
    const isDuplicate = Array.from(document.querySelectorAll('.drop-slot')).some(s => {
        return s !== slot && s.dataset.imgSrc === charaData.imgSrc;
    });

    if (isDuplicate) {
        alert('既に編成されています。');
        return;
    }

    // タイプチェック
    if (slot.dataset.type !== charaData.type) {
        alert(`${slot.dataset.type === 'battle' ? '戦闘' : '加護'}枠に${charaData.type === 'battle' ? '戦闘' : '加護'}キャラは配置できません。`);
        return;
    }

    setSlotContent(slot, charaData);
}

// スロットに画像をセット
function setSlotContent(slot, charaData) {
    slot.innerHTML = '';
    const img = document.createElement('img');
    img.src = 'image/' + (charaData.imgSrc || 'placeholder.jpg');
    img.alt = charaData.name;
    slot.appendChild(img);

    slot.dataset.charName = charaData.name;
    slot.dataset.imgSrc = charaData.imgSrc;
}

// === イベント設定 ===
function setupSlotClickEvents() {
    document.querySelectorAll('.drop-slot').forEach(slot => {
        // スマホ用タップ配置 
        slot.addEventListener('click', () => {
            if (selectedCharaData) {
                handlePlacement(slot, selectedCharaData);
                // 配置後に選択解除
                document.querySelectorAll('.chara-item').forEach(el => el.classList.remove('selected-chara'));
                selectedCharaData = null;
            }
        });
    });
}

function allowDrop(event) {
    event.preventDefault();
}

function drop(event) {
    event.preventDefault();
    const dataText = event.dataTransfer.getData("text/plain");
    if (!dataText) return;
    const charaData = JSON.parse(dataText);
    handlePlacement(event.currentTarget, charaData);
}

// === 保存・読み込み (LocalStorage) ===
function saveTeam() {
    const teamName = document.getElementById('teamNameInput').value.trim();
    if (!teamName) { alert('チーム名を入力してください。'); return; }

    const formationData = {};
    document.querySelectorAll('.drop-slot').forEach(slot => {
        if (slot.dataset.charName) {
            formationData[slot.id] = {
                name: slot.dataset.charName,
                imgSrc: slot.dataset.imgSrc,
                type: slot.dataset.type
            };
        }
    });

    let savedTeams = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    savedTeams[teamName] = formationData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedTeams));

    alert(`チーム「${teamName}」を保存しました！`);
    loadSavedTeams();
}

function loadSavedTeams() {
    const list = document.getElementById('savedList');
    list.innerHTML = '';
    const savedTeams = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    
    if (Object.keys(savedTeams).length === 0) {
        list.innerHTML = '<li style="color:#777; padding:10px;">保存されたチームはありません</li>';
        return;
    }

    Object.keys(savedTeams).forEach(name => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.textContent = `📂 ${name}`;
        a.style.cursor = 'pointer';
        a.onclick = () => loadFormation(name);

        const delBtn = document.createElement('button');
        delBtn.textContent = '削除';
        delBtn.className = 'btn-danger';
        delBtn.style.marginLeft = '10px';
        delBtn.onclick = (e) => { e.stopPropagation(); deleteTeam(name); };

        li.appendChild(a);
        li.appendChild(delBtn);
        list.appendChild(li);
    });
}

function loadFormation(teamName) {
    const savedTeams = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const data = savedTeams[teamName];
    if (!data) return;

    clearFormation();
    Object.keys(data).forEach(id => {
        const slot = document.getElementById(id);
        if (slot) setSlotContent(slot, data[id]);
    });
    document.getElementById('teamNameInput').value = teamName;
}

function deleteTeam(name) {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    let savedTeams = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    delete savedTeams[name];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedTeams));
    loadSavedTeams();
}

function clearFormation() {
    document.querySelectorAll('.drop-slot').forEach(slot => {
        slot.innerHTML = '';
        delete slot.dataset.charName;
        delete slot.dataset.imgSrc;
    });
}

function filterPool() { renderCharacterPool(); }